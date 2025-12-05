# 운영 가이드 (EC2 + Docker Compose)

## 1. 인프라 개요

- AWS EC2 t3.small 정도의 퍼블릭 서브넷 인스턴스 1대  
- Docker Compose로 `web`(Next.js) + `server`(NestJS) + `nginx` 컨테이너 실행  
- 도메인 없이 공인 IP 기반으로 시연 (예: `http://54.xx.xx.xx`)

## 2. 필수 설정

| 항목 | 권장 값/예시 | 메모 |
| --- | --- | --- |
| OS | Ubuntu 22.04 LTS | Docker & Compose 설치 |
| Node/PNPM | 컨테이너 내부에서 사용 | 호스트에는 Docker만 있으면 됨 |
| Docker volume | `./data/sqlite:/app/data/sqlite` | SQLite 지속성 확보 |
| 환경 변수 | `.env` (서버/웹 공통) | OpenAI 키 등 Git에 포함 금지 |

### 주요 ENV

```
OPENAI_API_KEY=sk-xxxx
OPENAI_MODEL=gpt-4o-mini
ARTIFACTS_DIR=/app/artifacts/cafe
DATABASE_URL=file:/app/data/sqlite/malro.db
NEXT_PUBLIC_API_BASE_URL=https://malro.cccv.to/api
```

## 3. 네트워크 & 보안

- **보안 그룹**: 80(HTTP) / 443(HTTPS)만 외부에 개방. 내부 컨테이너 포트(3000, 4000)는 `docker network` 안에서만 사용.
- **CORS**: nginx에서 `/api/*` → Nest, 나머지 → Next 로 라우팅하여 단일 Origin(`http://<PUBLIC_IP>`)으로 노출하면 브라우저 CORS 문제 없음.  
  만약 직접 포트 접근을 허용한다면 `app.enableCors({ origin: 'http://<PUBLIC_IP>' })` 필요.
- **HTTPS/STT 주의**: 브라우저의 Web Speech API는 HTTPS 또는 localhost에서만 동작. 도메인 없이 IP만 사용할 경우 마이크 권한이 막힐 수 있으므로,  
  - 가능한 경우 무료 도메인 + Let’s Encrypt로 TLS 적용  
  - 최소한 self-signed 인증서를 사용해 `https://<PUBLIC_IP>` 로 접근  
  - 그렇지 않으면 STT 기능은 동작하지 않고 텍스트 입력으로만 시연해야 함.

## 4. Docker Compose 예시 (개략)

```yaml
services:
  server:
    build: ./packages/server
    env_file: .env
    environment:
      - DATABASE_URL=file:/app/data/sqlite/malro.db
    volumes:
      - ./data/sqlite:/app/data/sqlite
      - ./artifacts:/app/artifacts:ro
    command: pnpm start
  web:
    build: ./packages/web
    env_file: .env
    environment:
      - NEXT_PUBLIC_API_BASE_URL=http://nginx/api
    command: pnpm start
  nginx:
    image: nginx:alpine
    volumes:
      - ./infra/nginx.conf:/etc/nginx/nginx.conf:ro
    ports:
      - "80:80"
      # - "443:443" (TLS 적용 시)
    depends_on:
      - web
      - server
```

## 5. nginx 라우팅 샘플

```nginx
server {
  listen 80;
  server_name _;

  location /api/ {
    proxy_pass http://server:4000/api/;
  }

  location / {
    proxy_pass http://web:3000;
  }
}
```

## 6. 배포 절차 요약

1. EC2 생성 (보안그룹: 80/443 허용, SSH 허용 IP 제한)
2. Docker & docker-compose 설치
3. 프로젝트 clone 후 `.env` 작성
4. `docker compose up -d --build`
5. 브라우저에서 `http://<PUBLIC_IP>` 접속해 `/kiosk`, `/admin` 시연

## 7. 운영 체크리스트

- [ ] `pnpm approve-builds` 로 @nestjs/core, unrs-resolver 빌드 승인
- [ ] `DATABASE_URL` 볼륨 경로 확인 (컨테이너 재시작 시 데이터 유지)
- [ ] OpenAI API Key 를 서버 컨테이너에서만 접근 가능하도록 관리
- [ ] HTTPS 적용 여부에 따라 STT 기능 동작 확인 (HTTP만 가능하면 STT 비활성 안내)

## 8. EC2 + Route53 세팅 이후 단계

아래 단계는 EC2 인스턴스 생성, 보안 그룹(80/443 허용) 설정, Route53에서 `malro.cccv.to`가 해당 인스턴스를 바라보도록 세팅한 상태를 전제로 합니다.

1. **프로젝트 가져오기**
   ```bash
   cd /opt
   git clone https://github.com/blockoxyz/malro-app.git
   cd malro-app
   ```
2. **환경 변수 파일 준비**
   ```bash
   cp env.example .env
   ```
   - `.env` 에 OpenAI 키, 모델, `NEXT_PUBLIC_API_BASE_URL=https://malro.cccv.to/api`, 기타 값 입력
   - 서버/웹 컨테이너 모두 동일 `.env` 사용
3. **SSL 인증서 배치**
   - 신뢰 가능한 인증기관(또는 임시 self-signed)에서 `malro.cccv.to`용 인증서를 발급
   - 파일명을 `infra/certs/malro.cccv.to.crt`, `infra/certs/malro.cccv.to.key` 로 저장
   - 필요 시 `scp` 로 서버에 업로드 후 해당 경로로 이동
4. **데이터 디렉터리 준비**
   ```bash
   mkdir -p data/sqlite
   ```
   - 볼륨 마운트로 SQLite 지속성 확보
5. **필수 빌드 승인 (최초 1회)**
   ```bash
   pnpm approve-builds
   ```
6. **Docker Compose 빌드/실행**
   ```bash
   docker compose up -d --build
   ```
   - `server` 컨테이너는 부팅 시 `prisma db push`로 스키마 동기화
7. **동작 확인**
   - `https://malro.cccv.to/kiosk`, `https://malro.cccv.to/admin` 접속
   - STT 권한 팝업 허용 여부 확인 (HTTPS에서만 동작)
   - API 헬스체크: `curl https://malro.cccv.to/api/health`
8. **로그 모니터링**
   ```bash
   docker compose logs -f server
   docker compose logs -f web
   docker compose logs -f nginx
   ```
9. **갱신 작업**
   - 새 커밋 배포 시 `git pull`, `docker compose up -d --build` 재실행
   - 인증서 갱신 시 동일 파일명으로 교체 후 `docker compose restart nginx`



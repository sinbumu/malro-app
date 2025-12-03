````md
# malro-app — 키오스크 자연어 주문 MVP (풀스택 PLAN)

## 1. 프로젝트 개요

- **목표**
  - `malro-data` 프로젝트에서 생성한 JSON 아티팩트  
    (`menu.json`, `aliases.json`, `few_shots.jsonl`, `artifact_manifest.json` 등)를 기반으로
  - 사용자가 자연어로 “말로 주문”하면,
    - AI가 메뉴/옵션을 이해해서 **구조화된 주문 JSON(ORDER_DRAFT)** 으로 만들고
    - 모호한 부분은 **짧게 되묻는(ASK) 대화형 흐름**을 통해 보완한 뒤
    - 최종 주문을 확정하고 SQLite DB에 저장,
  - 이를 **키오스크 웹 화면(패드/노트북)** + **어드민 웹 화면**으로 시연할 수 있는 MVP 풀스택 애플리케이션을 구현한다.

- **철학**
  1. 서버는 오직 `malro-data`가 만들어 준 **JSON 아티팩트**만 사용한다 (YAML/원본 CSV는 빌드 전용).
  2. LLM은 “모든 걸 아는 AI”가 아니라,  
     **메뉴/별칭/슬롯이 이미 정리된 컨텍스트 안에서만** 추론하도록 제한한다.
  3. 고도화(추천, 다국어, 복수 도메인 등)는 후순위.  
     이번 스코프에서는 “자연어 → ASK/주문 JSON → UI 시연” 흐름이 부드럽게 도는 것을 목표로 한다.

---

## 2. 요구사항 (요약)

### 기능 요구사항

1. **자연어 주문 파싱**
   - 입력: 자유로운 한국어 텍스트 (나중에 음성 → 텍스트 포함)
   - 출력:
     - `ASK`: 부족한 슬롯(온도, 사이즈, 수량 등)에 대해 짧은 질문을 생성
     - `ORDER_DRAFT`: 메뉴/옵션/수량/포장여부 등이 모두 채워진 초안 주문 JSON
2. **주문 확정 및 저장**
   - 사용자가 ORDER_DRAFT를 확인 후 **확정**하면
   - SQLite DB에 주문/항목/옵션 정보 저장.
3. **키오스크 웹 화면**
   - `/kiosk` 경로에서 자연어 입력 + 마이크 버튼 + 대화 로그 + 주문 요약/확인 UI 제공.
4. **어드민 웹 화면**
   - `/admin` 경로에서 주문 목록, 상태(진행/준비완료/완료 등) 확인 및 변경.
   - 실시간 반영을 위해 SSE 또는 폴링 기반 갱신.
5. **아티팩트 버전 추적**
   - 모든 주문/LLM 호출에 대해 `artifact_manifest` 의 버전/해시를 함께 기록하여  
     “어느 시점 메뉴/별칭 정의로 주문이 생성되었는지” 재현 가능하도록 한다.

### 비기능 요구사항

- **단일 인스턴스 + Docker Compose** 로 돌아갈 수 있을 것
- 로컬 개발(Hot reload) + 간단한 배포(도커 빌드 후 `docker compose up`)
- LLM 호출은 **OpenAI API** 사용 (키는 서버에서만 보관)
- 과제/시연용이라 **트래픽·성능 튜닝은 최소한**으로 유지

---

## 3. 전체 아키텍처

- **언어/런타임**
  - Node.js 20+
  - TypeScript (백엔드/프론트/공통 타입 공유)

- **모노레포 구조 (pnpm 기반)**
  - `packages/server` : NestJS 기반 API 서버
  - `packages/web` : Next.js 기반 웹 앱 ( `/kiosk`, `/admin` 통합 )
  - `artifacts/cafe` : `malro-data`에서 가져온 JSON 아티팩트
  - `data/sqlite` : SQLite DB 파일 저장 디렉터리

- **백엔드**
  - NestJS (Express 또는 Fastify 어댑터)
  - OpenAI Node SDK 로 LLM 호출
  - Prisma + SQLite

- **프론트엔드**
  - Next.js (App Router, React 18, TypeScript)
  - Tailwind CSS (+ 필요시 shadcn/ui)
  - TanStack Query(React Query) 로 API 연동

- **음성(STT)**
  - 1단계: 브라우저 **Web Speech API** (Chrome `webkitSpeechRecognition`) 사용
  - 나중에 필요 시 Whisper API / Clova / Kakao / Google STT 등으로 교체 가능하도록 인터페이스 분리

---

## 4. 디렉터리 구조 (초안)

```txt
malro-app/
  PLAN.md
  artifacts/
    cafe/
      menu.json
      aliases.json
      few_shots.jsonl
      evalset.jsonl
      artifact_manifest.json
  data/
    sqlite/
      (malro.db 등)
  packages/
    server/
      src/
      prisma/
      package.json
    web/
      app/
        kiosk/
        admin/
      components/
      package.json
  docker-compose.yml
  pnpm-workspace.yaml
  package.json
  .env (로컬 개발용)
````

---

## 5. 백엔드(API 서버) 설계 요약

### 주요 역할

1. **아티팩트 로더/Preflight**

   * 서버 부팅 시 `ARTIFACTS_DIR`에서 JSON을 읽어 메모리에 로드:

     * `menu.json`, `aliases.json`, `few_shots.jsonl`, `evalset.jsonl`, `artifact_manifest.json`
   * 슬롯/enum 규칙 및 메뉴 제약과 일치하는지 검증
   * 실패 시 서버 기동 중단 (Preflight 실패)

2. **LLM 파이프라인**

   * 입력 텍스트에 대해:

     * 정규화/토큰화
     * `aliases`/키워드 기반으로 SKU/옵션 후보 리스트 생성 (Top-K)
     * 관련 few-shots (Top-N) 추출
     * System Prompt + Context Slice 구성 후 OpenAI API 호출
   * 결과 JSON을 **Zod/JSON Schema** 로 검증 후:

     * 슬롯이 비었거나 메뉴 제약 위반 시 → ASK 구조 생성
     * 모두 유효하면 → ORDER_DRAFT 구조 생성

3. **주문 저장/조회**

   * ORDER_DRAFT 확정 → SQLite에 주문/항목/옵션 레코드 저장
   * 어드민에서 조회할 수 있도록 주문 목록 API 제공
   * 상태 변경 API 제공 (예: PREPARING, READY, DONE)

### 예정 API 엔드포인트 (초안)

* `GET /health` : 서버 헬스체크
* `GET /artifacts` : 도메인/버전/해시/카운트 등 아티팩트 정보
* `GET /menu` : 메뉴 JSON 노출
* `POST /nl/parse`

  * 입력: `inputText`, `sessionId(optional)`
  * 응답: `type: "ASK" | "ORDER_DRAFT"`, `data: { ... }`
* `POST /order/confirm`

  * ORDER_DRAFT를 확정하고 DB에 저장
  * 응답: 주문 ID/상태
* `GET /orders`

  * 어드민에서 최근 주문 목록 조회
* `PATCH /orders/:id/status`

  * 주문 상태 변경
* `GET /events` (SSE)

  * 신규 주문/상태 변경을 스트리밍으로 전달 (어드민 화면 실시간 반영용)

DB 스키마는 `Prisma schema` 기반으로 `Order`, `OrderItem`, `Session`, `Message` 등을 정의한다.

---

## 6. 프론트 설계 요약

### 공통

* **Next.js (App Router)**
* 글로벌 레이아웃에서 간단한 헤더/푸터/테마 설정
* Tailwind CSS 로 빠른 스타일링
* React Query 로 서버 API 연동

### /kiosk 페이지

* 요소:

  * 대화 로그 뷰(채팅 버블 형태)
  * 자연어 입력 텍스트박스 + “보내기” 버튼
  * 마이크 버튼(STT 시작/정지)
  * ORDER_DRAFT가 생성되면 주문 요약 카드 + “주문 확정” 버튼
* 상태:

  * `sessionId`, `messages`, `currentInput`, `isLoading`, `sttStatus`
* 상호작용:

  * 텍스트 또는 음성(STT 결과)을 `/nl/parse` 에 보내고 응답에 따라

    * ASK → 질문 UI 표시 및 다음 입력 유도
    * ORDER_DRAFT → 요약/확인 UI

### /admin 페이지

* 요소:

  * 주문 목록 테이블 (ID, 시간, 요약, 상태)
  * 상태 변경 버튼/셀렉트
* 데이터:

  * 초기 로드 시 `/orders` 가져오기
  * `/events` SSE 를 구독하여 새 주문/변경을 실시간 반영
* MVP에서는 인증 없이 단순 접근(과제 시연용)

---

## 7. 인프라/배포 계획

### 로컬 개발

* `pnpm install`
* 백엔드: `pnpm --filter server dev`
* 프론트: `pnpm --filter web dev`
* SQLite는 파일 기반이라 별도 DB 컨테이너 불필요

### Docker Compose

* `services.api`

  * NestJS 서버
  * 볼륨: `./artifacts/cafe -> /app/artifacts/cafe:ro`, `./data/sqlite -> /app/var`
* `services.web`

  * Next.js 앱
  * `NEXT_PUBLIC_API_BASE_URL=http://api:4000`

---

## 8. 개발 단계 (마일스톤)

1. **프로젝트 스캐폴딩**

   * pnpm 모노레포 구성
   * NestJS + Next.js 기본 템플릿 생성
2. **아티팩트 로더 & Preflight**

   * `menu.json`/`aliases.json`/`artifact_manifest.json` 로드 및 검증
3. **/nl/parse MVP**

   * 단일 아이템/단순 옵션 기준으로 LLM 파이프라인 구현
   * Zod/Schema 검증 + ASK/ORDER_DRAFT 분기
4. **/kiosk 페이지 기본 UI**

   * 텍스트 입력 + 결과 표시 + “주문 확정” 버튼
5. **주문 저장 & /admin 목록**

   * Prisma + SQLite 도입
   * `/order/confirm`, `/orders`, `/orders/:id/status` 구현
6. **SSE + STT 1차 도입**

   * `/events` SSE → /admin 실시간 반영
   * Web Speech API 기반 STT Provider 적용
7. **버그 수정 & 시연 리허설**

   * 예시 시나리오(2~3개) 기준으로 전체 흐름 점검

```
```

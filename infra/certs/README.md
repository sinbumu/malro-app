`infra/certs` 디렉터리에는 Nginx가 사용할 SSL 인증서를 직접 넣어야 합니다.

## 1. 프로덕션 (malro.cccv.to)
- 상용 인증서 발급처(예: AWS ACM, Let's Encrypt)에서 `malro.cccv.to`용 인증서를 받아 아래 파일명으로 저장하세요.
  - `infra/certs/malro.cccv.to.crt`
  - `infra/certs/malro.cccv.to.key`
- DNS가 `malro.cccv.to` → 배포된 Nginx 인스턴스를 바라보는지 확인합니다.

## 2. 로컬 테스트 (선택 사항)
`/etc/hosts`에 `127.0.0.1 malro.cccv.to`를 추가한 뒤 self-signed 인증서를 생성해 동일한 파일명으로 넣으면 로컬에서도 HTTPS를 흉내 냅니다.

### mkcert (권장)
```bash
brew install mkcert nss  # 최초 1회
mkcert -install
mkcert -key-file infra/certs/malro.cccv.to.key -cert-file infra/certs/malro.cccv.to.crt malro.cccv.to
```

### OpenSSL (대안)
```bash
mkdir -p infra/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout infra/certs/malro.cccv.to.key \
  -out infra/certs/malro.cccv.to.crt \
  -subj "/CN=malro.cccv.to"
```

로컬에서 self-signed 인증서를 사용할 경우 `https://malro.cccv.to` 접속 시 브라우저 경고를 한 번 허용해야 합니다.


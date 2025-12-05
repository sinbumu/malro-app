`infra/certs` 디렉터리에는 로컬 HTTPS 테스트용 인증서를 직접 생성해 넣어 주세요. 예시는 아래와 같습니다.

### mkcert (권장)
```bash
brew install mkcert nss  # 최초 1회
mkcert -install
mkcert -key-file infra/certs/localhost.key -cert-file infra/certs/localhost.crt localhost
```

### OpenSSL (대안)
```bash
mkdir -p infra/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout infra/certs/localhost.key \
  -out infra/certs/localhost.crt \
  -subj "/CN=localhost"
```

`docker compose up -d --build` 후에는 `https://localhost` 로 접속하면 됩니다. self-signed 인증서 경고는 브라우저에서 한 번 허용해야 합니다.


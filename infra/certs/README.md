`infra/certs` 아래에는 HTTPS 인증서 및 ACME 챌린지 파일을 저장합니다.

```
infra/certs/
├─ letsencrypt/   # certbot이 fullchain/privkey 등을 저장 (gitignore 처리)
└─ www/           # /.well-known/acme-challenge용 webroot
```

## 1. Let's Encrypt (권장)
사전 조건: `malro.cccv.to`가 해당 서버의 공인 IP를 가리키고, 보안 그룹에서 80/443 포트가 열려 있어야 합니다.

1. **초기 발급**
   ```bash
   docker compose run --rm certbot certonly \
     --webroot -w /var/www/certbot \
     --email you@example.com --agree-tos --no-eff-email \
     -d malro.cccv.to
   ```
   - 위 명령이 성공하면 `infra/certs/letsencrypt/live/malro.cccv.to/{fullchain.pem,privkey.pem}`이 생성됩니다.
2. **Nginx 재시작**
   ```bash
   docker compose up -d nginx
   ```
3. **자동 갱신(선택)**
   ```bash
   docker compose --profile certbot up -d certbot-renew
   ```
   - 백그라운드에서 12시간마다 `certbot renew` 실행.
4. **수동 갱신**
   ```bash
   docker compose run --rm certbot renew --webroot -w /var/www/certbot
   docker compose restart nginx
   ```

## 2. 로컬 테스트용 Self-signed (필요 시)
`/etc/hosts`에 `127.0.0.1 malro.cccv.to`를 추가한 뒤 아래 방법 중 하나로 인증서를 만든 후 `infra/certs/letsencrypt/live/malro.cccv.to/` 경로에 배치하세요.

### mkcert
```bash
brew install mkcert nss
mkcert -install
mkdir -p infra/certs/letsencrypt/live/malro.cccv.to
mkcert -cert-file infra/certs/letsencrypt/live/malro.cccv.to/fullchain.pem \
       -key-file infra/certs/letsencrypt/live/malro.cccv.to/privkey.pem \
       malro.cccv.to
cp infra/certs/letsencrypt/live/malro.cccv.to/fullchain.pem \
   infra/certs/letsencrypt/live/malro.cccv.to/chain.pem
```

### OpenSSL
```bash
mkdir -p infra/certs/letsencrypt/live/malro.cccv.to
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout infra/certs/letsencrypt/live/malro.cccv.to/privkey.pem \
  -out infra/certs/letsencrypt/live/malro.cccv.to/fullchain.pem \
  -subj "/CN=malro.cccv.to"
cp infra/certs/letsencrypt/live/malro.cccv.to/fullchain.pem \
   infra/certs/letsencrypt/live/malro.cccv.to/chain.pem
```

Self-signed 인증서 사용 시 브라우저 경고를 한 번 허용해야 합니다.


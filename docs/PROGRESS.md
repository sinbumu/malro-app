
# 진행 현황 (2025-12-04 기준)

## 완료

- **모노레포 스캐폴딩**: `pnpm` 기반으로 루트/서버/웹 패키지 초기화, 공용 스크립트와 `.gitignore` 정리.
- **NestJS 서버 베이스**: `@nestjs/config` 적용, `AppModule`/`AppController` 구성, `GET /health`, `GET /artifacts` 기본 엔드포인트 제공.
- **아티팩트 Preflight**: 서버 기동 시 `menu.json`, `aliases.json`, `few_shots.jsonl`, `evalset.jsonl`, `artifact_manifest.json`을 Zod 스키마로 검증하고 카운트 불일치 시 부팅 차단.
- **Next.js 앱 기본 UI**: `/kiosk`, `/admin` 페이지 골격과 전역 레이아웃/스타일 구축, Tailwind/React Query 등 핵심 의존성 설치.
- **BoltPrompt 기반 UX 완성**: `/kiosk` 채팅/마이크 흐름, `/admin` 주문 테이블을 모의 API/STT 로직과 연결해 추후 백엔드 교체만으로 기능 확장 가능하도록 구성.
- **/nl/parse MVP**: Artifact 기반의 간단한 룰 엔진으로 메뉴/수량/온도 추출, 부족 슬롯에 대한 ASK 응답 포함.
- **Prisma + SQLite + 주문 API**: `prisma/schema.prisma` 정의, SQLite `db push`, `POST /order/confirm` 및 `GET /order/recent`/`PATCH /order/:id/status` 구현.

## 진행 중

- `/admin` 실시간 갱신(SSE) 및 `/orders` API 연동 전략 수립

## 다음 단계

1. `/kiosk` 프런트에서 실제 Nest `/nl/parse` API 연동 및 sessionId 지속화
2. `/order/confirm` 백엔드 → `/admin` 목록 API 를 React Query 로 연결
3. SSE 엔드포인트(`/events`) 설계 및 Admin 실시간 갱신 구현
4. Prisma 모델 확장(Session, Message) + STT(Web Speech API) 실장
5. OpenAI 기반 LLM 파이프라인 고도화 (few-shot 선택, 검증기, 재시도 정책)

## 블로킹 이슈 없음

- 로컬 `pnpm approve-builds` 실행 필요 (@nestjs/core, unrs-resolver) → CI 도입 전 처리 예정


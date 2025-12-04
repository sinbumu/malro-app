
# 진행 현황 (2025-12-04 기준)

## 완료

- **모노레포 스캐폴딩**: `pnpm` 기반으로 루트/서버/웹 패키지 초기화, 공용 스크립트와 `.gitignore` 정리.
- **NestJS 서버 베이스**: `@nestjs/config` 적용, `AppModule`/`AppController` 구성, `GET /health`, `GET /artifacts` 기본 엔드포인트 제공.
- **아티팩트 Preflight**: 서버 기동 시 `menu.json`, `aliases.json`, `few_shots.jsonl`, `evalset.jsonl`, `artifact_manifest.json`을 Zod 스키마로 검증하고 카운트 불일치 시 부팅 차단.
- **Next.js 앱 기본 UI**: `/kiosk`, `/admin` 페이지 골격과 전역 레이아웃/스타일 구축, Tailwind/React Query 등 핵심 의존성 설치.

## 진행 중

- `/nl/parse` LLM 파이프라인 MVP 설계 (ASK/ORDER_DRAFT 스키마, few-shot 선택 정책 반영 예정)
- `/kiosk` 세션 관리 및 대화 흐름 연동 (sessionId 생성·저장, 메시지 큐 UI)

## 다음 단계

1. LLM 파이프라인 구현 및 검증기 작성 (`ArtifactService` 활용한 후보 추출, OpenAI 호출 래퍼)
2. `/kiosk` → `/nl/parse` 연동 + ASK/ORDER_DRAFT UI 상태머신 적용
3. Prisma + SQLite 스키마 정의, `/order/confirm` 및 `/orders` API
4. `/admin` 데이터 테이블을 실데이터 + 폴링(or SSE)로 연동
5. Web Speech API 기반 STT 래퍼 도입 및 세션 로그 저장

## 블로킹 이슈 없음

- 로컬 `pnpm approve-builds` 실행 필요 (@nestjs/core, unrs-resolver) → CI 도입 전 처리 예정


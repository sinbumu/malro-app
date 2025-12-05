
# 진행 현황 (2025-12-06 기준)

## 완료

- **모노레포 스캐폴딩**: `pnpm` 기반 루트/서버/웹 패키지 초기화 및 공용 스크립트 정비.
- **NestJS 서버 베이스**: `@nestjs/config`, 기본 `/health`, `/artifacts` 엔드포인트 구성.
- **아티팩트 Preflight**: 메뉴/aliases/few-shot/evalset/manifest를 Zod로 검증, 카운트 mismatch 시 부팅 차단.
- **Next.js 앱 골격**: `/kiosk`, `/admin` UI, Tailwind + React Query 설정.
- **BoltPrompt 기반 UX**: 키오스크 채팅+STT, 어드민 주문 테이블을 mock API와 연결해 이후 백엔드 대체만으로 확장 가능하도록 설계.
- **/nl/parse + 주문 API**: rule-based parser, Prisma + SQLite, `/order/confirm`, `/order/recent`, `/order/:id/status` 제공.
- **STT 실장 (Web Speech API)**: HTTPS 환경에서 실제 음성 입력 가능, 연속 인식/에러 핸들링 포함.
- **OpenAI LLM 연동**: Few-shot, 메뉴 스냅샷, 세션 히스토리를 prompt에 포함해 ASK/ORDER_DRAFT JSON 생성. 실패 시 rule-based fallback.
- **ConversationStore + 멀티턴 맥락**: 세션별 user/assistant 메시지 및 pending slots 관리 → ASK 후속 답변 수용.
- **LLM 전략 문서화**: `docs/Strategy for using LLM.md` 에 가드레일/프롬프트 정책/테스트 포인트 정리.

## 진행 중

- `/admin` 실시간 갱신(SSE) 및 `/orders` API 연동 전략 수립
- OpenAI 파이프라인 고도화(semantic few-shot, 토큰 가드레일) 및 latency 모니터링
- Prisma Session/Message 모델 확장 설계

## 다음 단계

1. `/kiosk` 프런트에 서버세션 로그 연동(주문 이력 표시) 및 pending slot 피드백 UI 강화
2. `/order/confirm` → `/admin` 목록을 React Query/SSE로 연결
3. SSE 엔드포인트(`/events`) 설계 및 Admin 실시간 갱신 구현
4. Prisma Session/Message 모델 + 서버 로깅 통합
5. LLM pipeline: few-shot 검색, 재시도 정책, 토큰/응답 로그 모니터링

## 블로킹 이슈 없음

- 로컬 `pnpm approve-builds` 실행 필요 (@nestjs/core 등) → CI 도입 전 처리 예정

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


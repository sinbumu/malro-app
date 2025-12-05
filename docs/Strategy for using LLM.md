# LLM 연동 전략 요약

## 1. 목적
- **자연어 주문 파이프라인**: 사용자의 음성/텍스트 입력을 ASK 또는 ORDER_DRAFT JSON으로 변환하여 kiosk UX를 완성.
- **AI 비즈니스 MVP**: 시연 환경에서 빠르게 반응하면서도, 확장 가능한 정책/가드레일을 문서화.

## 2. 아키텍처 개요
1. 프런트(`packages/web/app/kiosk/page.tsx`)에서 사용자 입력을 `/api/nl/parse`에 전달.  
2. 서버(`packages/server/src/nl/nl.service.ts`)는 우선 **OpenAI Chat Completions** 호출:
   - `OPENAI_API_KEY`, `OPENAI_MODEL` 필요 (예: `gpt-4o-mini`).  
   - Prompt 구성 요소  
     - System Prompt:  
       - 카페 주문 도메인, ASK/ORDER_DRAFT JSON 스키마, 메뉴 외 생성 금지, 아티팩트 버전 명시.  
     - Few-Shot Examples: `artifacts/.../few_shots.jsonl` → user/assistant 메시지로 삽입.  
     - 대화 이력: `ConversationStore` 가 세션 별 user/assistant 발화를 저장, 최근 8개를 prompt에 포함.  
     - 최신 사용자 발화.
   - 응답 JSON을 `zod`(`LlmResponseSchema`)로 검증 → 성공 시 그대로 반환.
3. LLM 실패 시 **Rule-based fallback**:
   - `ConversationStore` 의 pending state를 활용해 ASK 후속 응답을 이해(예: “작은 걸로”).
   - 메뉴 alias/정규식으로 SKU/옵션 추출 → ASK 또는 ORDER_DRAFT 결정.

## 3. 대화 맥락 관리
- `ConversationStore` (`packages/server/src/nl/conversation.store.ts`)
  - 최근 n(디폴트 12)개의 user/assistant 메시지 저장.
  - ASK로 남은 슬롯(missingSlots) + 채워진 옵션(temp/size)을 pending state로 유지.
  - LLM 히스토리와 rule-based 모두 동일한 메모리를 사용.
- 세션 ID는 프런트 `useSessionId()`에서 생성/재사용. `sessionId` 미전달 시 메모리는 사용하지 않음(즉시 stateless 모드).

## 4. JSON 계약
- **ASK**
  ```jsonc
  { "type": "ASK", "data": { "message": "...", "missingSlots": ["temp"], "optionsHint": ["HOT","ICE"] } }
  ```
- **ORDER_DRAFT**
  ```jsonc
  {
    "type": "ORDER_DRAFT",
    "data": {
      "orderType": "TAKE_OUT",
      "items": [{ "sku": "CAFE_LATTE", "label": "카페라떼", "qty": 1, "options": { "temp": "HOT", "size": "S" } }],
      "notes": null,
      "artifactVersion": "cafe@0.1.0",
      "artifactHash": "..."
    }
  }
  ```
- LLM 응답은 위 스키마로 검증 후 반환. rule-based도 동일 포맷을 보장.

## 5. Prompt & Context 최적화
- **메뉴 압축**: LLM prompt에는 핵심 메뉴 17종만 포함. 추후 “사용자 언급 SKU + 관련군”만 골라 추가 토큰 절감 예정.
- **few-shot 큐레이션**: 현재 예시는 10개만 사용 (대표적인 단일·멀티 주문). 향후 semantic search 기반으로 상황별 상위 N개를 선택하도록 확장 가능.
- **대화 요약 메시지**: 히스토리가 길어지면 ConversationStore가 자체 요약 메시지를 생성해 prompt에 삽입(추후 적용 예정).
- **hash anchoring**: System Prompt에 `artifactVersion/hash`를 명시해 “현재 버전 외 메뉴를 쓰지 말라”는 규칙을 강화.
- **OrderType defaults**: orderType 지시가 없으면 TAKE_OUT으로 간주하도록 Prompt와 파서 양쪽에서 기본값 정의(추가 질문 최소화).

## 6. 가드레일 & 정책
- **메뉴 제약**: prompt에서 메뉴 외 생성 금지 명문화. 결과 JSON은 Zod 스키마 검사 → 알 수 없는 SKU/옵션이 있으면 즉시 reject.
- **토큰/지연 관리**: `OPENAI_TEMPERATURE`, few-shot 개수, menu snapshot 크기를 조절. 추후 `max_tokens`, `timeout` 적용 예정.
- **retry/fallback**: OpenAI 응답 없음/스키마 불일치 → rule-based로 자동 폴백. 필요 시 재시도 1회 추가를 고려.
- **세션 로그**: 현재 인메모리지만, Prisma `Session`/`Message` 모델과 연결하면 장기 통계/재학습 근거 확보 가능.
- **응답 보정**: LLM이 `{"type":"ASK","message":...}`처럼 data 필드를 누락해도 `normalizeLlmPayload()` 가 스키마에 맞게 감싸도록 보정.
- **미묘한 발화 대응**: `ConversationStore` 히스토리는 JSON 자체로 저장되어 LLM에게 “이전 질문 내용”을 정확히 전달.

## 7. 테스트/검증 포인트
- `.env` 에 키/모델 지정 후 `pnpm --filter server build` 로 타입 확인.
- 실제 시연: `https://localhost/kiosk` → 음성 입력 → `/api/nl/parse` 응답이 ASK/ORDER_DRAFT 로 순환하는지 확인.
- 도커 배포: `docker compose up -d --build` (nginx 443 + self-signed cert) → 클라이언트/서버 동일 `.env` 공유.

## 8. 향후 개선 아이디어
- LLM 응답/룰 기반 결과를 모두 DB(Session, Message)에 저장해 재학습/피드백 루프 구축.
- 요청당 토큰/지연 모니터링을 추가하여 운영 시 가드레일 자동화.
- 모델별 A/B 테스트 (예: `gpt-4o-mini` vs `gpt-4o-mini-transcribe`)를 위한 Config 모듈 확장.


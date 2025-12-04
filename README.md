
# malro-app

말로 주문하는 카페 키오스크/어드민 **MVP 풀스택 앱**입니다.  
`malro-data` 프로젝트가 생성한 JSON 아티팩트를 컨텍스트로 활용해, 사용자의 자연어 입력을 **ASK** 혹은 **ORDER_DRAFT** 구조화 데이터로 변환하고, 주문 확정 후 SQLite DB에 저장합니다.

## 핵심 기능

- 자연어 → ASK/ORDER_DRAFT 변환 (`/nl/parse`)
- ASK 응답 기반의 짧은 대화 흐름과 sessionId 유지
- ORDER_DRAFT 확정 및 SQLite 저장 (`/order/confirm`)
- `/kiosk` UI: 대화 로그, 마이크 버튼, 주문 요약
- `/admin` UI: 주문 리스트/상태 변경, 실시간 갱신(SSE or 폴링)
- 아티팩트 버전/해시 추적 (`artifact_manifest`)

## 기술 스택

- **모노레포**: pnpm workspace
- **백엔드**: NestJS 10, TypeScript, `@nestjs/config`, (추후) Prisma + SQLite, OpenAI SDK
- **프론트엔드**: Next.js 14 (App Router), React 18, Tailwind CSS, TanStack Query
- **LLM 컨텍스트**: `artifacts/cafe` 내 `menu.json`, `aliases.json`, `few_shots.jsonl`, `evalset.jsonl`

## 디렉터리 구조

```
malro-app/
├── artifacts/cafe/        # malro-data에서 가져온 JSON 아티팩트
├── data/sqlite/           # 로컬 SQLite 파일 (예: malro.db)
├── packages/
│   ├── server/            # NestJS API 서버
│   └── web/               # Next.js (kiosk & admin)
├── docs/                  # PLAN, PROGRESS 등 문서
├── pnpm-workspace.yaml
└── package.json
```

## 요구 사항

- Node.js 20+
- pnpm 10.22.0+
- OpenAI API Key (서버 환경변수에서만 관리)

## 환경 변수

루트 `.env` 혹은 서버 실행 환경에 아래 값을 설정하세요.

| 변수 | 예시 | 설명 |
| --- | --- | --- |
| `OPENAI_API_KEY` | `sk-...` | OpenAI API 인증 |
| `OPENAI_MODEL` | `gpt-4o-mini` | 사용할 모델명 |
| `ARTIFACTS_DIR` | `./artifacts/cafe` | 메뉴/별칭 JSON 위치 |
| `DATABASE_URL` | `file:./data/sqlite/malro.db` | Prisma SQLite URL |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:4000/api` | 프론트에서 참조할 API 베이스 |

## 설치 & 실행

```bash
pnpm install
pnpm approve-builds   # @nestjs/core, unrs-resolver 등 빌드 스크립트 승인

# 서버 / 웹 동시 개발
pnpm dev:server
pnpm dev:web
```

- 서버: `http://localhost:4000/api/health`, `.../artifacts`
- 웹: `http://localhost:3000` ( /kiosk, /admin 라우트 포함 )

## 개발 워크플로

1. **아티팩트 Preflight**  
   서버 시작 시 `ArtifactService`가 JSON/Zod 검증 → 불일치 시 에러 로그 후 종료.
2. **LLM 파이프라인** (구현 중)  
   - aliases 기반 SKU 후보 생성, few-shot 상위 N개 추출  
   - OpenAI 호출 후 결과를 ASK/ORDER_DRAFT 스키마로 검증  
   - 부족 슬롯 시 ASK, 유효하면 ORDER_DRAFT 반환
3. **주문 확정** (예정)  
   - Prisma 모델: `Order`, `OrderItem`, `Session`, `Message`  
   - `/order/confirm` → SQLite 저장, `artifact_manifest` 버전 동시 기록
4. **프론트**  
   - `/kiosk`: sessionId 관리, 대화 로그, STT 래퍼, 주문 요약  
   - `/admin`: 주문 테이블 + 상태 변경, 5초 폴링 → 이후 SSE 전환 계획

## 스크립트

| 명령어 | 설명 |
| --- | --- |
| `pnpm dev:server` | NestJS 개발 서버 (watch) |
| `pnpm dev:web` | Next.js 개발 서버 |
| `pnpm --filter server lint` | 서버 ESLint |
| `pnpm --filter web lint` | 웹 ESLint |
| `pnpm --filter server build` | 서버 빌드 (tsc + nest) |
| `pnpm --filter web build` | Next.js 빌드 |

## 테스트 & 품질

- 단위 테스트(예정): 아티팩트 로더, LLM 응답 검증기, Prisma 서비스
- 수동 E2E 시나리오: PLAN에 정의된 “아이스 아메리카노 2잔” / “ASK→확정” 플로우
- ESLint / TypeScript strict 모드 적용

## 참고 문서

- `docs/PLAN.md` : 전체 설계 및 마일스톤
- `docs/PROGRESS.md` : 실시간 진행 상황
- `artifacts/cafe/*` : LLM 컨텍스트 JSON

## 라이선스

과제/시연용 내부 프로젝트 (별도 라이선스 미정)



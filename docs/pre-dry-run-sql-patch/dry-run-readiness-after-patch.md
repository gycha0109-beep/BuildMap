# Dry-run Readiness After Patch

| 항목 | 상태 | 비고 |
|---|---|---|
| SQL draft 파일이 draft 경로에만 있는가 | Go | `supabase/migrations_draft` 유지 |
| 정식 migrations 디렉터리로 이동하지 않았는가 | Go | 이동 없음 |
| function execute 권한 patch 반영 | Conditional Go | signature dry-run 필요 |
| secure RPC template patch 반영 | Conditional Go | `SECURITY DEFINER` / `search_path` 검증 필요 |
| feedback_requests consistency patch 반영 | Conditional Go | trigger 문법 검증 필요 |
| Feedback author integrity patch 반영 | Conditional Go | helper/RLS/RPC/trigger 검증 필요 |
| Change Card approval mutation patch 반영 | Conditional Go | OLD/NEW 비교 검증 필요 |
| public-safe view access decision 정리 | Conditional Go | source grant/RLS 실험 필요 |
| Test Case mapping 보강 | Conditional Go | token/view/feedback/change-card 중심 보강 완료, 전체 자동 검증은 아님 |
| dry-run command plan 유지 | Go | 12단계 문서 유지 |
| expected failure catalog 유지 | Go | 12단계 문서 유지 |
| remote DB 적용 금지 | Go | 유지 |

## 종합 판정

**Conditional Go**

14단계 local dry-run 실행 후보로 넘어갈 수 있다. 단, 실행은 사용자가 직접 수행하고 실패 로그를 가져오는 방식으로 진행한다.

# SQL Draft File Map

| 파일명 | 목적 | 의존 파일 | 주요 생성 후보 | 관련 문서 | 검증 필요 |
|---|---|---|---|---|---|
| `00_extensions_and_primitives` | pgcrypto, 공통 helper | 없음 | `pgcrypto`, `set_updated_at` | 9단계 schema primitives, 10단계 syntax review | pgcrypto 사용 가능성 |
| `01_core_schema` | Profile / Project | 00 | `user_profiles`, `builder_profiles`, `projects` | profile/project draft | auth.users FK, slug/token index |
| `02_decision_records_schema` | 판단 기록 | 00, 01 | Problem, Hypothesis, Rough Note, AI Draft, Change Card | change-card draft | circular FK, 상태 constraint |
| `03_feedback_and_links_schema` | Feedback / Link | 00~02 | `feedback_requests`, `feedbacks`, `project_links` | feedback draft | target consistency |
| `04_helpers_and_triggers` | helper/trigger | 00~03 | owner helper, feedback helper, mutation trigger | helper/trigger review | SECURITY DEFINER, trigger syntax |
| `05_rls_policies` | RLS 후보 | 00~04 | RLS policies | rls review | USING/WITH CHECK |
| `06_public_safe_views` | public-safe view | 00~05 | public views | public-safe view review | `security_invoker`, grants |
| `07_link_sharing_rpc` | link sharing RPC | 00~05 | secure RPCs | secure RPC review | token/hash, SECURITY DEFINER |
| `08_grants_and_final_checks` | grants/checks | 00~07 | grant 후보, 검증 주석 | grant/security review | Supabase role grant |

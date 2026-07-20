# Migration Draft Adjustment Plan

## 목적

13단계 dry-run 전에 반영하거나 실험 항목으로 고정할 조정 후보를 정리한다.

## 조정 후보

| 조정 후보 | 관련 SQL draft 파일 | 조정 방식 | dry-run 전 필수 | 관련 테스트 |
|---|---|---|---|---|
| public-safe view 유지/RPC 전환 판단 | `06_public_safe_views`, `07_link_sharing_rpc` | view 실패 시 RPC/API 대안 문서화 | 부분 필수 | PP, LINK |
| helper function EXECUTE revoke/grant 패턴 | `04_helpers`, `08_grants` | 내부 helper 직접 grant 금지 | 필수 | Owner/RLS |
| secure RPC template 보정 | `07_link_sharing_rpc` | `search_path`, grant, 반환 컬럼 제한 확인 | 필수 | LINK, FB |
| `feedback_requests.change_card_id` project consistency | `03_schema`, `04_triggers` | trigger 후보 또는 app validation 주석 보강 | 필수 | FB |
| approved Change Card approval field mutation | `04_triggers` | `approved_at`, `approved_by_builder_profile_id`, `work_status` 제한 후보 추가 | 필수 | CC, OWN |
| Test Case ID 매핑 보강 | 문서 | 누락 케이스 추가 | 필수 | 전체 |
| SQL TODO 주석 보강 | SQL draft | VERIFY BEFORE APPLY 추가 | 부분 필수 | 전체 |
| source table broad anon select 금지 재확인 | `08_grants` | grant 최소화 | 필수 | PP |

## 후순위 조정 후보

- `last_activity_at` 자동 갱신 trigger
- public_slug 실제 생성 정책
- hmac/pepper 기반 token hash
- Feedback 작성자 표시 동의 UX
- API route 기반 공개 응답 조합

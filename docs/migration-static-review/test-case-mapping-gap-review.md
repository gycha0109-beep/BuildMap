# Test Case Mapping Gap Review

## 목적

7.5 Test Case ID → 8단계 Policy ID → 11단계 SQL draft file / policy / helper / view / RPC 연결을 더 촘촘히 확인한다.

## 영역별 매핑 상태

| 영역 | 대표 Test Case ID | 11단계 반영 위치 | 상태 | 누락/보강 |
|---|---|---|---|---|
| Project access | `PRJ-001`, `PRJ-014` | `05_rls_policies`, `06_public_safe_views` | 부분 충분 | source table vs view 검증 필요 |
| Link sharing | `LINK-001`~`LINK-016` | `07_link_sharing_rpc` | 부분 충분 | token 없음/잘못됨/폐기/재발급 세부 매핑 보강 |
| Change Card access | `CC-004`, `CC-007`, `CC-018` | `05_rls_policies`, `06_public_safe_views` | 부분 충분 | approved field mutation 추가 |
| Rough Note / AI Draft | `RNAI-001`~`RNAI-015` | `05_rls_policies` | 충분 | 공개 view 미포함 검증 필요 |
| Problem / Hypothesis | `PH-001`~`PH-014` | `05_rls_policies`, `06_public_safe_views` | 부분 충분 | 민감 Problem/Hypothesis 별도 visibility 보류 |
| Feedback | `FB-001`~`FB-020` | `03_schema`, `05_rls`, `07_rpc`, `06_views` | 부분 충분 | author spoofing, public author display 보강 |
| Public Project Page | `PP-001`~`PP-018` | `06_public_safe_views`, `07_rpc` | 부분 충분 | 컬럼 단위 노출 검증 필요 |
| Owner / Approval | `OWN-001`~`OWN-014` | `05_rls`, `04_triggers` | 부분 충분 | approved_at / approved_by mutation 검증 추가 |

## 반드시 보강할 항목

- `share_token` 없음
- 잘못된 `share_token`
- revoked `share_token`
- 재발급 전 token
- `public_slug`만으로 `link_shared` 접근
- public-safe view 컬럼 단위 노출 차단
- public Feedback 작성자 표시 정책
- approved Change Card mutation trigger
- `approved_at` / `approved_by_builder_profile_id` 수정 차단
- `feedback_requests.change_card_id` project consistency
- Feedback author spoofing
- 비공개 Project의 공개 Change Card 외부 차단
- Rough Note / AI Draft 외부 차단

## 13단계 dry-run 전 보강 필요 여부

**필요**다. 특히 link sharing, public-safe view, feedback integrity, change card mutation은 dry-run 체크리스트에 개별 케이스로 추가해야 한다.

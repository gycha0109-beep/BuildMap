# 12단계 이후 수동 검증 계획

## 목적

11단계 SQL draft를 실제 migration 후보로 승격하기 전 검증할 항목을 정리한다.

## 검증 후보

| 검증 항목 | 목적 | 관련 파일 | 관련 Test Case |
|---|---|---|---|
| local dry-run | SQL 문법과 의존 순서 확인 | 전체 SQL draft | 전체 |
| `supabase db lint` | DB lint 후보 | 전체 SQL draft | 전체 |
| Security Advisor | RLS/grant 위험 확인 | RLS/grants | 전체 |
| Performance Advisor | index/performance 후보 확인 | index 후보 | 공개 조회 |
| public-safe view 컬럼 검증 | 내부 식별자 누락 확인 | `06_public_safe_views` | PP-007, FB-016 |
| link sharing token 검증 | token 없음/오류/폐기/재발급 | `07_link_sharing_rpc` | LINK-* |
| Feedback author spoofing | 작성자 위조 차단 | `04`, `05`, `07` | FB-007~FB-020 |
| approved Change Card mutation | 승인 후 핵심 필드 수정 제한 | `04` | OWN/CC mutation |
| Rough Note / AI Draft 차단 | 내부 기록 공개 차단 | `05`, `06` | RNAI-* |
| Project private 차단 | 비공개 Project 외부 노출 차단 | `05`, `07` | PRJ-002, PRJ-014 |

## 수동 검증 방식 후보

- anon role session
- authenticated user A
- authenticated user B
- Project Owner
- link_shared token caller
- revoked token caller
- public_slug-only caller

## 아직 자동화 테스트 아님

이번 계획은 자동화 테스트 코드가 아니다.  
자동화 테스트는 후속 단계에서 별도로 작성한다.


## 13단계 patch 이후 추가 수동 검증 후보

- helper/RPC/trigger function의 `PUBLIC EXECUTE` revoke 여부 확인
- secure RPC의 `SECURITY DEFINER`, `search_path`, 반환 컬럼 제한 확인
- `feedback_requests.change_card_id`와 `project_id` 불일치 insert/update 차단 확인
- approved Change Card의 `approved_at`, `approved_by_builder_profile_id`, `work_status` 사후 조작 차단 확인
- public-safe view에 내부 식별자, `share_token_hash`, `author_user_profile_id`가 노출되지 않는지 확인
- link_shared Project에서 `public_slug`만으로 접근되지 않는지 확인
- token 없음/잘못됨/revoked/재발급 전 token 시나리오 확인

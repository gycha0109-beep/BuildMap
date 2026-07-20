# P0 Scope

## 포함 범위

1. Project private/public read boundary
2. owner vs non-owner Project read boundary
3. Rough Note external block
4. AI Draft external block
5. public Change Card boundary
6. private Project blocks published Change Card
7. sensitive Change Card external block
8. draft/internal Change Card external block
9. Feedback insert authenticated-only boundary
10. Feedback author spoofing block
11. public-safe view sensitive column block
12. approved Change Card core mutation trigger block

## 제외 범위

- link sharing secure RPC full matrix
- token rotation/revocation full test
- full function permission audit
- full trigger matrix
- P1/P2/P3 scenarios
- performance test
- API integration test
- frontend integration test

## P0 blocker 정의

다음은 모두 P0 blocker다.

- private Project가 anon/non-owner에게 보임
- private Project의 published Change Card가 외부 actor에게 보임
- Rough Note 또는 AI Draft가 외부 actor에게 보임
- sensitive Change Card가 public으로 보임
- Feedback author spoofing이 허용됨
- approved Change Card core mutation이 허용됨
- public-safe view가 내부 식별자 또는 민감 컬럼을 노출함

## PATCH 21 scope clarification

P0 public Project/Change Card/Feedback read는 source table 직접 조회가 아니라 public-safe view 경계를 우선한다. authenticated owner/non-owner boundary 검증은 source table을 사용하되, table privilege는 RLS 평가를 위한 최소 전제로만 둔다.

## Phase22 note

Phase22 보강: P0 public read는 source table이 아니라 owner-executed public-safe view boundary를 검증한다. `VIEW_BOUNDARY_FAIL`은 P0 security blocker다.

## Phase22.5 public_builder_profiles scope

P0 public-safe view scope에 `public_builder_profiles` runtime verification을 명시적으로 포함한다.

검증 범위:

- anon actual SELECT
- public builder fixture 노출
- non-public builder fixture 미노출
- `user_profile_id` / `auth_user_id` 미노출

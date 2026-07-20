# RLS Policy Patch Notes

## USING / WITH CHECK 보강

13단계에서 RLS draft에 다음 주석을 보강했다.

- `SELECT`는 `USING` 조건 중심
- `INSERT`는 `WITH CHECK` 조건 중심
- `UPDATE`는 `USING`과 `WITH CHECK` 모두 검토

## Project Owner update 범위

Project Owner update는 1차에서 유지하지만 너무 넓어지지 않도록 실제 dry-run 후 policy/action split을 검토한다.

## Change Card approve/publish

Change Card approve/publish는 Project Owner 조건을 유지한다. 승인 이후 핵심 필드 제한은 RLS만으로 충분하지 않을 수 있으므로 trigger 후보와 결합한다.

## Feedback insert 조건

Feedback insert는 다음을 동시에 확인해야 한다.

- 공개 Feedback Request
- open 상태
- Project public 접근 가능
- `author_user_profile_id = current_user_profile_id()`

link_shared Feedback insert는 secure RPC에서 token 검증 후 insert하는 후보로 분리한다.

## Rough Note / AI Draft

Rough Note와 AI Draft는 외부 read 정책을 만들지 않는다. Owner-only RLS와 public-safe view 제외 원칙을 유지한다.

## admin/team/org 권한

관리자, 팀, 조직 권한은 1차 RLS draft에서 제외한다.

## SQL draft 반영 위치

- `20260708005000_buildmap_05_rls_policies_draft.sql`

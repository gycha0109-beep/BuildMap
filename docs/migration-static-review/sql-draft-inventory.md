# SQL Draft Inventory

## 목적

11단계에서 생성한 SQL draft 파일을 대상으로 파일 목적, 의존성, 핵심 위험, dry-run 전 보정 필요 여부를 정리한다.

## 파일별 검수 상태

| 파일 | 주요 생성 후보 | 의존 관계 | 핵심 위험 | 현재 판정 |
|---|---|---|---|---|
| `20260708000000_buildmap_00_extensions_and_primitives_draft.sql` | pgcrypto, set_updated_at, primitives | 없음 | pgcrypto 권한, function EXECUTE 기본 권한 | conditional dry-run ready |
| `20260708001000_buildmap_01_core_schema_draft.sql` | user_profiles, builder_profiles, projects | 00 | auth.users FK, public_slug/share_token_hash unique, last_activity_at | conditional dry-run ready |
| `20260708002000_buildmap_02_decision_records_schema_draft.sql` | problem, hypothesis, rough note, AI draft, change card | 00,01 | Change Card 상태/승인 필드 mutation 경계 | needs correction before dry-run |
| `20260708003000_buildmap_03_feedback_and_links_schema_draft.sql` | feedback_requests, feedbacks, project_links | 01,02 | feedback_request project/change_card 정합성, author spoofing | needs correction before dry-run |
| `20260708004000_buildmap_04_helpers_and_triggers_draft.sql` | helper/trigger candidates | 00-03 | PUBLIC EXECUTE, SECURITY DEFINER, approved mutation trigger 범위 | needs correction before dry-run |
| `20260708005000_buildmap_05_rls_policies_draft.sql` | RLS policies | 01-04 | USING/WITH CHECK, source table read, owner scope | conditional dry-run ready |
| `20260708006000_buildmap_06_public_safe_views_draft.sql` | public-safe views | 01-05 | security_invoker/source grant/RLS 충돌 | needs correction before dry-run |
| `20260708007000_buildmap_07_link_sharing_rpc_draft.sql` | secure link sharing RPC | 01-06 | SECURITY DEFINER/search_path/grant/token response | needs correction before dry-run |
| `20260708008000_buildmap_08_grants_and_final_checks_draft.sql` | grants/final checks | 01-07 | source table broad grant 위험, function execute grant | needs correction before dry-run |

## 파일별 상세 검수

### 00 Extensions and Primitives

- 목적: `pgcrypto`, `set_updated_at()` 후보.
- dry-run 전 보정 필요: function `EXECUTE` 권한 기본값 검토.
- dry-run 검증: extension 생성 권한, trigger function 문법.

### 01 Core Schema

- 목적: `user_profiles`, `builder_profiles`, `projects`.
- dry-run 전 보정 필요: `auth.users` FK 환경, `share_token_hash` nullable unique 동작.
- dry-run 검증: `public_slug` unique, `visibility_status` check, `lifecycle_status` check.

### 02 Decision Records Schema

- 목적: 판단 기록 객체.
- dry-run 전 보정 필요: approved Change Card의 승인 필드 조작 제한 보강.
- dry-run 검증: `rough_notes` 변환 후 수정 제한, `ai_structured_drafts` 상태 check.

### 03 Feedback and Links Schema

- 목적: `feedback_requests`, `feedbacks`, `project_links`.
- dry-run 전 보정 필요: `feedback_requests.change_card_id`와 `project_id` 정합성 보장 후보.
- dry-run 검증: `feedbacks.project_id` 미저장, `feedback_request_id` 필수.

### 04 Helpers and Triggers

- 목적: owner helper, read helper, mutation trigger.
- dry-run 전 보정 필요: helper function `EXECUTE` revoke/grant 계획, trigger 범위 확정.
- dry-run 검증: `current_user_profile_id()` null 동작, RLS 순환 의존성.

### 05 RLS Policies

- 목적: owner 중심 RLS.
- dry-run 전 보정 필요: INSERT `WITH CHECK`, UPDATE `USING + WITH CHECK` 재확인.
- dry-run 검증: 비로그인 쓰기 차단, rough note/AI draft 외부 차단.

### 06 Public-safe Views

- 목적: 공개 응답용 view 후보.
- dry-run 전 보정 필요: `security_invoker` 동작과 source table grant/RLS 충돌 검증.
- dry-run 검증: 내부 식별자 미노출, 민감 Change Card 제외.

### 07 Link Sharing RPC

- 목적: 링크 공개 조회/작성 RPC.
- dry-run 전 보정 필요: `SECURITY DEFINER`, `search_path`, grant 제한, token 실패 응답 통일.
- dry-run 검증: token 없음/오류/폐기/재발급, private 전환 후 차단.

### 08 Grants and Final Checks

- 목적: grant 후보와 최종 검증 주석.
- dry-run 전 보정 필요: source table broad anon select 금지 재확인, function execute grant 최소화.
- dry-run 검증: public-safe view grant, RPC execute grant.

## 현재 종합 판정

`needs correction before dry-run` 파일이 존재하므로 13단계는 바로 remote 적용이 아니라 local dry-run 또는 dry-run 전 SQL patch 단계로만 진행해야 한다.

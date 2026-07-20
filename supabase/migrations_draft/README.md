# BuildMap Supabase Migration SQL File Draft

> DRAFT ONLY - DO NOT APPLY DIRECTLY

이 디렉터리는 정식 `supabase/migrations`가 아니다.  
여기 있는 SQL 파일은 실제 적용 전 검토용 초안이며, Supabase CLI로 실행하거나 DB에 적용하면 안 된다.

## 목적

11단계는 9단계 migration draft 문서와 10단계 문법/보안 검수 문서를 바탕으로, 실제 migration 파일 작성 직전의 SQL file draft를 만든다.

## 적용 금지

- Supabase CLI 실행 금지
- DB 연결 금지
- SQL 실행 금지
- Supabase 프로젝트 적용 금지
- `supabase/migrations`로 이동 금지

## 파일 순서

1. `20260708000000_buildmap_00_extensions_and_primitives_draft.sql`
2. `20260708001000_buildmap_01_core_schema_draft.sql`
3. `20260708002000_buildmap_02_decision_records_schema_draft.sql`
4. `20260708003000_buildmap_03_feedback_and_links_schema_draft.sql`
5. `20260708004000_buildmap_04_helpers_and_triggers_draft.sql`
6. `20260708005000_buildmap_05_rls_policies_draft.sql`
7. `20260708006000_buildmap_06_public_safe_views_draft.sql`
8. `20260708007000_buildmap_07_link_sharing_rpc_draft.sql`
9. `20260708008000_buildmap_08_grants_and_final_checks_draft.sql`
10. `20260720000000_buildmap_09_p1_access_integrity_hardening_draft.sql`

## 11단계 핵심 결정

- `share_token` 원문 저장 금지
- `share_token_hash`는 1차 draft에서 `digest(token, 'sha256')` 후보
- 링크 공개는 secure RPC 후보 우선
- 전체 공개 데이터는 public-safe view 후보 우선
- 공개 Feedback view에는 `author_user_profile_id`를 포함하지 않음
- 승인된 Change Card 핵심 본문 수정 제한 trigger 후보 포함
- 관리자/팀/조직/비로그인 쓰기 권한 제외

## 실제 적용 전 필요 검증

- Supabase/PostgreSQL 문법 검증
- Supabase local dry-run
- `supabase db lint` 후보
- Supabase Security/Performance Advisor
- 7.5 Test Case ID 수동 검증

## 12단계 이후에도 적용 금지

12단계 정적 검수 이후에도 이 SQL 파일들은 계속 draft다. 정식 `supabase/migrations`로 이동하거나 Supabase CLI, local DB, remote DB에 적용하지 않는다.

## 13단계 Pre Dry-run SQL Patch 이후에도 적용 금지

13단계에서 일부 SQL draft 주석, helper/RPC/trigger/grant 후보가 보강되었지만 이 디렉터리는 여전히 정식 `supabase/migrations`가 아니다.

- Supabase CLI로 실행하지 않는다.
- `supabase db lint`를 실행하지 않는다.
- local dry-run을 아직 실행하지 않는다.
- remote/staging/production DB에 적용하지 않는다.
- 14단계 dry-run을 진행하더라도 사용자가 직접 실행하고 실패 로그를 다시 가져오는 방식으로만 진행한다.

- 14단계 이후에도 원본 SQL draft는 적용 금지이며 정식 migration으로 승격하지 않았다.

## 15단계 이후에도 원본 SQL draft 적용 금지

15단계는 사용자의 로컬 PC에서 local dry-run을 수행하기 위한 runbook과 로그 수집 양식 작성 단계다. 원본 `supabase/migrations_draft` 파일은 계속 `DRAFT ONLY` 상태이며, 정식 `supabase/migrations`로 승격하지 않는다. dry-run을 위해 필요한 복사는 disposable workspace에서만 수행한다.

## 16단계 이후에도 remote 적용 금지

16단계에서 사용자 local dry-run과 lint가 성공했지만, 원본 SQL draft는 계속 `DRAFT ONLY` 상태다. remote Supabase 적용과 정식 migration 승격은 아직 금지한다.

## 17단계 이후 주의

17단계 이후에도 이 디렉터리의 SQL 파일은 `DRAFT ONLY` 상태다. remote Supabase 적용, production/staging DB 적용, 정식 `supabase/migrations` 영구 승격은 계속 금지한다.

> 18단계 이후에도 remote Supabase 적용과 정식 migration 승격은 금지한다. 이 디렉터리는 계속 DRAFT ONLY 상태다.

## 19단계 이후에도 remote 적용 금지

19단계는 P0 RLS local test script pack 작성 단계다. 원본 `supabase/migrations_draft`는 계속 `DRAFT ONLY` 상태이며 remote Supabase 적용, production/staging DB 적용, 정식 `supabase/migrations` 승격은 금지한다.

## 20단계 first run patch 이후 적용 금지 유지

20단계 patch 이후에도 `supabase/migrations_draft`의 SQL 파일은 계속 `DRAFT ONLY` 상태다. 정식 `supabase/migrations`로 영구 승격하지 않으며, remote Supabase, production, staging DB에는 적용하지 않는다.

## Phase21 이후 주의

Phase21 patch 이후에도 `supabase/migrations_draft`는 DRAFT ONLY 상태다. remote 적용, production/staging 적용, 정식 `supabase/migrations` 영구 승격은 계속 금지한다.

## Phase22 note

Phase22 이후에도 `migrations_draft`는 DRAFT ONLY이며 remote 적용과 정식 migration 승격은 금지한다. public-safe view는 anon source table grant 없이 동작해야 한다.


## Phase24 secure RPC hardening 이후에도 DRAFT ONLY

Phase24에서 link-sharing RPC의 `SECURITY DEFINER search_path`, function EXECUTE boundary, token format, linked Change Card Feedback Request boundary를 보강했다. 이 변경은 Phase25 local-only Full Matrix 검증 후보이며 아직 정식 migration이 아니다.

- remote/staging/production 적용 금지
- 정식 `supabase/migrations` 승격 금지
- 사용자 로컬 disposable DB에서만 임시 복사/reset 후 검증


## Phase27.1 P1 Access & Integrity Hardening

Phase27 첫 사용자 로컬 실행에서 확인된 `UNEXPECTED_ALLOW`와 `TRIGGER_FAIL`을 기존 00~08 파일을 변경하지 않는 additive migration draft 09로 보정한다.

- authenticated profile/project UPDATE를 column whitelist로 축소
- archived Problem/Hypothesis public source read 차단
- creator/author spoofing 차단
- linked Change Card Feedback Request/Feedback 공개조건 일치
- Feedback Request target trigger를 caller RLS와 독립적으로 검증
- approved Change Card core/approval evidence 불변성 강화

이 파일도 DRAFT ONLY이며 local disposable reset 검증 전에는 PASS로 간주하지 않는다. Phase26 protected 18-file baseline에는 아직 포함하지 않는다.

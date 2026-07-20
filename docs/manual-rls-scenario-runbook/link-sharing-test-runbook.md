# Link Sharing Test Runbook


> 주의: 이 문서는 18단계에서 사용자가 local DB에서 검토 후 실행할 후보 절차를 정리한다.  
> 17단계에서는 SQL, RPC, view, trigger, function permission 테스트를 실행하지 않는다.  
> remote Supabase, staging, production DB 적용은 계속 금지한다.


link_shared Project의 token 기반 접근과 feedback write 경계를 검증한다. `public_slug`는 보안 토큰이 아니다.

| Scenario ID | 관련 7.5 Test Case ID | actor | 전제 데이터 | 실행 후보 | 기대 결과 | pass/fail 기준 | 실패 분류 | 관련 SQL draft 파일 | 로그에 남길 내용 |
|---|---|---|---|---|---|---|---|---|---|
| LINK-RUN-001 | LINK-001 | `anon` | link_shared project, token 없음 | `get_link_shared_project_page` 호출 후보 | missing token 차단 | 통일 실패 응답 | EXPECTED_DENY/UNEXPECTED_ALLOW | `07_link_sharing_rpc` | 응답 형태 |
| LINK-RUN-002 | LINK-004 | `anon` | wrong token | secure RPC 호출 후보 | wrong token 차단 | 통일 실패 응답 | EXPECTED_DENY/UNEXPECTED_ALLOW | `07_link_sharing_rpc` | token 값은 마스킹 |
| LINK-RUN-003 | LINK-005 | `anon` | revoked token | secure RPC 호출 후보 | revoked token 차단 | 통일 실패 응답 | EXPECTED_DENY/UNEXPECTED_ALLOW | `07_link_sharing_rpc` | revoked 여부 노출 금지 |
| LINK-RUN-004 | LINK-011 | `anon` | rotation 이전 token | secure RPC 호출 후보 | old token 차단 | 통일 실패 응답 | EXPECTED_DENY/UNEXPECTED_ALLOW | `07_link_sharing_rpc` | old/new token 원문 제외 |
| LINK-RUN-005 | LINK-002 | `anon` 또는 `authenticated` | valid token | `get_link_shared_project_page` 호출 후보 | public-safe JSON 반환 | 내부 id/hash 없음 | PASS/RPC_ERROR | `07_link_sharing_rpc` | 반환 key 목록 |
| LINK-RUN-006 | LINK-006 | `anon` | private project + valid token | secure RPC 호출 후보 | private 전환 후 token 차단 | 통일 실패 응답 | EXPECTED_DENY/UNEXPECTED_ALLOW | `07_link_sharing_rpc` | project 존재 여부 노출 금지 |
| LINK-RUN-007 | LINK-008, LINK-009 | `anon` | link_shared project + public_slug only | public_slug 접근 후보 | public_slug만으로 link_shared 접근 차단 | row 0 또는 실패 | EXPECTED_DENY/UNEXPECTED_ALLOW | `07_link_sharing_rpc` | slug는 마스킹 가능 |
| LINK-RUN-008 | FB-LINK-* | `anon` 또는 `authenticated` | valid token + public feedback request | `get_link_shared_feedback_requests` 후보 | feedback request 목록 반환 | 내부 feedback 미포함 | PASS/RPC_ERROR | `07_link_sharing_rpc` | 반환 field |
| LINK-RUN-009 | FB-LINK-001 | `link_shared_authenticated_user` | valid token + public FR | `create_link_shared_feedback` 후보 | 로그인 + valid token이면 feedback 생성 후보 | insert 성공, author self | PASS/UNEXPECTED_DENY | `07_link_sharing_rpc` | feedback id 마스킹 |
| LINK-RUN-010 | FB-LINK-002 | `anon` | valid token + public FR | `create_link_shared_feedback` 후보 | anon write 차단 | permission denied 또는 통일 실패 | EXPECTED_DENY/UNEXPECTED_ALLOW | `07_link_sharing_rpc` | deny 형태 |

## 실행 원칙

- 모든 SQL/RPC는 local DB 전용 후보로만 다룬다.
- actor 전환 후 `auth.uid()` 기대값을 먼저 확인한다.
- 기대 차단이 허용되면 `UNEXPECTED_ALLOW`로 분류하고 즉시 중단 후보로 본다.
- 로그에는 secret, raw token, DB URL, password를 남기지 않는다.


## internal id/hash 노출 확인

모든 link_shared RPC 응답에서 다음이 없어야 한다.

- `share_token_hash`
- `owner_user_profile_id`
- `author_user_profile_id`
- raw `share_token`
- 내부 auth id

## RPC 호출 후보 패턴

```sql
-- LOCAL ONLY CANDIDATE. DO NOT RUN AGAINST REMOTE DB.
-- LINK-RUN-005 valid token candidate
select public.get_link_shared_project_page(
  '<LINK_SHARED_PROJECT_ID>'::uuid,
  '[REDACTED_TOKEN]'
);

-- LINK-RUN-001 missing token candidate
select public.get_link_shared_project_page(
  '<LINK_SHARED_PROJECT_ID>'::uuid,
  null
);

-- LINK-RUN-002 wrong token candidate
select public.get_link_shared_project_page(
  '<LINK_SHARED_PROJECT_ID>'::uuid,
  'wrong-token-value'
);
```

```sql
-- LOCAL ONLY CANDIDATE.
-- LINK-RUN-009 authenticated + valid token creates feedback candidate
select public.create_link_shared_feedback(
  '<PUBLIC_FEEDBACK_REQUEST_ID>'::uuid,
  '[REDACTED_TOKEN]',
  'local-only feedback body',
  'usability',
  false
);
```

실제 함수 시그니처가 SQL draft와 다르면 `RPC_ERROR` 또는 `GRANT_ERROR`로 기록하고 19단계 patch 후보로 넘긴다.

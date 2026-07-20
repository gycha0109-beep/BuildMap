# Secure RPC Test Runbook


> 주의: 이 문서는 18단계에서 사용자가 local DB에서 검토 후 실행할 후보 절차를 정리한다.  
> 17단계에서는 SQL, RPC, view, trigger, function permission 테스트를 실행하지 않는다.  
> remote Supabase, staging, production DB 적용은 계속 금지한다.


secure RPC는 link sharing과 token 기반 복합 응답을 source table broad public read 없이 처리하기 위한 후보 경계다.

| RPC-RUN ID | RPC | actor | 입력 | 기대 결과 | 실패 결과 | token failure response | internal id/hash 노출 여부 | authenticated 필요 | owner 필요 |
|---|---|---|---|---|---|---|---|---|---|
| RPC-RUN-001 | `rotate_project_share_token` | `project_owner_builder` | `project_id` | 새 token 1회 반환 후보, hash 저장 | non-owner 차단 | 해당 없음 | hash/internal 과다 노출 금지 | yes | yes |
| RPC-RUN-002 | `revoke_project_share_token` | `project_owner_builder` | `project_id` | token revoked 처리 | non-owner 차단 | 해당 없음 | hash/internal 과다 노출 금지 | yes | yes |
| RPC-RUN-003 | `get_link_shared_project_page` | `anon`/`authenticated` | project/slug + token 후보 | valid token이면 public-safe JSON | missing/wrong/revoked/private 차단 | 통일 실패 응답 | hash/internal id 미노출 | no for read 후보 | no |
| RPC-RUN-004 | `get_link_shared_decision_timeline` | `anon`/`authenticated` | project/slug + token 후보 | valid token이면 public-safe timeline | missing/wrong/revoked/private 차단 | 통일 실패 응답 | hash/internal id 미노출 | no for read 후보 | no |
| RPC-RUN-005 | `get_link_shared_feedback_requests` | `anon`/`authenticated` | project/slug + token 후보 | valid token이면 public FR 반환 | missing/wrong/revoked/private 차단 | 통일 실패 응답 | hash/internal id 미노출 | no for read 후보 | no |
| RPC-RUN-006 | `create_link_shared_feedback` | `link_shared_authenticated_user` | valid token + feedback_request + body | feedback 생성 후보 | anon/token invalid 차단 | 통일 실패 응답 | author_user_profile_id 미노출 | yes | no |

## 공통 확인

- `SECURITY DEFINER` 함수는 `search_path`가 고정되어야 한다.
- 반환값은 public-safe `jsonb` 후보여야 한다.
- source row 전체를 반환하지 않는다.
- token 실패 이유를 세분화해서 노출하지 않는다.
- `share_token_hash`, raw token, internal user id, `author_user_profile_id`를 반환하지 않는다.
- `public_slug`만으로 `link_shared` 접근을 허용하지 않는다.

## 실패 분류

- token 없이 접근 허용: `UNEXPECTED_ALLOW`, blocker
- private project에 valid token 접근 허용: `UNEXPECTED_ALLOW`, blocker
- 반환 JSON에 hash/internal id 포함: `RPC_ERROR` 또는 `UNEXPECTED_ALLOW`
- owner 전용 RPC가 non-owner에게 허용: `UNEXPECTED_ALLOW`

## RPC 실행 후보 패턴

```sql
-- LOCAL ONLY CANDIDATE.
select public.rotate_project_share_token('<OWNER_PROJECT_ID>'::uuid);

select public.revoke_project_share_token('<OWNER_PROJECT_ID>'::uuid);

select public.get_link_shared_project_page(
  '<LINK_SHARED_PROJECT_ID>'::uuid,
  '[REDACTED_TOKEN]'
);

select public.get_link_shared_decision_timeline(
  '<LINK_SHARED_PROJECT_ID>'::uuid,
  '[REDACTED_TOKEN]'
);

select public.get_link_shared_feedback_requests(
  '<LINK_SHARED_PROJECT_ID>'::uuid,
  '[REDACTED_TOKEN]'
);
```

응답에는 `share_token_hash`, raw token, internal profile id, `author_user_profile_id`가 없어야 한다.

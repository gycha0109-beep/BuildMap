# Phase24 Pack Overview

## 범위

Phase24는 다음 6개 외부 RPC와 내부 hash helper를 검토한다.

| 구분 | 함수 |
|---|---|
| owner lifecycle | `rotate_project_share_token`, `revoke_project_share_token` |
| token read | `get_link_shared_project_page`, `get_link_shared_decision_timeline`, `get_link_shared_feedback_requests` |
| authenticated write | `create_link_shared_feedback` |
| internal helper | `hash_share_token_draft` |

## Phase25 Full Matrix

- environment/function/grant preflight
- SECURITY DEFINER function owner boundary
- fixed local-only fixture
- missing/wrong/revoked/private/public/archived/cross-project token read matrix
- authenticated project/timeline/feedback-request read surface
- rotation/revocation/old-token/new-token lifecycle
- authenticated feedback creation and author forcing
- function ACL, `SECURITY DEFINER`, `search_path` inspection
- response field and row exposure audit
- expected scenario manifest and exact signal parser

## 제외

- remote Supabase 적용
- API route/frontend integration
- Builder public profile enrichment in link-shared project response
- public-selected Feedback read RPC
- public Project Links collection in link-shared response
- token HMAC/pepper secret management
- expiry timestamp policy
- rate limiting
- full function permission audit outside link-sharing dependencies
- production logging policy

`Full Matrix`는 Phase24에서 확정한 6개 external RPC와 1개 internal hash helper의 현재 contract 전체를 뜻한다. 완성형 Public Project Page의 모든 표시 데이터를 뜻하지 않는다.

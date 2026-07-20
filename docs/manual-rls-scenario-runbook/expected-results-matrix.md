# Expected Results Matrix


> 주의: 이 문서는 18단계에서 사용자가 local DB에서 검토 후 실행할 후보 절차를 정리한다.  
> 17단계에서는 SQL, RPC, view, trigger, function permission 테스트를 실행하지 않는다.  
> remote Supabase, staging, production DB 적용은 계속 금지한다.


| Area | Scenario ID | Actor | Action | Expected Result | Failure Severity | Related SQL Draft | Related Test Case ID | Manual Test Priority |
|---|---|---|---|---|---|---|---|---|
| Project | PRJ-RUN-001 | authenticated_owner | read private project | ALLOW | P1 core policy | 05_rls_policies | PRJ-READ-001 | P1 |
| Project | PRJ-RUN-002 | authenticated_non_owner | read private project | DENY | P0 security blocker | 05_rls_policies | PRJ-READ-002 | P0 |
| Project | PRJ-RUN-005 | anon | read published card under private project | DENY | P0 security blocker | 06_public_safe_views | PRJ-READ-006 | P0 |
| Link | LINK-RUN-001 | anon | link RPC without token | DENY | P0 security blocker | 07_link_sharing_rpc | LINK-001 | P0 |
| Link | LINK-RUN-005 | anon/authenticated | link RPC with valid token | ALLOW public-safe only | P1 core policy | 07_link_sharing_rpc | LINK-002 | P1 |
| Change Card | CC-RUN-003 | anon | read approved/published/normal under public project | ALLOW public-safe only | P1 core policy | 06_public_safe_views | CC-READ-* | P1 |
| Change Card | CC-RUN-004 | anon | read sensitive card | DENY | P0 security blocker | 06_public_safe_views | CC-READ-* | P0 |
| Rough Note | RNAI-RUN-003 | anon | read rough note | DENY | P0 privacy blocker | 05_rls_policies | RNAI-RN-004 | P0 |
| AI Draft | RNAI-RUN-007 | anon | read AI draft | DENY | P0 privacy blocker | 05_rls_policies | RNAI-AI-004 | P0 |
| Feedback | FB-RUN-006 | authenticated_non_owner | insert with spoofed author | DENY | P0 security blocker | 04_helpers_and_triggers | FB-AUTH-* | P0 |
| Feedback | FB-RUN-012 | anon | read public selected feedback view | ALLOW anonymized/context only | P1 core policy | 06_public_safe_views | FB-PUBLIC-* | P1 |
| View | VIEW-RUN-007 | anon | read public_feedbacks columns | NO author_user_profile_id | P0 security blocker | 06_public_safe_views | public-safe view scenarios | P0 |
| RPC | RPC-RUN-006 | link_shared_authenticated_user | create feedback with valid token | ALLOW with current_user_profile_id only | P1 core policy | 07_link_sharing_rpc | FB-LINK-* | P1 |
| Function | FUNC-RUN-005 | anon/authenticated | broad execute grant check | NO broad grant | P0 security blocker | 08_grants | GRANT-MAN-005 | P0 |
| Trigger | TRG-RUN-002 | project_owner_builder | mutate approved content | DENY | P0 integrity blocker | 04_helpers_and_triggers | TRG-* | P0 |
| Trigger | TRG-RUN-009 | project_owner_builder | valid feedback request target | ALLOW | P1 core policy | 04_helpers_and_triggers | FR-CONS-* | P1 |

## 우선순위 정의

| Priority | 의미 |
|---|---|
| P0 security blocker | 허용되면 remote 적용 전 반드시 수정해야 하는 보안/무결성 문제 |
| P1 core policy | BuildMap 1차 권한 모델의 핵심 동작 |
| P2 supporting behavior | 보조 기능이나 public-safe 응답 품질 |
| P3 optional/deferred | 후순위 또는 이번 범위 제외 항목 |

## P0 즉시 blocker 예시

- private Project 외부 노출
- Rough Note / AI Draft 외부 노출
- 민감 Change Card 외부 노출
- token 없이 link_shared RPC 접근 허용
- author spoofing 허용
- public view에 `author_user_profile_id` 또는 `share_token_hash` 노출
- approved Change Card 핵심 본문 수정 허용

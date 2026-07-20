# Actor and Fixture Map

| Actor | request.jwt.claim.sub | 접근해야 하는 row | 접근하면 안 되는 row | 관련 P0 |
|---|---|---|---|---|
| `anon` | 없음 / null | public Project, public-safe view의 public row | private Project, rough note, AI draft, sensitive/internal/draft Change Card | PRJ, RNAI, CC, VIEW |
| `authenticated_owner` | `00000000-0000-0000-0000-000000000101` | owner private/public Project와 내부 기록 | 타인 Project 수정 | PRJ, RNAI, CC, TRG |
| `authenticated_non_owner` | `00000000-0000-0000-0000-000000000102` | public Project 읽기 | owner private Project, owner rough note, owner AI draft, owner Project update | PRJ, RNAI, CC |
| `feedback_author` | `00000000-0000-0000-0000-000000000103` | public Feedback Request에 자기 Feedback 작성 | 다른 author_user_profile_id로 작성 | FB |
| `link_shared_authenticated_user` | `00000000-0000-0000-0000-000000000104` | 20단계 P0에서는 smoke fixture만 유지 | link sharing full matrix는 제외 | 후순위 |

## 기본 method

20단계 P0 script는 Method A를 사용한다.

```sql
select set_config('request.jwt.claim.sub', '<actor-auth-uuid>', true);
```

Method B는 fallback이다.

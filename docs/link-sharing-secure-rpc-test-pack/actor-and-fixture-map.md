# Actor and Fixture Map

## Actors

| actor | auth_user_id | user_profile_id | 용도 |
|---|---|---|---|
| owner | `010...0201` | `110...0201` | rotate/revoke, visibility transition |
| non-owner | `010...0202` | `110...0202` | owner-only denial, valid feedback submit |
| feedback user | `010...0203` | `110...0203` | standard authenticated feedback submit |
| no-profile user | `010...0204` | 없음 | `login_required` defense-in-depth |
| anon | null | 없음 | read RPC, write/owner RPC execute denial |

## Projects

| ID suffix | state | token char | 목적 |
|---|---|---:|---|
| 201 | `link_shared` | `1`×64 | main valid read/write fixture |
| 202 | `private` | `2`×64 | private priority over token |
| 203 | `public` | `3`×64 | public transition disables token RPC |
| 204 | `link_shared`, revoked | `4`×64 | revoked token |
| 205 | `link_shared`, archived | `5`×64 | archived token |
| 206 | `link_shared` | `6`×64 | rotation/revocation transaction tests |

## Main project children

- approved + published + normal card: 노출 대상
- sensitive card: 차단
- draft card: 차단
- internal card: 차단
- Project-level public/open Feedback Request: 노출/작성 대상
- public card-linked request: 노출/작성 대상
- sensitive card-linked request: 차단
- internal request: 차단
- closed request: 차단

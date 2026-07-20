# Actor and Fixture Map

## Actor

| Actor | auth user | user profile | builder profile | 역할 |
|---|---|---|---|---|
| Owner A | `...0301` | `...1301` | `...2301` public | 주요 소유자 |
| Owner B | `...0302` | `...1302` | `...2302` public | 다른 프로젝트 소유자 / non-owner |
| Scout | `...0303` | `...1303` | `...2303` private | 피드백 작성자 / private profile |
| No Profile | `...0304` | 없음 | 없음 | auth context negative control |
| Unbound Profile | `...0305` | `...1305` | 없음 | builder identity reassignment negative control |

실제 UUID 전체 값은 fixture SQL에만 고정하며 외부 secret이 아니다. 모두 local-test 전용이다.

## Project

| ID suffix | Owner | visibility | 상태 |
|---|---|---|---|
| `3301` | A | private | active |
| `3302` | A | public | active |
| `3303` | B | public | active |
| `3304` | A | public | archived |
| `3305` | A | link_shared | active |

## Adversarial fixture

일부 Feedback row는 public view/RLS의 결합 조건을 검증하기 위해 의도적으로 internal request 또는 sensitive linked card에 연결된다. 이 row는 postgres local seed context에서 삽입하되, `request.jwt.claim.sub`를 Scout로 설정해 author-spoofing trigger는 계속 통과시킨다.

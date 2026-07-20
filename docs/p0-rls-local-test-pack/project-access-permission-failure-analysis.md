# Project access permission failure 분석

## 오류

```text
ERROR: permission denied for table projects
```

발생 위치:

```text
scripts/manual-local-rls/phase20_02_project_access_p0.sql
```

## PostgreSQL privilege와 RLS 평가 순서

PostgreSQL에서는 table/view/function 같은 database object privilege와 RLS policy가 별개의 계층이다.
역할에 해당 table의 `SELECT`, `INSERT`, `UPDATE` 등 기본 privilege가 없으면 query는 RLS policy의 row-level 조건을 평가하기 전에 `permission denied`로 차단된다.
따라서 이번 오류는 `POLICY_FAIL`이 아니라 table privilege 또는 access path 문제로 분류한다.

## 왜 POLICY_FAIL이 아닌가

RLS policy 실패라면 보통 다음 중 하나가 관찰되어야 한다.

- `SELECT` 결과가 0 row로 반환된다.
- `UPDATE` affected row가 0으로 반환된다.
- `WITH CHECK` 위반 또는 trigger exception이 발생한다.

이번 오류는 query 자체가 `permission denied for table projects`로 중단되었다.
이는 source table `public.projects`에 대한 object privilege가 없는 actor가 직접 source table을 조회했음을 의미한다.

## access path 분석

기존 BuildMap 보안 결정은 다음을 유지한다.

- anon 공개 읽기는 source table 직접 조회가 아니라 public-safe view를 우선한다.
- `public.projects` source table에는 `owner_builder_profile_id`, `share_token_hash` 등 public response에 직접 노출하면 안 되는 internal column이 있다.
- public-safe view는 공개 가능한 column만 제공해야 한다.

따라서 `PRJ-P0-001`과 `PRJ-P0-002`가 anon actor로 `public.projects`를 직접 조회한 것은 P0 테스트의 access path 불일치다.

## authenticated source table 테스트의 차이

authenticated owner/non-owner 테스트는 실제 source table에서 RLS row boundary를 확인해야 한다.
따라서 authenticated role에는 source table에 대한 최소 `SELECT`/`UPDATE` privilege가 있어야 한다.
이 privilege는 row를 모두 허용하는 권한이 아니라, RLS 평가 지점까지 query가 도달하게 하는 object privilege다.

## 단순 anon source grant를 추가하지 않는 이유

다음 patch는 금지된다.

```sql
grant select on public.projects to anon;
grant select on all tables in schema public to anon;
grant all on all tables in schema public to anon, authenticated;
```

이 방식은 public-safe view 경계를 우회하고 source table의 internal column exposure 위험을 만든다.
특히 `projects.share_token_hash`, 내부 owner 식별자, future internal field가 노출될 수 있다.

## 최종 분류

| 분류 | 판정 |
|---|---|
| `ACCESS_PATH_MISMATCH` | 1차 원인. anon public scenario가 source table을 직접 조회했다. |
| `GRANT_FAIL` | 보조 분류. authenticated source-table RLS test에 필요한 privilege가 누락되면 이 분류를 적용한다. |
| `POLICY_FAIL` | 아님. RLS policy 평가 전 table privilege 단계에서 차단되었다. |

## patch 방향

1. anon public Project read는 `public_project_cards` 또는 `public_project_pages` view를 사용한다.
2. anon private Project block은 public-safe view에 private fixture가 나타나지 않는 것으로 검증한다.
3. anon source `public.projects` 직접 조회는 `EXPECTED_DENY`로 처리한다.
4. authenticated owner/non-owner는 source `public.projects`를 사용하되 최소 privilege + RLS로 검증한다.
5. uncaught `permission denied`는 wrapper에서 `GRANT_FAIL`로 표시한다.
6. public-safe view가 `security_invoker` 때문에 source privilege를 요구하면 broad grant를 추가하지 않고 view execution model 또는 RPC boundary를 별도 patch로 검토한다.

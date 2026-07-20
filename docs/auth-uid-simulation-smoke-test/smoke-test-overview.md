# 18단계 Smoke Test Overview

> 주의: 이 문서는 BuildMap 18단계 auth.uid() actor simulation smoke test 산출물이다.  
> 현재 ChatGPT 샌드박스에서는 Supabase CLI, Docker, psql이 없어 실제 local DB smoke test를 실행하지 못했다.  
> 따라서 결과 문서는 `미실행/No-Go in this environment` 기준으로 작성하며, 사용자의 로컬 PC에서 18단계 SQL 후보를 실행한 로그가 확보되면 19단계 진입 여부를 재판정한다.  
> remote Supabase, staging, production DB에는 어떤 명령도 실행하지 않는다.


## 왜 auth.uid() smoke test가 필요한가

`supabase db reset`과 `supabase db lint --local` 성공은 schema와 기본 lint가 통과했다는 뜻이다. 하지만 RLS behavior는 actor context, role, JWT claim, `auth.uid()` 반환값에 따라 달라진다. 따라서 본격적인 RLS 시나리오 테스트 전에 actor simulation이 실제 local SQL session에서 가능한지 먼저 확인해야 한다.

## db reset/lint 성공과 auth.uid() simulation의 차이

| 항목 | 의미 | RLS behavior 검증 여부 |
|---|---|---|
| `supabase db reset` 성공 | migration SQL이 local DB에 적용됨 | 아님 |
| `supabase db lint --local` 성공 | schema lint에 오류가 없음 | 아님 |
| `auth.uid()` smoke test 성공 | actor별 session claim이 정책 전제와 맞게 동작함 | RLS 본 테스트 선행 조건 |

## 테스트 actor


| Actor | Smoke test UUID | 기대 `auth.uid()` 결과 | 후속 용도 |
|---|---:|---:|---|
| `anon` | 없음 | `null` | 비로그인 read/write 차단 기준 |
| `authenticated_owner` | `00000000-0000-0000-0000-000000000101` | `00000000-0000-0000-0000-000000000101` | Project Owner, Builder 권한 검증 |
| `authenticated_non_owner` | `00000000-0000-0000-0000-000000000102` | `00000000-0000-0000-0000-000000000102` | non-owner deny 검증 |
| `feedback_author` | `00000000-0000-0000-0000-000000000103` | `00000000-0000-0000-0000-000000000103` | Feedback author spoofing 검증 |
| `link_shared_authenticated_user` | `00000000-0000-0000-0000-000000000104` | `00000000-0000-0000-0000-000000000104` | link_shared Feedback 작성 검증 |


## 테스트 method

| Method | 목적 | 채택 기준 |
|---|---|---|
| Method A: `request.jwt.claim.sub` | `auth.uid()`가 단일 sub claim 설정값을 읽는지 확인 | 모든 authenticated actor에서 기대 UUID 반환 |
| Method B: `request.jwt.claims` JSON | `auth.uid()`가 JSON claims의 `sub`를 읽는지 확인 | 모든 authenticated actor에서 기대 UUID 반환 |

## 성공 기준

- `anon` actor에서 `auth.uid()`가 `null`이다.
- `authenticated_owner` actor에서 owner UUID가 반환된다.
- `authenticated_non_owner` actor에서 non-owner UUID가 반환된다.
- `feedback_author` actor에서 feedback author UUID가 반환된다.
- `link_shared_authenticated_user` actor에서 link shared user UUID가 반환된다.
- Method A 또는 Method B 중 후속 RLS 테스트에 사용할 방식이 명확하다.
- 테스트가 local-only 환경에서만 수행되었다.
- secret, token, password, DB URL 원문이 로그에 남지 않았다.

## 실패 기준

- authenticated role에서 `auth.uid()`가 `null`이다.
- actor별 기대 UUID와 다른 값이 반환된다.
- `set local role authenticated` 또는 `set local role anon`이 실패한다.
- `request.jwt.claim.sub`와 `request.jwt.claims` 방식이 모두 실패한다.
- remote 연결이 의심된다.
- secret이 로그에 노출된다.

## 중단 기준

actor simulation이 실패하면 Project access, Feedback author, Change Card owner, link sharing 시나리오 테스트를 진행하지 않는다.

## 19단계 진입 기준

`Go` 또는 `Conditional Go` 판정이 필요하다. 현재 문서 작성 환경에서는 local DB 접속이 불가능하여 `No-Go` 판정이다.

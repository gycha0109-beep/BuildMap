# Go / No-Go After Auth Smoke

> 주의: 이 문서는 BuildMap 18단계 auth.uid() actor simulation smoke test 산출물이다.  
> 현재 ChatGPT 샌드박스에서는 Supabase CLI, Docker, psql이 없어 실제 local DB smoke test를 실행하지 못했다.  
> 따라서 결과 문서는 `미실행/No-Go in this environment` 기준으로 작성하며, 사용자의 로컬 PC에서 18단계 SQL 후보를 실행한 로그가 확보되면 19단계 진입 여부를 재판정한다.  
> remote Supabase, staging, production DB에는 어떤 명령도 실행하지 않는다.


## 판정 값

현재 문서 작성 환경 기준: `No-Go`.

## 판정 근거

| 기준 | 상태 |
|---|---|
| anon actor에서 `auth.uid()` null 확인 | 미실행 |
| authenticated_owner expected UUID 반환 | 미실행 |
| authenticated_non_owner expected UUID 반환 | 미실행 |
| feedback_author expected UUID 반환 | 미실행 |
| link_shared_authenticated_user expected UUID 반환 | 미실행 |
| 채택 method 명확성 | 미정 |
| local-only 확인 | 문서 작성 환경에서는 remote 명령 미실행, local DB 접속도 미실행 |
| secret 노출 없음 | 충족 |

## Go 기준

- anon actor가 `null`을 반환한다.
- 모든 authenticated actor가 expected UUID를 반환한다.
- Method A 또는 Method B 중 채택 방식이 명확하다.
- remote 연결 없이 local-only에서 실행되었다.
- secret 노출이 없다.

## Conditional Go 기준

- Method A와 Method B 중 하나는 실패했지만, 다른 하나가 모든 actor에서 성공한다.
- 19단계에서는 성공한 method만 사용한다.

## No-Go 기준

- authenticated actor의 `auth.uid()`가 `null`이다.
- actor별 UUID가 기대값과 다르다.
- role 전환이 실패한다.
- remote 연결이 의심된다.
- secret이 노출된다.
- 현재처럼 local DB session을 열 수 없어 실행하지 못했다.

## 다음 단계

현재 산출물 기준으로는 19단계 RLS scenario test로 바로 넘어가면 안 된다. 사용자의 로컬 PC에서 auth smoke test 로그를 먼저 가져온 뒤 Go/Conditional Go를 재판정한다.

## 19단계 재분류

이 문서의 최초 `No-Go`는 Codex 실행 환경에 local DB 접속 수단이 없었기 때문이었다. 이후 사용자가 로컬 PC에서 smoke test를 직접 실행했고 Method A/B 모두 actor별 기대 UUID를 반환했다.

- 재분류 판정: `Go`
- 기본 method: `request.jwt.claim.sub`
- fallback method: `request.jwt.claims`
- 상세: `user-local-pass-result.md`, `go-reclassification.md`

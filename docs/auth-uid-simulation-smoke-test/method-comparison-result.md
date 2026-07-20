# Method Comparison Result

> 주의: 이 문서는 BuildMap 18단계 auth.uid() actor simulation smoke test 산출물이다.  
> 현재 ChatGPT 샌드박스에서는 Supabase CLI, Docker, psql이 없어 실제 local DB smoke test를 실행하지 못했다.  
> 따라서 결과 문서는 `미실행/No-Go in this environment` 기준으로 작성하며, 사용자의 로컬 PC에서 18단계 SQL 후보를 실행한 로그가 확보되면 19단계 진입 여부를 재판정한다.  
> remote Supabase, staging, production DB에는 어떤 명령도 실행하지 않는다.


## 비교 대상

| Method | 설명 | 현재 결과 |
|---|---|---|
| Method A | `request.jwt.claim.sub` 단일 claim 설정 | 미실행 |
| Method B | `request.jwt.claims` JSON 설정 | 미실행 |

## Method A 성공 여부

미확인. 현재 환경에서 local DB 접속이 불가능하다.

## Method B 성공 여부

미확인. 현재 환경에서 local DB 접속이 불가능하다.

## 채택 method

미정. 사용자의 로컬 PC에서 Method A 또는 Method B 중 모든 actor에서 기대 UUID를 반환하는 방식을 채택한다.

## 후속 RLS 테스트에서 사용할 방식

18단계 로그가 확보된 뒤 결정한다.

## 둘 다 실패한 경우 판단

`No-Go`. actor simulation 방식부터 보정해야 하며 Project / Feedback / Change Card RLS test로 넘어가지 않는다.

## Supabase local 환경에서 확인된 실제 동작 요약

현재 문서 작성 환경에서는 확인하지 못했다. 16단계 사용자 로컬 환경의 schema/lint 성공과 별개로, actor simulation은 별도 검증이 필요하다.

# Manual Log Intake Template

> 이 양식은 사용자가 18단계 auth.uid() actor simulation smoke test를 로컬 PC에서 실행한 뒤 결과를 가져올 때 사용한다.  
> secret, token, password, DB URL 원문은 포함하지 않는다.

## 1. 실행 환경

- 실행 OS:
- 터미널/도구:
- local DB 접속 방식: local psql / local Studio / 기타
- Supabase CLI version:
- Docker daemon 상태:
- remote 미사용 확인: 예 / 아니오
- hosted SQL Editor 미사용 확인: 예 / 아니오

## 2. Method A 결과: request.jwt.claim.sub

| Actor | Expected | Actual | PASS/FAIL | Error summary |
|---|---:|---:|---|---|
| anon | null |  |  |  |
| authenticated_owner | 00000000-0000-0000-0000-000000000101 |  |  |  |
| authenticated_non_owner | 00000000-0000-0000-0000-000000000102 |  |  |  |
| feedback_author | 00000000-0000-0000-0000-000000000103 |  |  |  |
| link_shared_authenticated_user | 00000000-0000-0000-0000-000000000104 |  |  |  |

## 3. Method B 결과: request.jwt.claims

| Actor | Expected | Actual | PASS/FAIL | Error summary |
|---|---:|---:|---|---|
| anon | null |  |  |  |
| authenticated_owner | 00000000-0000-0000-0000-000000000101 |  |  |  |
| authenticated_non_owner | 00000000-0000-0000-0000-000000000102 |  |  |  |
| feedback_author | 00000000-0000-0000-0000-000000000103 |  |  |  |
| link_shared_authenticated_user | 00000000-0000-0000-0000-000000000104 |  |  |  |

## 4. 채택 method

- 채택 method: Method A / Method B / 미정
- 채택 이유:
- 실패한 method가 있다면 이유:

## 5. 첫 실패

- 첫 실패 actor:
- 첫 실패 method:
- 에러 요약:
- 원문 로그 일부, credential 마스킹 후:

## 6. secret 마스킹 확인

- access token 제거: 예 / 아니오
- DB URL 제거: 예 / 아니오
- password 제거: 예 / 아니오
- service role key 제거: 예 / 아니오
- anon key 제거: 예 / 아니오

## 7. 19단계 진행 요청

- 19단계로 진행 요청: 예 / 아니오
- 요청 메모:

# 다음 단계 결정

## 현재 판단

- SQL syntax patch는 현재 즉시 필요하지 않다.
- local schema application은 성공했다.
- local schema lint는 성공했다.
- 다음은 Manual RLS Scenario Test Plan이다.
- 17단계는 Manual RLS Scenario Test Execution 또는 Manual RLS Scenario Runbook 작성 단계 후보로 둔다.

## remote 적용 금지 유지

아래 작업은 계속 금지한다.

- remote Supabase migration
- production/staging DB 적용
- `supabase link`
- `supabase db push`
- `supabase db pull`
- Supabase SQL Editor 실행
- 정식 `supabase/migrations` 영구 승격

## 이유

`supabase db reset` 성공은 local schema application 성공을 의미한다. `supabase db lint --local`의 `No schema errors found`는 schema lint 통과를 의미한다. 두 결과 모두 RLS behavior, public-safe view 접근, secure RPC token 시나리오, helper execute permission, trigger behavior 검증 완료를 의미하지 않는다.

## 17단계 후보

1. Manual RLS Scenario Test Execution
2. Manual RLS Scenario Runbook 작성
3. 수동 테스트 로그 수집 후 18단계 patch scope 결정

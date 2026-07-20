# `supabase db lint --local` 성공 보고

## 실행 명령

```bash
supabase db lint --local
```

## 결과

성공.

## 확인 로그

```text
Linting schema: extensions
Linting schema: public
No schema errors found
```

## 의미

- local schema lint 관점에서 오류가 보고되지 않았다.
- 최소한 Supabase CLI lint가 잡는 schema error는 없다.
- dry-run 이후 schema lint 단계까지 1차 통과했다.

## 주의

- lint 통과는 제품 권한 정책 검증 완료가 아니다.
- lint 통과는 RLS behavior 검증 완료가 아니다.
- Supabase Security Advisor / Performance Advisor와 동일한 범위로 단정하지 않는다.
- public-safe view 접근 모델, secure RPC token scenario, function grant, trigger behavior는 별도 manual test가 필요하다.

## 현재 판정

SQL syntax patch는 즉시 필요하지 않다. 다음은 Manual RLS Scenario Test Plan이다.

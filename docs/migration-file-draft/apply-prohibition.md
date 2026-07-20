# 적용 금지 원칙

## 이 SQL 파일은 draft다

`supabase/migrations_draft`의 모든 SQL 파일은 검토용이다.  
정식 migration 파일이 아니며, Supabase CLI로 실행하면 안 된다.

## 금지 사항

- `supabase db push` 금지
- `supabase migration up` 금지
- local DB 적용 금지
- staging DB 적용 금지
- production DB 적용 금지
- Supabase SQL Editor 실행 금지
- 정식 `supabase/migrations`로 이동 금지

## 실제 적용 전 필요한 단계

1. 12단계 이상에서 문법 검증
2. disposable local DB dry-run
3. `supabase db lint` 후보
4. Supabase Security / Performance Advisor
5. 7.5 Test Case ID 기반 수동 검증
6. public-safe view 컬럼 검증
7. secure RPC token 검증
8. approved Change Card mutation trigger 검증

## 이유

이번 단계의 SQL은 의도와 경계가 포함된 초안이다.  
실제 적용 가능한 최종 migration으로 취급하면 보안 사고와 데이터 손상이 발생할 수 있다.

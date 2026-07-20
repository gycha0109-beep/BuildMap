# 18단계 사용자 로컬 PASS 결과

## 목적

이 문서는 사용자가 로컬 PC에서 직접 실행한 18단계 `auth.uid()` actor simulation smoke test 결과를 반영한다. 기존 18단계 문서의 `No-Go`는 Codex/ChatGPT 작업 환경에 Supabase CLI, Docker, psql이 없어 실행하지 못했다는 의미였고, 제품 진행 판단은 사용자 로컬 PASS 로그를 기준으로 재분류한다.

## 실행 환경 요약

- DB container: `supabase_db_BuildMap`
- remote Supabase 적용: 없음
- hosted Supabase SQL Editor 사용: 없음
- `supabase link`, `supabase db push`, `supabase db pull`: 실행하지 않음
- secret/token/password/DB URL 원문 노출: 없음

## ANON 결과

| Actor | Expected | Actual | 판정 |
|---|---|---|---|
| `anon` | `auth.uid() is null` | `null` | PASS |

## Method A: `request.jwt.claim.sub`

| Actor | Expected | Actual | 판정 |
|---|---|---|---|
| `authenticated_owner` | `00000000-0000-0000-0000-000000000101` | `00000000-0000-0000-0000-000000000101` | PASS |
| `authenticated_non_owner` | `00000000-0000-0000-0000-000000000102` | `00000000-0000-0000-0000-000000000102` | PASS |
| `feedback_author` | `00000000-0000-0000-0000-000000000103` | `00000000-0000-0000-0000-000000000103` | PASS |
| `link_shared_authenticated_user` | `00000000-0000-0000-0000-000000000104` | `00000000-0000-0000-0000-000000000104` | PASS |

## Method B: `request.jwt.claims` JSON

| Actor | Expected | Actual | 판정 |
|---|---|---|---|
| `authenticated_owner` | `00000000-0000-0000-0000-000000000101` | `00000000-0000-0000-0000-000000000101` | PASS |
| `authenticated_non_owner` | `00000000-0000-0000-0000-000000000102` | `00000000-0000-0000-0000-000000000102` | PASS |
| `feedback_author` | `00000000-0000-0000-0000-000000000103` | `00000000-0000-0000-0000-000000000103` | PASS |
| `link_shared_authenticated_user` | `00000000-0000-0000-0000-000000000104` | `00000000-0000-0000-0000-000000000104` | PASS |

## 결론

- `auth.uid()` actor simulation은 사용자 로컬 PC 기준 PASS다.
- 후속 RLS 테스트의 기본 방식은 Method A, `request.jwt.claim.sub`로 둔다.
- Method B, `request.jwt.claims` JSON 방식은 fallback으로 유지한다.
- 19단계는 P0 RLS local test script pack 작성으로 진행한다.

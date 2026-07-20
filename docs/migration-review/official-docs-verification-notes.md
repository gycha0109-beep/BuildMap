# Official Docs Verification Notes

> 주의: 이 문서는 실제 migration 파일이 아니다. SQL 실행, Supabase 연결, RLS 적용, helper/RPC/view/trigger 생성은 아직 하지 않는다. 실제 적용 전 Supabase/PostgreSQL 공식 문서와 로컬 dry-run으로 재검증해야 한다.

## 1. 목적

이 문서는 9단계 migration draft를 실제 Supabase migration 파일로 옮기기 전에 공식 문서 기준으로 재검증해야 할 항목을 정리한다.

공식 문서 내용은 최종 migration 작성 시점에 다시 확인해야 한다. 이 문서는 장황한 문서 복사가 아니라 **검증해야 할 지점**을 추적하기 위한 노트다.

## 2. 공식 문서 재검증 항목

| 검증 대상 | 왜 중요한가 | 9단계 관련 문서 | 현재 판단 | 실제 적용 전 확인 방법 | 상태 |
|---|---|---|---|---|---|
| Supabase RLS 동작 | 모든 접근 정책의 기반 | `rls-policy-migration-draft.md` | RLS 사용 전제는 타당 | Supabase RLS 공식 문서 확인 | 공식 문서 재검증 필요 |
| PostgreSQL RLS / `CREATE POLICY` | `USING` / `WITH CHECK` 문법 검증 | `rls-policy-migration-draft.md` | 초안 수준 | PostgreSQL `CREATE POLICY` 문서 확인 | 공식 문서 재검증 필요 |
| `auth.uid()` 사용 방식 | owner/author 정책 핵심 | helper/RLS 문서 | Supabase Auth 전제 | Supabase RLS/Auth 문서 확인 | 공식 문서 재검증 필요 |
| view와 RLS 관계 | public-safe view 보안 핵심 | `public-safe-view-migration-draft.md` | 위험 큼 | PostgreSQL `CREATE VIEW`와 Supabase view/RLS 문서 확인 | blocker 전 검증 필요 |
| `security_invoker` view | view owner 권한 우회 방지 후보 | `public-safe-view-migration-draft.md` | 후보 유지 | PostgreSQL CREATE VIEW 문서 확인 | 공식 문서 재검증 필요 |
| `SECURITY DEFINER` function/RPC | 링크 공개 RPC 권한 상승 위험 | `link-sharing-rpc-migration-draft.md` | high risk | PostgreSQL CREATE FUNCTION, Supabase DB functions 문서 확인 | blocker 전 검증 필요 |
| function `search_path` | `SECURITY DEFINER` 안전성 | RPC/helper 문서 | 반드시 검토 | Supabase functions 보안 가이드 확인 | blocker 전 검증 필요 |
| `pgcrypto` / hash | `share_token_hash` 저장 핵심 | `share-token-hash-review.md` | 알고리즘 미확정 | PostgreSQL `pgcrypto` 문서 확인 | 추가 검토 필요 |
| trigger syntax | 승인 Change Card mutation 제한 | `trigger-and-constraint-migration-draft.md` | 후보 | PostgreSQL CREATE TRIGGER / trigger function 문서 확인 | 공식 문서 재검증 필요 |
| grants와 RLS 관계 | view/RPC 공개 접근 통제 | view/RPC/RLS 문서 | 위험 큼 | Supabase grants/RLS 공식 문서 확인 | 공식 문서 재검증 필요 |
| `anon` / `authenticated` role grant | 공개/로그인 접근 분리 | RLS/view/RPC 문서 | 정책상 핵심 | Supabase roles/grants 기준 확인 | 공식 문서 재검증 필요 |
| Supabase CLI lint | 적용 전 문법/스키마 검증 | 11단계 이후 | 필요 | `supabase db lint` 확인 | 실제 적용 전 필요 |
| Supabase Security/Performance Advisor | RLS/보안/성능 검증 | 11단계 이후 | 필요 | Dashboard Advisor 확인 | 실제 적용 후 필요 |

## 3. 참고해야 할 공식 문서 후보

- Supabase Row Level Security: <https://supabase.com/docs/guides/database/postgres/row-level-security>
- Supabase database functions / `search_path`: <https://supabase.com/docs/guides/database/functions>
- Supabase CLI lint: <https://supabase.com/docs/reference/cli/introduction>
- Supabase Database Advisors: <https://supabase.com/docs/guides/database/database-advisors>
- PostgreSQL Row Security Policies: <https://www.postgresql.org/docs/current/ddl-rowsecurity.html>
- PostgreSQL `CREATE POLICY`: <https://www.postgresql.org/docs/current/sql-createpolicy.html>
- PostgreSQL `CREATE VIEW`: <https://www.postgresql.org/docs/current/sql-createview.html>
- PostgreSQL `CREATE FUNCTION`: <https://www.postgresql.org/docs/current/sql-createfunction.html>
- PostgreSQL `CREATE TRIGGER`: <https://www.postgresql.org/docs/current/sql-createtrigger.html>
- PostgreSQL `pgcrypto`: <https://www.postgresql.org/docs/current/pgcrypto.html>

## 4. 현재 결론

공식 문서 기준에서 가장 먼저 검증해야 할 항목은 다음이다.

1. public-safe view를 사용할 경우 `security_invoker`와 RLS 적용 방식
2. secure RPC를 사용할 경우 `SECURITY DEFINER`, `search_path`, grant 제한 방식
3. `share_token_hash` 생성을 DB에서 할지 API/RPC에서 할지
4. RLS policy의 `USING` / `WITH CHECK` 조건 분리
5. trigger로 승인된 Change Card 수정 제한을 구현할 때의 문법과 예외 처리

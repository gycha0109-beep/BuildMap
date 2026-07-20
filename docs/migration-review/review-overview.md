# Review Overview

> 주의: 이 문서는 실제 migration 파일이 아니다. SQL 실행, Supabase 연결, RLS 적용, helper/RPC/view/trigger 생성은 아직 하지 않는다. 실제 적용 전 Supabase/PostgreSQL 공식 문서와 로컬 dry-run으로 재검증해야 한다.

## 1. 10단계 검수의 목적

10단계 검수의 목적은 9단계 Supabase migration draft를 실제 `.sql` 파일로 옮기기 전에 다음 위험을 문서상에서 걸러내는 것이다.

- 문법상 즉시 실패할 가능성
- RLS 정책이 의도보다 넓어지는 위험
- public-safe view가 RLS를 우회하거나 컬럼을 과다 노출하는 위험
- secure RPC가 token 원문, `SECURITY DEFINER`, `search_path`, grant 문제를 일으키는 위험
- Feedback 작성자 위조 방지 누락
- 승인된 Change Card 원천 기록 훼손

## 2. 9단계에서 유지할 결론

- `share_token` 원문 저장 금지
- `share_token_hash` 후보 유지
- 전체 공개 데이터는 public-safe view 후보 우선
- 링크 공개 데이터는 secure RPC 후보 우선
- 공개 Feedback 원천 row 전체 직접 공개 금지
- Feedback insert 작성자 위조 방지 필요
- 승인된 Change Card 본문/근거/판단/변경 내용 수정 제한 후보 유지
- 관리자/팀/조직 권한 제외

## 3. 9단계에서 검수해야 할 위험

| 위험 | 검수 필요성 | 현재 판단 |
|---|---|---|
| `share_token_hash` 방식 미확정 | 링크 공개 보안의 핵심 | blocker 전 검토 필요 |
| public-safe view RLS 우회 | 공개 페이지 데이터 노출 위험 | high |
| secure RPC `SECURITY DEFINER` | 권한 상승 위험 | high |
| Feedback 작성자 위조 | 신뢰도/보안 문제 | high |
| 승인 Change Card 수정 | Decision Timeline 원천 훼손 | high |
| 7.5 Test Case ID 부분 매핑 | 수동 검증 누락 위험 | medium |
| 상태값 `text + check` | 유연하지만 오타 방지 필요 | medium |

## 4. 문법 검수 대상

- `create table`
- `references`
- `check constraint`
- `unique constraint`
- `create index`
- `create policy`
- `create view`
- `create function`
- `create trigger`
- `grant`

## 5. 보안 검수 대상

- RLS `USING` / `WITH CHECK` 조건
- anon/authenticated grant 범위
- public-safe view의 컬럼 제한
- secure RPC의 반환 데이터 제한
- token hash 저장/검증 방식
- Feedback author spoofing 방지
- Change Card 승인 후 수정 제한

## 6. 공식 문서 재검증 대상

- Supabase RLS와 `auth.uid()` 동작
- PostgreSQL `CREATE POLICY`, `USING`, `WITH CHECK` 문법
- PostgreSQL view의 `security_invoker` 동작
- PostgreSQL/Supabase 함수의 `SECURITY DEFINER` 및 `search_path`
- `pgcrypto`의 `digest` / `hmac` 사용 가능성
- trigger syntax 및 trigger function 작성 방식
- Supabase CLI lint, Security Advisor 사용 방식

## 7. 11단계 실제 migration 파일 작성 전 필요한 보정

1. `share_token_hash` 알고리즘 후보를 1차로 좁힌다.
2. public-safe view를 만들 경우 `security_invoker` 또는 API 조합 대안을 결정한다.
3. secure RPC를 만들 경우 `SECURITY DEFINER`, `set search_path`, grant 제한 정책을 명확히 한다.
4. Feedback insert의 `author_user_profile_id = current_user_profile_id()` 조건을 실제 policy/RPC에 반영한다.
5. approved Change Card mutation 제한을 trigger로 할지 app validation으로 시작할지 결정한다.
6. `feedbacks.project_id` 중복 저장 여부를 결정한다.
7. 7.5 Test Case ID 매핑을 보강한다.

## 8. Go / Conditional Go / No-Go 기준

### Go

- 치명적 보안 누락 없음
- 문법상 위험이 대부분 낮음
- 실제 migration 파일 작성 전 보정 목록이 작고 명확함

### Conditional Go

- migration 파일 작성은 가능하나, 일부 SQL 문법 또는 Supabase 동작은 실제 적용 전 재검증 필요
- 현재 BuildMap 10단계 판단은 **Conditional Go**다.

### No-Go

다음 중 하나라도 남아 있으면 실제 migration 작성으로 바로 넘어가지 않는다.

- 공개 row 전체 노출 위험이 해결되지 않음
- `share_token` 원문 저장 위험이 남아 있음
- Feedback 작성자 위조 방지 누락
- Rough Note / AI Draft 공개 가능성 존재
- 관리자/팀/조직 권한이 1차 정책에 섞임
- 실제 SQL 실행 전 검증해야 할 핵심 정책이 불명확함

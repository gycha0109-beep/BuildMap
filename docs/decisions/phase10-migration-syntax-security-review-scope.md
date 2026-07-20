# 10단계 Migration Syntax / Security Review Scope

## 1. 10단계에서 확정한 것

- 10단계는 실제 migration 파일 작성 전 문법/보안 검수 단계다.
- 실제 migration 파일은 아직 작성하지 않는다.
- Supabase에 적용하지 않는다.
- SQL은 실행하지 않는다.
- 9단계 migration draft를 폐기하지 않고, 실제 파일 작성 전 보정 목록을 만든다.
- 현재 전체 판단은 **Conditional Go**다.
- public-safe view는 `security_invoker` / grant / RLS 동작 검증이 필요하다.
- secure RPC는 `SECURITY DEFINER` 여부, `search_path`, grant 제한 검증이 필요하다.
- `share_token` 원문 저장 금지는 유지한다.
- `share_token_hash` 방식은 실제 migration 작성 전 확정 필요하다.
- Feedback author spoofing 방지 조건은 실제 migration 작성 전 필수다.
- 승인된 Change Card 수정 제한은 trigger 또는 application validation 후보를 유지한다.
- 관리자/팀/조직 권한은 계속 제외한다.
- 실제 적용 전 Supabase/PostgreSQL 공식 문서 기준 재검증이 필요하다.

## 2. 10단계에서 보류한 것

- 실제 Supabase migration 파일
- 실제 SQL 실행
- 실제 `CREATE POLICY` 최종본 적용
- 실제 helper function 생성
- 실제 secure RPC 생성
- 실제 public-safe view 생성
- 실제 trigger 생성
- API route
- 프론트엔드 구현
- 자동화 테스트 코드
- `share_token_hash` 알고리즘 최종 확정
- `public_slug` 실제 생성 정책
- Feedback 작성자 동의 UX
- 관리자 권한
- 팀 권한
- 공동 편집
- 조직 권한
- 비로그인 피드백
- Save / Follow
- Activity Signal
- Decision Diff Snapshot
- 채용/헤드헌팅 권한
- 결제 권한
- Project DNA
- 역량 점수화
- 외부 연동 권한
- 히트맵 산식

## 3. 11단계 입력 조건

11단계로 넘어가기 전 또는 11단계 초입에서 다음을 처리한다.

1. `share_token_hash` 알고리즘 후보를 결정한다.
2. secure RPC의 `SECURITY DEFINER`, `search_path`, grant template을 정한다.
3. public-safe view의 `security_invoker` 여부를 검증한다.
4. Feedback insert의 작성자 위조 방지 조건을 실제 SQL 수준으로 고정한다.
5. 승인된 Change Card mutation 제한을 trigger로 할지 application validation으로 할지 정한다.
6. 7.5 Test Case ID 전체 매핑표를 보강한다.

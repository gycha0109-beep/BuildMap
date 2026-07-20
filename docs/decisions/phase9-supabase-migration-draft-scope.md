# 9단계 Supabase Migration Draft Scope

## 1. 9단계에서 확정한 것

- 9단계는 Supabase migration draft 문서화 단계다.
- 실제 migration 파일은 아직 작성하지 않는다.
- Supabase에 적용하지 않는다.
- SQL 초안은 `docs/migration-draft` 문서 안에만 작성한다.
- `share_token` 원문 저장은 금지한다.
- `share_token_hash` 필드 후보를 migration draft에 포함한다.
- `public_slug`는 보안 토큰이 아니다.
- 전체 공개 데이터는 public-safe view 후보를 우선 검토한다.
- 링크 공개 데이터는 secure RPC 후보를 우선 검토한다.
- 원천 테이블 직접 anon select는 최소화하거나 금지하는 방향을 우선한다.
- 공개 Feedback 원천 row 전체 직접 노출을 금지한다.
- 공개 Feedback 작성자 표시는 익명 또는 역할/맥락 표시를 우선한다.
- Feedback insert에는 작성자 위조 방지 조건을 포함한다.
- Feedback 작성 조건에는 Project 접근 조건을 포함한다.
- 링크 공개 Feedback 작성에는 유효 `share_token` + 로그인 사용자 + 공개 Feedback Request 조건을 포함한다.
- 승인된 Change Card 본문/근거/판단/변경 내용 수정 제한 후보를 포함한다.
- 관리자/팀/조직 권한은 제외한다.
- 7.5 Test Case ID와 8단계 RLS Policy ID를 migration draft와 연결한다.

## 2. 9단계에서 보류한 것

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
- `share_token` 최종 검증 구현
- token hash 세부 알고리즘 확정
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

## 3. 10단계 입력 조건

10단계로 넘어갈 때는 다음을 확인한다.

- migration draft의 SQL 문법 검증 계획
- token hash 알고리즘 결정
- secure RPC와 public-safe view의 실제 구현 경계
- RLS policy와 7.5 Test Case ID의 최종 매핑
- 승인된 Change Card 수정 제한 구현 방식

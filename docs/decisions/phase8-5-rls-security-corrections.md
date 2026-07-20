# 8.5단계 RLS Security Correction Scope

## 1. 8.5단계에서 확정한 것

- 8.5단계는 Supabase migration draft 전 RLS 보안 보정 단계다.
- 실제 migration은 아직 작성하지 않는다.
- 실제 SQL 파일은 만들지 않는다.
- `share_token` 원문 저장은 금지하는 방향을 우선 검토한다.
- `share_token`은 hash 저장 후보를 우선 검토한다.
- `public_slug`는 보안 토큰이 아니다.
- 링크 공개 데이터는 원천 테이블 직접 select보다 secure RPC 또는 API 조합을 우선 검토한다.
- 전체 공개 데이터도 public-safe view 또는 API 조합을 우선 검토한다.
- RLS는 컬럼 마스킹을 자동으로 해결하지 않으므로 공개 응답 경계가 필요하다.
- 공개 Feedback은 원천 `feedbacks` row 전체를 직접 노출하지 않는다.
- 공개 Feedback 작성자 표시는 1차에서 익명 또는 역할/맥락 표시를 우선한다.
- Feedback insert에는 작성자 위조 방지 조건이 필요하다.
- Feedback 작성 조건에는 Project 접근 조건이 포함되어야 한다.
- 링크 공개 Feedback 작성에는 유효 `share_token` + 로그인 사용자 + 공개 Feedback Request 조건이 필요하다.
- 승인된 Change Card의 본문/근거/판단 직접 수정은 제한하는 방향을 우선 검토한다.
- 승인된 Change Card의 공개 상태/민감도 변경은 Project Owner 권한 후보로 둔다.
- 관리자 후보 권한은 1차 migration draft에서도 제외한다.
- 7.5 체크리스트 상태는 8.5 문서에서 확인됨 / 부분 확인 / 확인 필요 / 후순위 제외로 재분류한다.

## 2. 8.5단계에서 보류한 것

- 실제 Supabase migration
- 실제 `CREATE POLICY` 최종본
- 실제 helper function 생성
- 실제 RPC 생성
- 실제 API route
- `share_token` 최종 검증 위치
- token hash 저장 세부 방식
- `public_slug` 실제 생성 정책
- public-safe view 실제 생성
- 공개 페이지 API 구현
- Feedback 작성자 동의 UX
- 승인된 Change Card 수정 제한 trigger
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

## 3. 9단계 migration draft 입력 조건

9단계 migration draft는 이 문서를 입력으로 삼아야 한다. 특히 다음 보안 결정은 migration draft 초입에서 다시 확인한다.

- `share_token` 원문 저장 금지
- token hash 저장 후보
- token 검증 위치
- public-safe response boundary
- Feedback author 위조 방지
- 승인된 Change Card 수정 제한
- 관리자/팀/조직 권한 제외

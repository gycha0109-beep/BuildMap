# Migration Known Risks

> 주의: 이 문서의 SQL은 검토용 초안이다. 실제 Supabase migration 파일이 아니며, 아직 실행하거나 적용하지 않는다. 실제 적용 전 Supabase/PostgreSQL 문법, 보안, RLS 동작을 별도로 검증해야 한다.

## 1. share_token 검증 위치가 최종 확정되지 않은 위험

- 영향: 링크 공개 접근이 과도하게 열리거나 막힐 수 있다.
- 예방 원칙: secure RPC 후보를 우선하고 token hash 저장을 검토한다.
- 실제 적용 전 확인: token 전달, hash 비교, 로그 노출 여부.

## 2. public-safe view가 RLS를 우회할 수 있는 위험

- 영향: 원천 테이블의 내부 row 또는 컬럼이 노출될 수 있다.
- 예방 원칙: `security_invoker` 후보, view grant 범위, underlying RLS 동작을 검증한다.

## 3. 원천 테이블 anon select가 과도하게 열리는 위험

- 영향: 컬럼 마스킹 실패.
- 예방 원칙: public-safe view / RPC / API 경계 우선.

## 4. 공개 Feedback에서 내부 식별자가 노출되는 위험

- 영향: 작성자 개인정보 노출.
- 예방 원칙: public view에서 `author_user_profile_id`, 이메일, auth ID 제외.

## 5. Feedback 작성자 위조 방지 조건 누락 위험

- 영향: 다른 사용자 명의 Feedback 생성.
- 예방 원칙: `author_user_profile_id = current_user_profile_id()` 강제.

## 6. 승인된 Change Card 수정 제한이 RLS만으로 불완전한 위험

- 영향: Decision Timeline 원천 기록 훼손.
- 예방 원칙: trigger 또는 application validation 후보 검토.

## 7. 상태값을 enum으로 너무 빨리 확정하는 위험

- 영향: 상태 변경 비용 증가.
- 예방 원칙: 1차는 text + check constraint 후보.

## 8. helper function이 RLS 정책을 복잡하게 만드는 위험

- 영향: 디버깅 어려움, RLS 재귀, 성능 문제.
- 예방 원칙: helper 범위를 최소화하고 복잡한 링크 공개는 RPC 후보로 분리.

## 9. secure RPC가 과도하게 많은 책임을 갖는 위험

- 영향: RPC가 비대해지고 정책 중복 발생.
- 예방 원칙: 링크 공개와 Feedback 작성처럼 필요한 영역에만 제한.

## 10. migration 순서가 FK/RLS 의존성과 충돌하는 위험

- 영향: migration 실패.
- 예방 원칙: 테이블 → helper → view/RPC → RLS → trigger 순서 검토.

## 11. 실제 Supabase 문법 검증 전 초안을 과신하는 위험

- 영향: 실행 시 오류.
- 예방 원칙: 10단계에서 문법 검증 전용 보정 필요.

## 12. 정책 테스트 케이스와 실제 SQL이 불일치하는 위험

- 영향: 문서상 안전하지만 실제 정책 누락.
- 예방 원칙: 7.5 Test Case ID를 migration draft와 매핑한다.

# 8단계 RLS 초안의 한계와 후속 검토 사항

## 1. 문서 목적

이 문서는 8단계 RLS SQL 초안이 아직 실제 migration으로 사용될 수 없는 이유와 후속 검토가 필요한 항목을 정리한다.

## 2. 반드시 인지해야 할 한계

- share_token을 RLS에서 안전하게 처리하는 방식은 추가 검토 필요하다.
- public_slug와 share_token 실제 필드명은 아직 최종 확정이 아니다.
- RLS helper function은 후보이며 실제 생성하지 않았다.
- token hash 저장 여부는 추가 검토 필요하다.
- Feedback 작성자 동의 UX는 아직 보류다.
- 공개 Feedback 작성자 표시는 1차에서 익명/역할 표시를 권장하지만, 실제 표시 정책은 후속 단계에서 확정해야 한다.
- Project Owner 외 승인 Builder는 1차에서 제외한다.
- 관리자 권한은 1차에서 제외한다.
- Save/Follow, Activity Signal, Decision Diff Snapshot은 제외한다.
- 실제 성능 인덱스, 검색 인덱스, 캐시는 보류한다.
- 실제 Supabase 정책 문법 검증은 후속 단계가 필요하다.

## 3. 기술적 한계

- RLS는 행 접근을 제어하지만 컬럼 마스킹을 직접 해결하지 않는다.
- 이메일, auth ID, 내부 user ID 노출 방지는 view/API 응답 설계와 함께 검토해야 한다.
- public project page가 여러 원천 테이블의 파생 뷰이므로 정책 조합이 복잡할 수 있다.
- share_token을 클라이언트에서 직접 전달받아 RLS에서 비교하는 방식은 보안 위험이 있다.

## 4. 후속 단계 후보

- 8.5단계: RLS SQL 초안 보안 보정 / helper function 검토
- 9단계: Supabase migration draft 작성
- 9.5단계: migration dry-run checklist / manual verification checklist

# 실제 DB Migration 전 체크리스트

> 이 문서는 DB 스키마 초안 문서다. 실제 SQL, Supabase migration, RLS 정책, API, 프론트엔드 구현은 작성하지 않는다. 테이블명과 필드명은 후보이며 최종 확정이 아니다.

## 1. 체크리스트의 목적

이 문서는 6단계 DB 스키마 초안에서 실제 Supabase/PostgreSQL migration 작성 단계로 넘어가기 전에 확인할 기준이다.

아래 항목이 충분히 검토되지 않았다면 SQL을 작성하지 않는다.

## 2. 필수 확인 체크리스트

- [ ] 5.5 보정 문서를 반영했는가
- [ ] Change Card 작업 상태와 공개 상태를 분리했는가
- [ ] Project 진행 상태와 공개 상태를 분리했는가
- [ ] AI Draft가 공식 기록이 아님을 반영했는가
- [ ] Decision Timeline을 별도 원천 테이블로 만들지 않았는가
- [ ] Public Project Page를 별도 원천 테이블로 만들지 않았는가
- [ ] Problem/Hypothesis 이력을 Change Card 원천으로 정리했는가
- [ ] Feedback을 일반 댓글이 아니라 요청/판단 연결 구조로 설계했는가
- [ ] 1차 필수 테이블이 과도하지 않은가
- [ ] 선택/후순위 테이블을 실제로 미뤘는가
- [ ] 공개/비공개 정책을 RLS 설계 전에 확인했는가
- [ ] 비로그인 피드백을 제외했는가
- [ ] Scout/채용 기능을 과도하게 넣지 않았는가
- [ ] SQL 작성 전에 관계와 상태 필드가 문서상 검토되었는가

## 3. Change Card 관련 확인

- [ ] Change Card가 핵심 원천 테이블 후보다.
- [ ] 필수 필드가 과도하지 않다.
- [ ] 작업 상태와 공개 상태가 분리되어 있다.
- [ ] AI Draft에서 전환되는 구조가 명확하다.
- [ ] Problem/Hypothesis/Feedback 연결이 선택 연결로 설계되어 있다.
- [ ] Decision Timeline 테이블을 따로 만들지 않았다.

## 4. 공개 정책 확인

- [ ] 기본 기록은 내부 비공개다.
- [ ] Project 공개 상태와 Change Card 공개 상태가 분리되어 있다.
- [ ] 공개 프로젝트 페이지는 공개 가능한 데이터만 파생한다.
- [ ] Feedback 내용은 기본 내부 검토다.
- [ ] Builder가 선택한 Feedback만 공개할 수 있다.

## 5. 범위 확인

- [ ] Scout Profile은 1차 선택 또는 후순위다.
- [ ] Save/Follow는 1차 선택 또는 후순위다.
- [ ] Activity Signal은 1차 선택 또는 후순위다.
- [ ] Decision Diff는 별도 저장 없이 파생 우선이다.
- [ ] 채용/헤드헌팅, 결제, 외부 연동은 제외되어 있다.

## 6. Migration 작성 전 결론 문장

실제 migration은 다음 원칙이 확인된 뒤 작성한다.

> BuildMap의 DB는 Change Card를 핵심 원천 기록으로 두고, Decision Timeline과 Public Project Page를 그 원천에서 파생되는 표현 구조로 다룬다.

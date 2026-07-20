# 6단계 DB 스키마 초안 범위 결정

## 1. 6단계의 성격

6단계는 DB 스키마 초안 문서화 단계다. 실제 SQL, Supabase migration, RLS 정책, API 구조, 프론트엔드 구현은 작성하지 않는다.

## 2. 우선 기준

5.5단계 보정 문서가 5단계 제품 데이터 모델 문서보다 우선한다. 특히 상태축 분리, 원천/파생 데이터 구분, 공개 정책, 1차 범위 축소 결정을 우선한다.

## 3. 이번 단계에서 확정한 것

- 6단계는 DB 스키마 초안 문서화 단계다.
- SQL은 아직 작성하지 않는다.
- 5.5단계 보정 문서가 5단계 데이터 모델 문서보다 우선한다.
- Change Card는 핵심 원천 테이블 후보다.
- Decision Timeline은 Change Card 기반 표현이다.
- Public Project Page는 Project의 공개 뷰다.
- Change Card 작업 상태와 공개 상태를 분리한다.
- Project 진행 상태와 공개 상태를 분리한다.
- AI Draft는 공식 기록이 아니라 Change Card 후보 초안이다.
- AI Draft의 공식 승인 상태는 두지 않고, Change Card로 전환됨 상태와 연결을 둔다.
- Problem/Hypothesis 이력은 Change Card를 원천으로 둔다.
- Feedback은 Feedback Request와 연결된 판단 피드백 구조로 둔다.
- Feedback 내용은 기본 내부 검토이며 Builder가 선택한 것만 공개할 수 있다.
- 1차 DB 범위는 필수 테이블 중심으로 줄인다.
- Scout Profile, Save/Follow, Activity Signal, Decision Diff는 1차 선택 또는 후순위로 둔다.

## 4. 이번 단계에서 보류한 것

- 실제 SQL
- Supabase migration
- RLS 정책
- API 구조
- 권한 상세 구현
- 인덱스 최적화
- 검색 인덱스
- 캐시/스냅샷 테이블
- GitHub/Notion 연동
- 비로그인 피드백
- 채용/헤드헌팅
- 결제
- Project DNA
- 역량 점수화
- 히트맵 산식

## 5. 7단계로 넘어가기 전 질문

1. 실제 migration 단계에서 별도 `users` 테이블을 둘 것인가, Supabase Auth 참조만으로 시작할 것인가?
2. Change Card와 Problem/Hypothesis/Feedback 연결은 1차에서 직접 선택 참조로 확정해도 되는가?
3. Project Link와 Project Tag를 1차 DB에 포함할 것인가, 제외할 것인가?
4. Save/Follow, Activity Signal, Decision Diff snapshot을 1차 migration에서 제외해도 되는가?
5. Change Card 필수 필드는 `project`, `builder`, `type`, `title`, `structured summary`, `work status`, `visibility status` 정도로 최소화할 것인가?
6. Feedback은 반드시 Feedback Request를 통해서만 받을 것인가?
7. 공개 페이지는 완전히 파생으로 시작하고 캐시/스냅샷을 만들지 않을 것인가?
8. RLS 설계 전에 공개 상태와 소유자/작성자 권한을 별도 문서로 먼저 확정할 것인가?

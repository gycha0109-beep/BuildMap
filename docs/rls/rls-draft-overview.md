# RLS 초안 전체 개요

> 주의: 아래 SQL은 검토용 초안이다. Supabase에 실행하지 않으며, migration 파일도 아니다. 실제 테이블명, 컬럼명, enum 값, helper function 이름은 후속 migration 단계에서 재검토한다.

## 1. RLS 설계의 목적

BuildMap의 RLS는 단순히 행 접근을 막는 장치가 아니다. BuildMap의 제품 철학인 내부 판단 기록과 공개 판단 흐름의 분리를 DB 권한 수준에서 보장하기 위한 안전장치다.

RLS 초안은 다음 질문에 답해야 한다.

- 누가 Project를 볼 수 있는가?
- 어떤 Change Card가 공개 Timeline에 노출되는가?
- Rough Note와 AI Draft가 외부로 새지 않는가?
- Feedback이 일반 댓글처럼 공개되지 않는가?
- 링크 공개와 전체 공개가 혼동되지 않는가?
- Project Owner만 1차 핵심 수정/승인 권한을 갖는가?

## 2. 핵심 보호 대상

- 비공개 Project
- Rough Note
- AI Structured Draft
- 내부 전용 Change Card
- 공개 가능이지만 아직 공개됨이 아닌 Change Card
- 민감 정보 포함 Change Card
- 내부 검토 Feedback
- 이메일, auth ID, 내부 user ID
- 비공개 Problem Definition / Hypothesis

## 3. 공개 데이터와 내부 데이터의 구분

| 구분 | 예시 | 1차 공개 원칙 |
|---|---|---|
| 내부 원천 | Rough Note, AI Draft | 외부 공개 금지 |
| 공개 후보 | 공개 가능 Change Card | 외부 공개 아님 |
| 공개 원천 | 승인됨+공개됨+민감도 일반 Change Card | Project 공개 조건 만족 시 공개 가능 |
| 공개 파생 | Decision Timeline, Public Project Page | 원천 정책 조합으로 구성 |
| 내부 검토 | Feedback 내용 | Builder 선택 공개 전까지 내부 |

## 4. 1차 정책에서 허용하는 행위

- 로그인 Builder의 Project 생성
- Project Owner의 Project 읽기/수정/상태 변경
- Project Owner의 Rough Note / AI Draft / Change Card 관리
- Project Owner의 Change Card 승인 및 공개 상태 변경
- 공개 조건을 만족한 Project 공개 정보 읽기
- 공개 조건을 만족한 Change Card 읽기
- 로그인 사용자의 접근 가능한 공개 Feedback Request에 대한 Feedback 작성
- Feedback 작성자의 자기 Feedback 읽기
- Project Owner의 Project Feedback 읽기/검토/선택 공개

## 5. 1차 정책에서 차단하는 행위

- 비로그인 쓰기
- 비공개 Project 외부 읽기
- Rough Note / AI Draft 외부 읽기
- 공개 가능 상태 Change Card 외부 읽기
- 민감 정보 포함 Change Card 공개 Timeline 노출
- Feedback Request 없는 Feedback 작성
- Project Owner가 아닌 사용자의 Project 수정
- Project Owner가 아닌 사용자의 Change Card 승인/공개
- 관리자 후보의 전역 접근 권한

## 6. 7.5단계 테스트 케이스와의 관계

8단계 RLS 초안은 7.5단계 테스트 케이스를 다음 방식으로 사용한다.

- 허용/차단 기대 결과를 Policy 조건으로 변환한다.
- Test Case ID를 RLS Policy ID와 매핑한다.
- SQL 초안으로 직접 표현하기 어려운 경우 helper function 후보 또는 추가 검토 필요로 표시한다.
- 실제 RLS SQL 작성 후 7.5 테스트 케이스를 수동 검증 체크리스트로 재사용한다.

## 7. 반드시 반영한 결정

- 6.5단계: 공개 상태와 민감도 분리, 링크 공개 식별자, Rough Note 보존, Owner 중심 권한.
- 7단계: Auth/User/Profile 분리, 공개/비공개 정책, Feedback 기본 내부 검토.
- 7.5단계: Test Case ID 기반 시나리오, Project Owner 중심 권한, 비로그인 쓰기 차단.

## 8. helper function 후보가 필요한 이유

다음 조건은 단순 RLS 조건만으로 처리하기 어렵거나 보안 검토가 필요하다.

- `share_token` 검증
- token hash 비교
- 링크 공개 접근 context 전달
- Project 공개 상태와 하위 객체 공개 상태 결합
- Feedback 작성 시 Feedback Request 접근 가능성 검증

따라서 8단계에서는 helper function 후보를 문서화하지만 실제 생성하지 않는다.

## 9. 실행 금지 경고

본 문서의 SQL은 실행하지 않는다. 실제 migration 단계에서는 테이블명, 컬럼명, 상태값, helper function, token 처리 방식, index, RLS enable 순서를 별도로 검토해야 한다.

# Problem Definition / Hypothesis 접근 정책

> 본 문서는 BuildMap 7단계 문서다. 7단계는 실제 RLS SQL 작성 단계가 아니라, SQL 작성 전 권한/공개/접근 정책을 자연어로 고정하는 단계다. `docs/decisions/phase6-5-db-schema-corrections.md`를 최우선 기준으로 삼는다.

## 1. 문서 목적

이 문서는 Problem Definition과 Hypothesis의 접근 정책을 정리한다. 두 객체는 프로젝트 판단 중심축이지만 과거 이력 원천은 Change Card다.

## 2. Problem Definition 접근 정책

### 읽기 정책

- Project Owner는 현재 Problem Definition을 읽을 수 있다.
- 비공개 Project의 Problem Definition은 외부에 노출하지 않는다.
- 링크 공개 또는 전체 공개 Project에서는 공개 가능한 현재 Problem Definition만 노출한다.

### 생성/수정 정책

- Project Owner가 생성/수정할 수 있다.
- 중요한 문제 정의 수정은 Change Card 생성을 유도한다.
- 모든 수정에 Change Card 생성을 강제하지는 않는다.

### 이력 처리 원칙

- 현재 Problem Definition은 현재 상태를 나타낸다.
- 과거 문제 정의 이력의 원천은 `문제 정의 수정` 유형의 Change Card다.
- 별도 Problem Definition 이력 테이블은 후순위다.

### 공개 주의점

- 민감한 시장 정보, 개인 정보, 내부 전략이 포함된 문제 정의는 공개하지 않는다.
- 공개 페이지에는 Builder가 공개 가능하다고 판단한 현재 문제 정의만 노출한다.

## 3. Hypothesis 접근 정책

### 읽기 정책

- Project Owner는 현재 Hypothesis와 상태를 읽을 수 있다.
- 비공개 Project의 Hypothesis는 외부에 노출하지 않는다.
- 링크 공개 또는 전체 공개 Project에서는 공개 가능한 현재 Hypothesis만 노출한다.

### 생성/수정 정책

- Project Owner가 Hypothesis를 생성/수정할 수 있다.
- 가설 상태 변경 시 관련 Change Card 연결을 유도한다.
- 모든 상태 변경에 Change Card 생성을 강제하지 않는다.

### 상태 후보

- 가정
- 검증 중
- 일부 확인
- 확인됨
- 반박됨
- 보류

### 이력 처리 원칙

- Hypothesis는 현재 가설 문장과 현재 상태를 가진다.
- 가설 생성, 반박, 보류, 수정의 판단 흐름은 Change Card가 원천이다.
- 별도 Hypothesis 이력 테이블은 후순위다.

## 4. Project 공개 상태와의 관계

- Project가 비공개이면 Problem/Hypothesis는 외부에 노출되지 않는다.
- Project가 링크 공개 또는 전체 공개여도 Builder가 공개 가능한 현재값만 노출한다.
- Problem/Hypothesis 변경 이력은 해당 Change Card의 공개 정책을 따른다.

## 5. 후순위 검토 사항

- Problem/Hypothesis 공개 범위 세부 제어
- 민감한 가설 자동 감지
- 변경 이력 전용 화면
- 복수 Hypothesis 연결 정책

# Rough Note / AI Draft 접근 정책

> 본 문서는 BuildMap 7단계 문서다. 7단계는 실제 RLS SQL 작성 단계가 아니라, SQL 작성 전 권한/공개/접근 정책을 자연어로 고정하는 단계다. `docs/decisions/phase6-5-db-schema-corrections.md`를 최우선 기준으로 삼는다.

## 1. 문서 목적

이 문서는 Rough Note와 AI Structured Draft의 접근 정책을 정리한다. 두 객체는 BuildMap의 내부 작업 기록이며 공개 프로젝트 페이지나 공개 Timeline에 직접 노출되지 않는다.

## 2. Rough Note 접근 정책

### 기본 원칙

Rough Note는 Builder가 남긴 거친 원문 기록이다. AI 구조화의 입력이며 Change Card 후보의 근거가 된다.

### 읽기 정책

- Project Owner 또는 작성 Builder만 읽을 수 있다.
- 외부 방문자, Scout 성격 사용자, 비로그인 방문자는 읽을 수 없다.
- 공개 프로젝트 페이지에 노출하지 않는다.

### 생성 정책

- Project Owner 또는 해당 Project의 작성 권한이 있는 Builder가 생성할 수 있다.
- 기본 입력은 텍스트 메모 하나다.

### 수정 정책

- Change Card로 전환되기 전에는 작성 Builder가 수정할 수 있다.
- Change Card로 전환된 Rough Note는 1차에서 수정 제한을 우선 검토한다.
- 승인된 Change Card의 근거가 사후 변경되지 않아야 한다.

### 삭제 또는 보관 정책 후보

- Change Card로 전환되지 않은 Rough Note는 삭제 가능 후보다.
- Change Card로 전환된 Rough Note는 보관 우선 후보다.
- 원문 스냅샷 또는 수정 이력 테이블은 후순위다.

## 3. AI Structured Draft 접근 정책

### 기본 원칙

AI Structured Draft는 공식 기록이 아니라 Change Card 후보 초안이다. AI Draft는 Builder 승인 전까지 Decision Timeline에 반영되지 않는다.

### 읽기 정책

- Project Owner 또는 작성 Builder만 읽을 수 있다.
- 외부 방문자, Scout 성격 사용자, 비로그인 방문자는 읽을 수 없다.

### 생성 정책

- Rough Note를 기반으로 생성된다.
- AI는 Builder의 입력을 구조화할 뿐, 없는 성과를 만들지 않는다.

### 수정 정책

- Builder는 AI Draft를 검토하고 수정할 수 있다.
- AI Draft가 Change Card로 전환되면 공식 승인 상태는 Change Card 쪽에서 관리한다.

### 상태 후보

- 생성 중
- 생성됨
- 수정 중
- Change Card로 전환됨
- 보류됨
- 실패

`승인됨` 상태는 AI Draft에 두지 않는다.

### 실패 상태 처리

- AI Draft 생성에 실패해도 Rough Note 원문은 보존한다.
- 실패 결과는 외부에 노출하지 않는다.

## 4. 공개 금지 원칙

Rough Note와 AI Draft는 다음 화면에 노출되지 않는다.

- 공개 프로젝트 페이지
- 공개 Decision Timeline
- Scout 탐색 화면
- Project Card Grid
- 비로그인 방문자 화면

## 5. 후순위 검토 사항

- Rough Note 수정 이력
- Change Card 원문 스냅샷
- AI Draft 품질 검토 기록
- 팀 단위 Draft 검토 권한

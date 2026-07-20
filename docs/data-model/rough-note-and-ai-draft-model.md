# Rough Note와 AI Structured Draft 모델

## 1. 기본 원칙

BuildMap의 AI는 생성보다 구조화에 집중한다. AI는 Builder의 프로젝트를 대신 만들어주거나, 과장된 포트폴리오 문장을 만들어주는 도구가 아니다. AI는 Builder가 남긴 거친 메모를 Change Card 초안으로 정리하는 보조자다.

1차 입력은 **텍스트 메모 하나**로 가정한다. 음성, 이미지, 파일 업로드, GitHub/Notion 연동은 후순위다.

## 2. Rough Note

### 정의

Rough Note는 Builder가 프로젝트 진행 중 남기는 거친 원문 기록이다.

예시:

- 회의 후 메모
- 사용자 테스트 결과
- 사용자 반응
- 기능 변경 이유
- 버린 기능에 대한 판단
- 릴리즈 목적
- 인수인계용 설명

Rough Note는 처음부터 잘 정리된 회고문일 필요가 없다.

### 1차 입력

1차에서는 텍스트 하나만 받는다.

예시 입력:

> 테스터 3명이 첫 화면이 너무 복잡하다고 했다. 10년 후 목표를 먼저 쓰라고 하니까 부담스럽다고 했다. 그래서 첫 화면에서는 이번 주 목표부터 고르게 바꾸는 게 맞을 것 같다.

### 공개되지 않는 내부 기록

Rough Note는 기본적으로 내부 비공개다. Builder가 입력한 원문에는 미정리 의견, 민감한 표현, 개인 정보, 내부 논의가 포함될 수 있다.

따라서 Rough Note 자체를 자동 공개하지 않는다. 공개 가능한 기록은 Builder가 검토하고 승인한 Change Card다.

### AI 구조화의 입력

Rough Note는 AI Structured Draft의 입력이다. AI는 원문을 바탕으로 변화 카드 초안을 제안한다.

AI가 참고할 수 있는 맥락 후보:

- Project명
- 현재 문제 정의
- 현재 가설
- 기존 Change Card 일부
- Builder가 선택한 카드 유형 후보

단, 1차에서는 입력 범위를 단순하게 유지한다.

### 초안 생성 실패 시 원문 보존

AI 구조화가 실패해도 Rough Note는 보존되어야 한다. Builder가 다시 시도하거나 직접 Change Card를 작성할 수 있어야 한다.

### 초기 구현 필수 정보

- 연결된 Project
- 원문 텍스트
- 작성 Builder
- 작성 시점
- AI 구조화 상태 후보
- 공개 기본값: 비공개

### 후순위 정보

- 음성 입력
- 이미지 입력
- 파일 업로드
- GitHub/Notion 연동 입력
- 여러 메모 병합
- 메모 태그
- 자동 민감 정보 탐지

## 3. AI Structured Draft

### 정의

AI Structured Draft는 Rough Note를 Change Card 후보로 구조화한 초안이다. 이 초안은 공식 기록이 아니며, Builder가 수정하고 승인해야 Change Card가 된다.

### AI가 만들 수 있는 항목

AI는 다음 항목을 제안할 수 있다.

- 유형 후보
- 제목 후보
- 구조화 요약
- 근거
- 판단
- 변경 내용
- 다음 확인 사항
- 연결 가능한 문제 정의 후보
- 연결 가능한 가설 후보
- 공개 시 주의할 표현 후보

AI가 만든 항목은 모두 Builder 검토 대상이다.

### AI가 하면 안 되는 것

AI는 다음을 하면 안 된다.

- 없는 성과 생성
- 과장된 포트폴리오 문장 작성
- Builder가 말하지 않은 사실 추가
- 자동 공개
- Builder 승인 없이 Timeline 반영
- Scout에게 점수나 등급으로 노출

### 초안 상태 후보

상태값은 제품 설계용 후보이며 DB enum으로 확정하지 않는다.

| 상태 | 의미 |
|---|---|
| 생성 중 | AI가 Rough Note를 구조화하는 중 |
| 생성됨 | AI 초안이 만들어졌지만 Builder가 아직 검토하지 않음 |
| 수정 중 | Builder가 초안을 수정 중 |
| 승인됨 | Builder가 승인하여 Change Card로 전환됨 |
| 보류됨 | Builder가 공식 기록으로 반영하지 않고 보류 |
| 실패 | AI 구조화가 실패함 |

### Builder 승인

AI Draft는 승인 전까지 공식 Decision Timeline에 반영되지 않는다. 공개 프로젝트 페이지에도 노출되지 않는다.

승인 시 가능한 흐름:

```text
Rough Note
→ AI Structured Draft
→ Builder 수정
→ Builder 승인
→ Change Card 공식 기록
→ Decision Timeline 표현에 반영
```

### 초기 구현 필수 정보

- 연결된 Rough Note
- 연결된 Project
- AI 구조화 결과
- 상태
- Builder 수정 가능 영역
- 생성 시점
- 승인 여부

### 후순위 정보

- 재생성 이력
- 복수 초안 비교
- AI 신뢰도 표시
- 민감 정보 탐지
- 외부 문서 요약
- 여러 입력 병합

## 4. 중복 저장 위험

AI Draft의 구조화 결과와 Change Card의 최종 내용은 유사하다. 따라서 승인 후 어떤 값이 원천인지 명확해야 한다.

권장 방향:

- AI Draft는 초안 원천이다.
- 승인된 Change Card가 공식 원천이다.
- 승인 후 Change Card를 수정하면, AI Draft와 달라질 수 있다.
- Public Project Page와 Decision Timeline은 AI Draft가 아니라 Change Card를 기준으로 한다.

## 5. 추가 검토 필요

- AI Draft를 삭제해도 승인된 Change Card는 남길 것인가?
- AI Draft 실패 로그를 사용자에게 얼마나 보여줄 것인가?
- AI가 연결 가능한 문제/가설 후보를 제안할 때 어떤 기준을 사용할 것인가?
- 민감 정보 탐지는 1차에 포함할 것인가, 공개 전 경고 수준으로 둘 것인가?

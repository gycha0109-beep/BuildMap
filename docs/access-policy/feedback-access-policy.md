# Feedback Request / Feedback 접근 정책

> 본 문서는 BuildMap 7단계 문서다. 7단계는 실제 RLS SQL 작성 단계가 아니라, SQL 작성 전 권한/공개/접근 정책을 자연어로 고정하는 단계다. `docs/decisions/phase6-5-db-schema-corrections.md`를 최우선 기준으로 삼는다.

## 1. 문서 목적

이 문서는 Feedback Request와 Feedback의 접근 정책을 정리한다. BuildMap의 Feedback은 일반 댓글이 아니라 특정 질문 또는 판단에 연결되는 근거다.

## 2. Feedback Request 정책

### 생성 정책

- Project Owner는 자신의 Project에 Feedback Request를 생성할 수 있다.
- 1차 대상은 Project 또는 Change Card로 제한한다.
- Problem Definition/Hypothesis 피드백은 1차에서 Project-level 요청의 질문/context로 표현한다.

### 읽기 정책

- 내부 요청은 Project Owner만 읽는다.
- 공개 요청은 Project 공개 정책을 만족하는 방문자 또는 로그인 사용자가 읽을 수 있다.
- 비공개 Project의 공개 요청은 외부에 노출하지 않는다.

### 수정 정책

- Project Owner는 Feedback Request의 질문, 원하는 피드백 유형, 공개 상태, 요청 상태를 수정할 수 있다.

### 종료/보관 정책

- Project Owner는 Feedback Request를 종료하거나 보관할 수 있다.
- 종료된 요청에는 새 Feedback 작성을 막는 방향을 검토한다.

### 공개 요청과 내부 요청

- 공개 요청은 공개 프로젝트 페이지에 노출 가능하다.
- 내부 요청은 Builder 내부 검토용이다.

## 3. Feedback 정책

### 생성 정책

- Feedback은 반드시 Feedback Request를 통해 생성된다.
- 비로그인 Feedback은 1차에서 허용하지 않는다.
- 로그인 사용자는 공개 Feedback Request에 Feedback을 작성할 수 있다.

### 읽기 정책

- Feedback 작성자는 자신의 Feedback을 읽을 수 있다.
- Project Owner는 자신의 Project에 달린 Feedback을 읽고 검토할 수 있다.
- Feedback 내용은 기본적으로 Builder 내부 검토용이다.
- Builder가 공개 선택한 Feedback만 공개 페이지에 노출될 수 있다.

### 수정 정책

- Feedback 작성자의 제출 후 수정 가능 여부는 추가 검토 필요다.
- Project Owner는 Feedback 내용 자체를 임의 수정하지 않는 방향이 안전하다.
- Project Owner는 검토 상태와 공개 선택 여부를 변경할 수 있다.

### 삭제 또는 보관 정책

- Feedback 작성자는 철회 후보를 가질 수 있다.
- Project Owner는 악성 Feedback을 보관/숨김 처리 후보로 둘 수 있다.
- 관리자 후보의 운영 대응은 후순위다.

### Builder 검토 상태 후보

- 새 피드백
- 검토 중
- 반영됨
- 반영하지 않음

### Feedback 공개 상태 후보

- 내부 검토
- 공개 선택됨

## 4. Feedback 작성자 공개 정보

공개 선택된 Feedback이라도 작성자의 정보는 제한적으로만 노출한다.

- 공개 표시명 후보
- 역할 또는 간단한 맥락 후보
- 이메일과 인증 ID는 노출하지 않음

## 5. Feedback이 Change Card로 이어지는 흐름

Feedback이 반영되면 새 Change Card 생성 후보로 이어질 수 있다.

```text
Feedback Request
→ Feedback
→ Builder 검토
→ 반영 또는 반영하지 않음
→ 새 Change Card 후보
```

## 6. 반드시 지켜야 할 원칙

- 일반 댓글창을 만들지 않는다.
- Feedback Request는 공개될 수 있지만 Feedback 내용은 기본 공개가 아니다.
- Feedback은 1차에서 로그인 사용자 기반으로만 생성한다.
- Feedback은 Project 또는 Change Card에 연결된 요청을 통해 생성한다.

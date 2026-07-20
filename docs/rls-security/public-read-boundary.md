# Public Read Boundary

## 1. 공개 읽기에서 원천 테이블 row 전체 노출이 위험한 이유

RLS는 행 단위 접근 제어를 담당한다. 행 접근이 허용되면 해당 row의 컬럼이 함께 조회될 수 있다. 따라서 공개 페이지에서 원천 테이블을 직접 select하면 공개하면 안 되는 컬럼이 함께 노출될 위험이 있다.

BuildMap은 공개 페이지와 공개 Timeline에서 다음 원칙을 따른다.

- 공개 읽기는 원천 row 전체 노출이 아니라 public-safe 응답을 우선한다.
- 공개 응답에는 필요한 최소 정보만 포함한다.
- 내부 식별자, 인증 정보, 원문 기록, 민감 상태는 공개하지 않는다.

## 2. RLS와 컬럼 노출의 차이

| 구분 | 역할 |
|---|---|
| RLS | 어떤 row를 읽을 수 있는지 제한 |
| public-safe view/RPC/API | 어떤 컬럼과 조합된 응답을 보여줄지 제한 |

RLS에서 row select가 허용되어도 API나 view에서 컬럼을 제한하지 않으면 민감 컬럼이 노출될 수 있다.

## 3. 공개 Project에서 노출 가능한 필드 후보

- 프로젝트명
- 한 줄 정의
- 현재 진행 상태
- 공개 상태가 허용하는 범위의 공개 정보
- 현재 필요한 것 요약
- 공개 가능한 관련 링크
- 공개 가능한 Builder 표시 정보
- 공개 Timeline 요약

## 4. 공개 Project에서 노출하지 않을 필드 후보

- owner 내부 user id
- owner auth id
- 이메일
- share_token 원문
- share_token hash
- 내부 공개 검토 상태
- 내부 메모
- 비공개 상태 전환 관련 내부 사유

## 5. 공개 Change Card에서 노출 가능한 필드 후보

조건: Project 공개 정책을 만족하고, Change Card가 승인됨 + 공개됨 + 민감도 일반일 때만 후보가 된다.

- 유형
- 제목
- 구조화 요약
- 근거 중 공개 가능한 범위
- 판단 중 공개 가능한 범위
- 변경 내용 중 공개 가능한 범위
- 다음 확인 사항 중 공개 가능한 범위
- 승인 시점 또는 공개 시점 후보
- 중요도 후보

## 6. 공개 Change Card에서 노출하지 않을 필드 후보

- 내부 전용 Change Card
- 공개 가능 상태이지만 아직 공개됨이 아닌 Change Card
- 민감 정보 포함 Change Card
- 원문 Rough Note 참조
- AI Draft 본문
- 내부 검토 코멘트
- 작성자 내부 user id
- 승인자 내부 user id
- 내부 연결 정보 중 공개 필요가 없는 것

## 7. 공개 Feedback에서 노출 가능한 필드 후보

조건: Builder가 공개 선택한 Feedback만 후보가 된다.

- Feedback 요약 또는 본문 중 공개 선택된 내용
- Feedback 유형
- 작성자 표시 방식: 익명 또는 역할/맥락 표시 우선
- 반영 여부 중 공개 가능한 범위

## 8. 공개 Feedback에서 노출하지 않을 필드 후보

- 이메일
- auth ID
- 내부 user ID
- `author_user_profile_id`
- 내부 검토 상태 세부값
- 비공개 Feedback 본문
- 작성자 내부 프로필 상세
- 신고/운영 검토 상태 후보

## 9. Builder 공개 Profile에서 노출 가능한 필드 후보

- 공개 표시명
- 공개 소개
- 역할 태그
- 공개 관심 분야
- 공개로 설정한 프로젝트 목록

## 10. Builder 공개 Profile에서 노출하지 않을 필드 후보

- 이메일
- auth ID
- 내부 user ID
- 계정 상태
- 약관 동의 기록
- 내부 운영 메모

## 11. Project Link 공개 노출 범위

Project Link는 1차 선택 데이터이며 공개 페이지에서 노출될 수 있다. 단, 다음을 구분한다.

- 공개 가능한 demo/GitHub/Figma/Notion 링크
- 내부 문서 링크
- 협업자 전용 링크
- 민감한 운영 도구 링크

내부 또는 협업자 전용 링크는 공개 응답에서 제외해야 한다.

## 12. Public Project Page 조합 경계

Public Project Page는 다음 원천에서 public-safe 응답으로 조합한다.

- Project 공개 정보
- Builder 공개 Profile
- 공개 가능한 Problem/Hypothesis
- 공개 Change Card
- 공개 Feedback Request
- 공개 선택 Feedback
- Project Link 후보

## 13. Decision Timeline 조합 경계

공개 Decision Timeline은 `change_cards` 원천에서 파생되지만, 원천 row 전체를 그대로 공개하지 않는다.

노출 조건은 다음이다.

- Project 공개 정책 만족
- Change Card 작업 상태 승인됨
- Change Card 공개 상태 공개됨
- Change Card 민감도 일반

## 14. 공개 응답에 노출하지 않을 후보 전체 목록

- 이메일
- auth ID
- 내부 user ID
- `author_user_profile_id`
- `owner_user_profile_id`
- `share_token` 원문
- `share_token` hash
- 내부 검토 상태
- 내부 메모
- Rough Note 원문
- AI Draft 본문
- 내부 전용 Change Card
- 공개 가능 상태이지만 공개됨이 아닌 Change Card
- 민감 정보 포함 Change Card
- 내부 검토 Feedback
- Feedback 작성자 내부 식별자

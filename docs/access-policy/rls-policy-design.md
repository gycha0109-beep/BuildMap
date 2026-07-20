# RLS 정책 설계 초안

> 본 문서는 BuildMap 7단계 문서다. 7단계는 실제 RLS SQL 작성 단계가 아니라, SQL 작성 전 권한/공개/접근 정책을 자연어로 고정하는 단계다. `docs/decisions/phase6-5-db-schema-corrections.md`를 최우선 기준으로 삼는다.

## 1. 문서 목적

이 문서는 실제 RLS SQL을 작성하기 전 자연어 기반 정책 설계를 정리한다. SQL 문법, 정책 생성문, 조건식은 작성하지 않는다.

## 2. RLS 설계의 목적

RLS 설계의 목적은 다음이다.

- 내부 기록과 공개 기록을 명확히 분리한다.
- Project 공개 상태와 Change Card 공개 상태를 함께 고려한다.
- Rough Note와 AI Draft가 외부에 노출되지 않도록 한다.
- Feedback Request와 Feedback의 공개 정책을 분리한다.
- 링크 공개와 전체 공개를 구분한다.
- user profile과 Builder Profile의 공개 정보를 분리한다.

## 3. Project 정책 그룹

### Policy ID: PROJECT_READ_PRIVATE_01

- 대상: Project
- 행위: read
- 정책 설명: 비공개 Project는 Project Owner만 읽을 수 있다.
- 허용되는 경우: 접근자가 해당 Project의 Owner Builder다.
- 차단되는 경우: 비로그인 방문자, 일반 로그인 사용자, Scout 성격 사용자, 링크 식별자가 없는 사용자.
- 관련 상태: Project 공개 상태 = 비공개
- 관련 문서: `project-access-policy.md`, `visibility-model.md`

### Policy ID: PROJECT_READ_LINK_01

- 대상: Project
- 행위: read
- 정책 설명: 링크 공개 Project는 유효한 링크 접근 식별자를 가진 접근자에게 공개 가능한 정보만 노출한다.
- 허용되는 경우: Project가 링크 공개 상태이고 접근자가 유효한 share_token 성격의 조건을 만족한다.
- 차단되는 경우: Project가 비공개로 전환됨, share_token이 폐기됨, 접근 식별자가 유효하지 않음.
- 관련 상태: Project 공개 상태 = 링크 공개
- 관련 문서: `link-sharing-policy.md`

### Policy ID: PROJECT_READ_PUBLIC_01

- 대상: Project
- 행위: read
- 정책 설명: 전체 공개 Project는 누구나 공개 가능한 정보만 읽을 수 있다.
- 허용되는 경우: Project가 전체 공개 상태다.
- 차단되는 경우: 내부 전용 기록 접근, 인증 식별자 접근, 비공개 정보 접근.
- 관련 상태: Project 공개 상태 = 전체 공개
- 관련 문서: `public-project-page-access-policy.md`

### Policy ID: PROJECT_CREATE_01

- 대상: Project
- 행위: create
- 정책 설명: 로그인 Builder는 Project를 생성할 수 있다.
- 허용되는 경우: 로그인 사용자이며 Builder Profile이 있거나 생성 가능한 상태다.
- 차단되는 경우: 비로그인 사용자.
- 관련 문서: `auth-model.md`, `role-and-ownership-policy.md`

### Policy ID: PROJECT_UPDATE_OWNER_01

- 대상: Project
- 행위: update
- 정책 설명: Project Owner만 자신의 Project를 수정할 수 있다.
- 허용되는 경우: 접근자가 Project Owner다.
- 차단되는 경우: 다른 로그인 사용자, Scout 성격 사용자, 비로그인 방문자.
- 관련 문서: `project-access-policy.md`

### Policy ID: PROJECT_VISIBILITY_CHANGE_OWNER_01

- 대상: Project
- 행위: visibility change
- 정책 설명: Project 공개 상태 변경은 Project Owner만 수행한다.
- 허용되는 경우: 접근자가 Project Owner다.
- 차단되는 경우: Project Owner가 아닌 사용자.
- 관련 상태: 비공개, 링크 공개, 전체 공개
- 관련 문서: `visibility-model.md`, `project-access-policy.md`

## 4. Change Card 정책 그룹

### Policy ID: CHANGE_CARD_READ_INTERNAL_01

- 대상: Change Card
- 행위: read
- 정책 설명: 내부 Change Card는 Project Owner 또는 작성 Builder만 읽는다.
- 허용되는 경우: 접근자가 Project Owner 또는 작성 Builder다.
- 차단되는 경우: 외부 방문자, Scout 성격 사용자, 비로그인 방문자.
- 관련 상태: 작업 상태 전체, 공개 상태 내부 전용 또는 공개 가능 포함
- 관련 문서: `change-card-access-policy.md`

### Policy ID: CHANGE_CARD_READ_PUBLIC_01

- 대상: Change Card
- 행위: read
- 정책 설명: 공개 Timeline에는 승인됨 + 공개됨 + 민감 정보 없음 조건을 만족하는 Change Card만 노출한다.
- 허용되는 경우: Project가 링크 공개 또는 전체 공개이고, Change Card 작업 상태가 승인됨이며, 공개 상태가 공개됨이고, 민감도가 일반이며, 접근자가 Project 공개 정책을 만족한다.
- 차단되는 경우: Project 비공개, Change Card 미승인, 공개 가능 상태, 내부 전용 상태, 민감 정보 포함 상태.
- 관련 상태: Project 공개 상태, Change Card 작업 상태, Change Card 공개 상태, 민감도
- 관련 문서: `visibility-model.md`, `change-card-access-policy.md`

### Policy ID: CHANGE_CARD_CREATE_01

- 대상: Change Card
- 행위: create
- 정책 설명: Project Owner 또는 해당 Project의 작성 권한이 있는 Builder만 Change Card를 생성한다.
- 허용되는 경우: 접근자가 Project Owner 또는 허용된 Builder다.
- 차단되는 경우: 비로그인 사용자, 일반 로그인 사용자, Scout 성격 사용자.
- 관련 문서: `role-and-ownership-policy.md`

### Policy ID: CHANGE_CARD_UPDATE_DRAFT_01

- 대상: Change Card
- 행위: update
- 정책 설명: 승인 전 Change Card는 Project Owner 또는 작성 Builder가 수정할 수 있다.
- 허용되는 경우: 접근자가 Project Owner 또는 작성 Builder이고 Change Card가 승인 전 상태다.
- 차단되는 경우: 승인 후 무제한 수정, 외부 사용자 수정.
- 관련 상태: 작업 상태
- 관련 문서: `change-card-access-policy.md`

### Policy ID: CHANGE_CARD_APPROVE_01

- 대상: Change Card
- 행위: approve
- 정책 설명: Change Card 승인은 Project Owner 또는 승인 권한이 있는 Builder만 수행한다.
- 허용되는 경우: 접근자가 Project Owner 또는 승인 Builder 후보에 해당한다.
- 차단되는 경우: 일반 로그인 사용자, Feedback 작성자, Scout 성격 사용자.
- 관련 문서: `role-and-ownership-policy.md`

### Policy ID: CHANGE_CARD_PUBLISH_01

- 대상: Change Card
- 행위: publish
- 정책 설명: Change Card 공개 상태 변경은 Project Owner가 수행하며, 민감 정보 포함 카드에는 공개 전 재검토가 필요하다.
- 허용되는 경우: 접근자가 Project Owner이고 카드가 공개 가능한 상태이며 민감도 검토 조건을 만족한다.
- 차단되는 경우: 민감 정보 포함인데 재검토가 없는 경우, 미승인 카드 공개 시도.
- 관련 문서: `visibility-model.md`

## 5. Rough Note / AI Draft 정책 그룹

### Policy ID: ROUGH_NOTE_READ_INTERNAL_01

- 대상: Rough Note
- 행위: read
- 정책 설명: Rough Note는 내부 기록이며 Project Owner 또는 작성 Builder만 읽는다.
- 허용되는 경우: 접근자가 Project Owner 또는 작성 Builder다.
- 차단되는 경우: 외부 방문자, Scout 성격 사용자, 공개 페이지 접근자.
- 관련 문서: `rough-note-and-ai-draft-access-policy.md`

### Policy ID: ROUGH_NOTE_CREATE_01

- 대상: Rough Note
- 행위: create
- 정책 설명: Project Owner 또는 작성 권한이 있는 Builder가 Rough Note를 생성한다.
- 허용되는 경우: 접근자가 해당 Project의 Builder다.
- 차단되는 경우: 비로그인 사용자, 외부 사용자.

### Policy ID: ROUGH_NOTE_UPDATE_AFTER_CONVERSION_01

- 대상: Rough Note
- 행위: update
- 정책 설명: Change Card로 전환된 Rough Note는 수정 제한을 우선 검토한다.
- 허용되는 경우: 전환 전 작성 Builder 수정 후보.
- 차단되는 경우: 전환 후 자유 수정.
- 관련 문서: `phase6-5-db-schema-corrections.md`

### Policy ID: AI_DRAFT_READ_INTERNAL_01

- 대상: AI Structured Draft
- 행위: read
- 정책 설명: AI Draft는 공식 기록이 아니며 내부 사용자만 읽는다.
- 허용되는 경우: Project Owner 또는 작성 Builder.
- 차단되는 경우: 공개 페이지 접근자, 외부 방문자.

### Policy ID: AI_DRAFT_TO_CHANGE_CARD_01

- 대상: AI Structured Draft
- 행위: convert
- 정책 설명: AI Draft는 Builder 검토 후 Change Card 후보로 전환될 수 있다.
- 허용되는 경우: Project Owner 또는 작성 Builder가 전환한다.
- 차단되는 경우: AI Draft가 자동으로 공개 또는 Timeline 반영되는 경우.

## 6. Problem / Hypothesis 정책 그룹

### Policy ID: PROBLEM_HYPOTHESIS_READ_INTERNAL_01

- 대상: Problem Definition / Hypothesis
- 행위: read
- 정책 설명: 비공개 Project의 Problem/Hypothesis는 Project Owner만 읽는다.
- 허용되는 경우: Project Owner.
- 차단되는 경우: 외부 접근자.

### Policy ID: PROBLEM_HYPOTHESIS_READ_PUBLIC_01

- 대상: Problem Definition / Hypothesis
- 행위: read
- 정책 설명: 공개 Project에서는 공개 가능한 현재값만 노출한다.
- 허용되는 경우: Project 공개 정책을 만족하고 Builder가 공개 가능한 현재값으로 둔 경우.
- 차단되는 경우: 비공개 Project, 민감한 내부값, 이력 원천 직접 접근.

### Policy ID: PROBLEM_HYPOTHESIS_UPDATE_OWNER_01

- 대상: Problem Definition / Hypothesis
- 행위: update
- 정책 설명: Project Owner가 현재 문제 정의와 가설을 수정한다.
- 허용되는 경우: Project Owner.
- 차단되는 경우: 외부 사용자.
- 관련 문서: `problem-hypothesis-access-policy.md`

## 7. Feedback 정책 그룹

### Policy ID: FEEDBACK_REQUEST_READ_PUBLIC_01

- 대상: Feedback Request
- 행위: read
- 정책 설명: 공개 Feedback Request는 Project 공개 정책을 만족하는 접근자에게 노출될 수 있다.
- 허용되는 경우: 공개 요청이며 Project 공개 조건을 만족한다.
- 차단되는 경우: 내부 요청, 비공개 Project.

### Policy ID: FEEDBACK_REQUEST_CREATE_OWNER_01

- 대상: Feedback Request
- 행위: create
- 정책 설명: Project Owner가 Feedback Request를 생성한다.
- 허용되는 경우: Project Owner.
- 차단되는 경우: 일반 방문자, Scout 성격 사용자.

### Policy ID: FEEDBACK_CREATE_LOGIN_01

- 대상: Feedback
- 행위: create
- 정책 설명: 로그인 사용자는 공개 Feedback Request에 Feedback을 작성할 수 있다.
- 허용되는 경우: 로그인 사용자이며 대상 Feedback Request가 공개 작성 가능한 상태다.
- 차단되는 경우: 비로그인 사용자, 종료된 요청, 접근 불가능한 Project의 요청.

### Policy ID: FEEDBACK_READ_INTERNAL_OWNER_01

- 대상: Feedback
- 행위: read
- 정책 설명: Feedback 내용은 기본 내부 검토용이며 Project Owner가 읽는다.
- 허용되는 경우: Project Owner 또는 Feedback 작성자 자기 Feedback.
- 차단되는 경우: 일반 공개 방문자.

### Policy ID: FEEDBACK_PUBLISH_SELECTED_01

- 대상: Feedback
- 행위: publish
- 정책 설명: Builder가 선택한 Feedback만 공개 가능하다.
- 허용되는 경우: Project Owner가 공개 선택하고 작성자 표시 정보 제한 조건을 만족한다.
- 차단되는 경우: 내부 검토 Feedback, 개인정보 과다 노출.

## 8. Profile 정책 그룹

### Policy ID: USER_PROFILE_READ_SELF_01

- 대상: user profile 후보
- 행위: read
- 정책 설명: 로그인 사용자는 자신의 user profile을 읽을 수 있다.
- 허용되는 경우: 자기 계정.
- 차단되는 경우: 타인의 비공개 계정 정보 접근.

### Policy ID: USER_PROFILE_UPDATE_SELF_01

- 대상: user profile 후보
- 행위: update
- 정책 설명: 사용자는 자신의 표시 정보를 수정할 수 있다.
- 허용되는 경우: 자기 계정.
- 차단되는 경우: 인증 ID, 이메일 등 내부 정보 임의 수정.

### Policy ID: BUILDER_PROFILE_READ_PUBLIC_01

- 대상: Builder Profile
- 행위: read
- 정책 설명: 공개 프로젝트 페이지에서는 Builder 공개 정보만 노출한다.
- 허용되는 경우: 공개로 설정된 Builder 정보.
- 차단되는 경우: 이메일, 인증 ID, 내부 상태.

## 9. Link Sharing 정책 그룹

### Policy ID: LINK_SHARE_READ_01

- 대상: Public Project Page 표현
- 행위: read
- 정책 설명: 링크 공개 Project는 유효한 share_token 성격 조건을 만족한 접근자에게 공개 정보를 보여준다.
- 허용되는 경우: Project가 링크 공개 상태이며 접근 식별자가 유효하다.
- 차단되는 경우: Project가 비공개, token 폐기, token 불일치.

### Policy ID: LINK_SHARE_REVOKE_01

- 대상: Project 공개 접근 식별자 후보
- 행위: revoke
- 정책 설명: Project Owner는 share_token 성격 식별자를 재발급하거나 폐기할 수 있어야 한다.
- 허용되는 경우: Project Owner.
- 차단되는 경우: 외부 사용자.

## 10. 공개 페이지 파생 데이터 접근 정책

Public Project Page, Decision Timeline, Project Card Grid는 원천 데이터의 공개 정책을 통과한 결과만 보여준다. 파생 표현이 원천 데이터보다 더 넓은 접근 권한을 가져서는 안 된다.

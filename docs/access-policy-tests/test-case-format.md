# 테스트 케이스 표준 형식

## 1. 왜 테스트 케이스 형식이 필요한가

7단계 정책 문서는 자연어로 권한 기준을 정의했다. 그러나 실제 RLS SQL 작성 시에는 “비슷해 보이지만 다른 상태”가 쉽게 섞일 수 있다.

예를 들어 `공개 가능`은 `공개됨`이 아니며, `public_slug`는 보안 토큰이 아니다. 이런 차이를 SQL 작성 전에 시나리오로 검증하려면 동일한 형식의 테스트 케이스가 필요하다.

## 2. 공통 필드 정의

| 필드 | 의미 |
|---|---|
| Test Case ID | 문서 내 고유 식별자. 예: `CC-PUBLIC-001` |
| 목적 | 이 테스트가 검증하려는 정책 |
| 행위자 | 비로그인 방문자, 로그인 사용자, Project Owner 등 |
| 사전 조건 | Project 공개 상태, share_token 유효성, 로그인 여부 등 |
| 대상 객체 | Project, Change Card, Feedback 등 |
| 대상 객체 상태 | 작업 상태, 공개 상태, 민감도, 검토 상태 등 |
| 수행 행위 | read, create, update, approve, publish, visibility change 등 |
| 기대 결과 | 허용 / 차단 / 조건부 허용 / 추가 검토 필요 |
| 기대 결과의 이유 | 정책 근거 |
| 관련 정책 문서 | 7단계 access-policy 문서 또는 6.5/7단계 결정 문서 |
| 잘못 구현될 경우의 위험 | 정보 노출, 권한 상승, 정책 불일치 등 |
| 1차 포함 여부 | 1차 RLS 정책에서 반드시 검증할지 여부 |
| 후순위 여부 | 팀 권한, 관리자 권한 등 후순위 항목 여부 |

## 3. 기대 결과 값 정의

| 값 | 의미 |
|---|---|
| 허용 | 1차 정책에서 허용해야 한다. |
| 차단 | 1차 정책에서 차단해야 한다. |
| 조건부 허용 | 특정 상태나 식별자 조건을 만족할 때만 허용한다. |
| 추가 검토 필요 | 정책 또는 스키마 확정 전까지 판단을 보류한다. |

## 4. 1차 정책과 후순위 정책 구분

1차 정책은 BuildMap의 핵심 판단 흐름 기록을 보호하는 데 필요한 최소 정책이다.

1차에 포함한다.

- Project Owner 중심 권한
- 비로그인 쓰기 차단
- Rough Note / AI Draft 비공개
- 공개 Timeline 조건 검증
- 링크 공개 `share_token` 검증
- Feedback Request 기반 Feedback 생성

후순위로 둔다.

- 관리자 권한
- 팀/공동 편집
- 조직 권한
- 비로그인 피드백
- 채용/헤드헌팅 권한
- Save / Follow
- Activity Signal
- Decision Diff Snapshot

## 5. 정책 문서 참조 방식

테스트 케이스의 관련 문서에는 다음 문서를 우선 참조한다.

- `docs/decisions/phase6-5-db-schema-corrections.md`
- `docs/decisions/phase7-auth-visibility-access-policy-scope.md`
- `docs/access-policy/project-access-policy.md`
- `docs/access-policy/change-card-access-policy.md`
- `docs/access-policy/link-sharing-policy.md`
- `docs/access-policy/feedback-access-policy.md`
- `docs/access-policy/public-project-page-access-policy.md`

## 6. RLS SQL 작성 시 사용 방식

RLS SQL 작성 전, 각 정책은 대응 테스트 케이스를 가져야 한다.

- 허용 케이스 없이 차단 정책만 만들지 않는다.
- 차단 케이스 없이 허용 정책만 만들지 않는다.
- Project 공개 상태와 Change Card 공개 상태를 분리해서 검증한다.
- 파생 뷰는 원천 데이터 접근 정책을 초과하지 않는지 검증한다.

## 7. 나쁜 테스트 케이스 예시

```text
비로그인 사용자가 공개 데이터를 읽는다. 허용.
```

문제점:

- 어떤 공개 데이터인지 모호하다.
- Project 공개 상태가 없다.
- Change Card 작업 상태, 공개 상태, 민감도가 없다.
- 링크 공개인지 전체 공개인지 모호하다.

## 8. 좋은 테스트 케이스 예시

Test Case ID: `CC-PUBLIC-001`

| 항목 | 내용 |
|---|---|
| 목적 | 공개 Timeline에서 승인되지 않은 Change Card가 노출되지 않는지 확인한다. |
| 행위자 | 비로그인 방문자 |
| 사전 조건 | Project는 전체 공개 상태다. |
| 대상 객체 | Change Card |
| 대상 객체 상태 | 작업 상태 초안, 공개 상태 공개됨, 민감도 일반 |
| 수행 행위 | 공개 Project Page에서 Change Card를 읽는다. |
| 기대 결과 | 차단 |
| 이유 | Change Card는 공개 상태가 공개됨이어도 작업 상태가 승인됨이 아니면 공개 Timeline에 노출되지 않는다. |
| 관련 정책 문서 | `docs/access-policy/change-card-access-policy.md` |
| 잘못 구현될 경우의 위험 | 검토되지 않은 초안이 외부에 노출된다. |
| 1차 포함 여부 | 포함 |
| 후순위 여부 | 아님 |

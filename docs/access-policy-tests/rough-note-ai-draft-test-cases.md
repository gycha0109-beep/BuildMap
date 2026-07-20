# Rough Note / AI Draft 테스트 케이스

## 1. 문서 목적

Rough Note와 AI Structured Draft가 내부 기록으로 보호되는지 검증한다.

## 2. 공통 전제

- 이 문서의 테스트 케이스는 실제 자동화 테스트 코드가 아니다.
- SQL, CREATE POLICY, API 테스트 코드는 작성하지 않는다.
- 기대 결과는 `허용`, `차단`, `조건부 허용`, `추가 검토 필요` 중 하나로 쓴다.
- 1차 정책은 권한을 넓히기보다 안전하게 좁히는 방향을 우선한다.

## 3. 관련 정책 문서

- `docs/access-policy/rough-note-and-ai-draft-access-policy.md`
- `docs/decisions/phase6-5-db-schema-corrections.md`

## 4. 테스트 케이스

| ID | 목적 | 행위자 | 사전 조건 / 대상 상태 | 수행 행위 | 기대 | 이유 | 1차 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| RNAI-RN-001 | Owner가 Rough Note 생성 | Project Owner Builder | 소유 Project | Rough Note create | 허용 | Owner는 내부 원문 기록을 남길 수 있다. | 포함 |
| RNAI-RN-002 | Owner가 자신의 Rough Note 읽기 | Project Owner Builder | 소유 Project, Rough Note 내부 | Rough Note read | 허용 | Rough Note는 Owner 내부 기록이다. | 포함 |
| RNAI-RN-003 | 다른 로그인 사용자의 Rough Note 접근 차단 | 로그인 사용자 | Owner 아님 | Rough Note read | 차단 | 내부 원문 기록은 외부 사용자에게 노출하지 않는다. | 포함 |
| RNAI-RN-004 | 비로그인 방문자의 Rough Note 접근 차단 | 비로그인 방문자 | Project 공개 여부 무관 | Rough Note read | 차단 | Rough Note는 모든 공개 정책에서 제외된다. | 포함 |
| RNAI-RN-005 | Scout 성격 사용자의 Rough Note 접근 차단 | Scout 성격의 로그인 사용자 | 공개 Project 탐색 중 | Rough Note read | 차단 | Scout는 공개 기록만 본다. | 포함 |
| RNAI-RN-006 | 전체 공개 Project에서도 Rough Note 비노출 | 비로그인 방문자 | Project 전체 공개 | Public Page에서 Rough Note 확인 | 차단 | Project 공개 상태가 Rough Note 공개를 의미하지 않는다. | 포함 |
| RNAI-AI-001 | Owner가 Rough Note로 AI Draft 생성 | Project Owner Builder | 소유 Project, Rough Note 존재 | AI Draft create | 허용 | AI 구조화는 Builder 내부 보조 흐름이다. | 포함 |
| RNAI-AI-002 | Owner가 AI Draft 읽기 | Project Owner Builder | AI Draft 생성됨 | AI Draft read | 허용 | 초안 검토는 Owner 내부 작업이다. | 포함 |
| RNAI-AI-003 | 다른 로그인 사용자의 AI Draft 접근 차단 | 로그인 사용자 | Owner 아님 | AI Draft read | 차단 | AI Draft는 공식 기록이 아니다. | 포함 |
| RNAI-AI-004 | 비로그인 방문자의 AI Draft 접근 차단 | 비로그인 방문자 | Project 공개 여부 무관 | AI Draft read | 차단 | AI Draft는 공개 정책에서 완전히 제외된다. | 포함 |
| RNAI-AI-005 | 전환 전 AI Draft의 Timeline 노출 차단 | 비로그인 방문자 | AI Draft 생성됨, Change Card 미전환 | Decision Timeline read | 차단 | AI Draft는 공식 Timeline 원천이 아니다. | 포함 |
| RNAI-AI-006 | 전환 후 AI Draft 자체 공개 페이지 노출 차단 | 비로그인 방문자 | AI Draft가 Change Card로 전환됨 | Public Page에서 AI Draft read | 차단 | 공개되는 것은 승인된 Change Card이지 AI Draft 자체가 아니다. | 포함 |
| RNAI-RN-007 | 전환된 Rough Note 수정 제한 | Project Owner Builder | Rough Note가 Change Card로 전환됨 | Rough Note update | 조건부 허용 | 1차에서는 수정 제한을 우선 검토한다. | 포함 |
| RNAI-RN-008 | 전환 전 Rough Note 수정 허용 | Project Owner Builder | Rough Note 미전환 | Rough Note update | 허용 | 공식 근거가 되기 전의 내부 메모는 수정 가능하다. | 포함 |
| RNAI-AI-007 | AI Draft 실패 시 Rough Note 보존 | Project Owner Builder | AI Draft 실패 | Rough Note read | 허용 | AI 실패가 원문 기록 손실로 이어지면 안 된다. | 포함 |

## 5. 잘못 구현될 경우의 공통 위험

- 내부 기록이 공개 페이지나 공개 Timeline에 노출될 수 있다.
- Project Owner가 아닌 사용자가 수정/승인/공개 권한을 가질 수 있다.
- 링크 공개와 전체 공개가 섞여 share token 없이 접근될 수 있다.
- 공개 가능 상태가 공개됨으로 오해될 수 있다.
- 비로그인 사용자에게 쓰기 권한이 열릴 수 있다.


## 6. 핵심 원칙

- Rough Note와 AI Draft는 공개 정책에서 완전히 제외된다.
- AI Draft는 공식 기록이 아니다.
- Change Card로 전환된 Rough Note는 수정 제한을 우선 검토한다.

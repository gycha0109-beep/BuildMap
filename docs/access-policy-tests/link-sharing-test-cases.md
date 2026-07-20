# 링크 공개 테스트 케이스

## 1. 문서 목적

링크 공개 Project의 접근 조건, share_token 유효성, public_slug 오용 방지를 검증한다.

## 2. 공통 전제

- 이 문서의 테스트 케이스는 실제 자동화 테스트 코드가 아니다.
- SQL, CREATE POLICY, API 테스트 코드는 작성하지 않는다.
- 기대 결과는 `허용`, `차단`, `조건부 허용`, `추가 검토 필요` 중 하나로 쓴다.
- 1차 정책은 권한을 넓히기보다 안전하게 좁히는 방향을 우선한다.

## 3. 관련 정책 문서

- `docs/access-policy/link-sharing-policy.md`
- `docs/access-policy/public-project-page-access-policy.md`
- `docs/decisions/phase6-5-db-schema-corrections.md`

## 4. 테스트 케이스

| ID | 목적 | 행위자 | 사전 조건 / 대상 상태 | 수행 행위 | 기대 | 이유 | 1차 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| LINK-001 | share_token 없이 링크 공개 Project 접근 차단 | 비로그인 방문자 | Project 링크 공개, token 없음 | Public Project Page read | 차단 | 링크 공개는 유효한 share_token 조건이 필요하다. | 포함 |
| LINK-002 | 유효한 share_token으로 링크 공개 Project 접근 허용 | 비로그인 방문자 | Project 링크 공개, token 유효 | 공개 정보 read | 조건부 허용 | 유효한 token이 있으면 공개 가능한 정보만 읽는다. | 포함 |
| LINK-003 | 로그인 사용자의 유효 token 접근 허용 | 로그인 사용자 | Project 링크 공개, token 유효 | 공개 정보 read | 조건부 허용 | 로그인 사용자도 token 조건을 만족해야 한다. | 포함 |
| LINK-004 | 잘못된 share_token 접근 차단 | 비로그인 방문자 | Project 링크 공개, token 잘못됨 | Public Project Page read | 차단 | 잘못된 token은 접근 조건을 만족하지 않는다. | 포함 |
| LINK-005 | 폐기된 share_token 접근 차단 | 비로그인 방문자 | Project 링크 공개, token 폐기됨 | Public Project Page read | 차단 | 폐기된 token은 무효다. | 포함 |
| LINK-006 | 비공개 전환 뒤 기존 share_token 접근 차단 | 비로그인 방문자 | Project 링크 공개→비공개, 기존 token 보유 | Public Project Page read | 차단 | Project가 비공개이면 token 접근도 차단한다. | 포함 |
| LINK-007 | 전체 공개 전환 뒤 public_slug 접근 허용 | 비로그인 방문자 | Project 링크 공개→전체 공개, public_slug 존재 | Public Project Page read | 허용 | 전체 공개는 public_slug 기반 공개 접근이 가능하다. | 포함 |
| LINK-008 | 전체 공개→링크 공개 뒤 public_slug만으로 접근 차단 | 비로그인 방문자 | Project 링크 공개, public_slug만 보유 | Public Project Page read | 차단 | public_slug는 보안 토큰이 아니며 링크 공개 접근 조건이 아니다. | 포함 |
| LINK-009 | 링크 공개 Project에 public_slug만 알고 접근 차단 | 비로그인 방문자 | Project 링크 공개, public_slug만 보유 | Public Project Page read | 차단 | 링크 공개에는 share_token 조건이 필요하다. | 포함 |
| LINK-010 | 비공개 Project에 share_token으로 접근 차단 | 비로그인 방문자 | Project 비공개, token 보유 | Public Project Page read | 차단 | 비공개 상태가 token보다 우선한다. | 포함 |
| LINK-011 | share_token 재발급 뒤 기존 token 접근 차단 | 비로그인 방문자 | Project 링크 공개, token 재발급 완료, 기존 token 사용 | Public Project Page read | 차단 | 재발급 시 기존 token은 무효화될 수 있어야 한다. | 포함 |
| LINK-012 | share_token 재발급 뒤 새 token 접근 허용 | 비로그인 방문자 | Project 링크 공개, 새 token 유효 | Public Project Page read | 조건부 허용 | 새 token이 현재 유효한 접근 식별자다. | 포함 |
| LINK-013 | 링크 공개 Project에서 공개 조건 미충족 Change Card 차단 | 비로그인 방문자 | 유효 token, Change Card 초안 또는 공개 가능 | Change Card read | 차단 | Project 접근이 허용되어도 Card 공개 조건이 별도 필요하다. | 포함 |
| LINK-014 | 링크 공개 Project에서 승인+공개+일반 Change Card 허용 | 비로그인 방문자 | 유효 token, Change Card 승인됨+공개됨+민감도 일반 | Change Card read | 조건부 허용 | Project와 Card 공개 조건을 모두 만족한다. | 포함 |
| LINK-015 | 링크 공개 Project의 공개 Feedback Request 읽기 | 비로그인 방문자 | 유효 token, Feedback Request 공개 요청 | Feedback Request read | 조건부 허용 | 공개 요청은 공개 페이지에서 노출 가능하다. | 포함 |
| LINK-016 | 링크 공개 Project의 내부 검토 Feedback 내용 차단 | 비로그인 방문자 | 유효 token, Feedback 내부 검토 | Feedback read | 차단 | Feedback 내용은 기본 내부 검토용이다. | 포함 |

## 5. 잘못 구현될 경우의 공통 위험

- 내부 기록이 공개 페이지나 공개 Timeline에 노출될 수 있다.
- Project Owner가 아닌 사용자가 수정/승인/공개 권한을 가질 수 있다.
- 링크 공개와 전체 공개가 섞여 share token 없이 접근될 수 있다.
- 공개 가능 상태가 공개됨으로 오해될 수 있다.
- 비로그인 사용자에게 쓰기 권한이 열릴 수 있다.


## 6. 링크 공개 핵심 원칙

- `public_slug`는 보안 토큰이 아니다.
- `share_token`은 링크 공개 접근을 위한 추측 어려운 식별자 후보다.
- Project가 비공개로 전환되면 기존 `share_token` 접근은 차단되어야 한다.
- 링크 공개는 전체 공개와 다르다.

# Project 접근 정책

> 본 문서는 BuildMap 7단계 문서다. 7단계는 실제 RLS SQL 작성 단계가 아니라, SQL 작성 전 권한/공개/접근 정책을 자연어로 고정하는 단계다. `docs/decisions/phase6-5-db-schema-corrections.md`를 최우선 기준으로 삼는다.

## 1. 문서 목적

이 문서는 Project 객체의 생성, 읽기, 수정, 공개 상태 변경, 링크 공개 접근 정책을 정리한다.

## 2. Project 생성 정책

### 1차 권장 정책

- 로그인 사용자는 Builder Profile을 가진 뒤 Project를 생성할 수 있다.
- Project 생성자는 기본적으로 Project Owner Builder가 된다.
- Project는 생성 직후 기본 비공개 상태로 시작한다.
- 프로젝트 생성은 완성작 등록이 아니라 판단 흐름을 시작하는 행위다.

## 3. Project 읽기 정책

### 비공개 Project

- Project Owner만 읽을 수 있다.
- 외부 방문자, Scout 성격 사용자, 비로그인 방문자는 읽을 수 없다.

### 링크 공개 Project

- 유효한 링크 공개 접근 식별자를 가진 방문자는 공개 가능한 정보만 읽을 수 있다.
- 내부 전용 기록, Rough Note, AI Draft, 내부 Feedback은 읽을 수 없다.

### 전체 공개 Project

- 누구나 공개 가능한 정보만 읽을 수 있다.
- 전체 공개라도 내부 기록은 공개되지 않는다.

## 4. Project 수정 정책

- Project Owner는 Project의 기본 정보를 수정할 수 있다.
- Project 이름, 한 줄 정의, 현재 필요한 것 요약, 관련 링크 후보 등은 Project Owner가 관리한다.
- 다른 로그인 사용자는 Project 자체 정보를 수정할 수 없다.
- 팀/공동 편집 권한은 후순위다.

## 5. Project 삭제 또는 보관 정책

1차에서는 물리 삭제보다 보관 또는 비공개 전환을 우선 검토한다.

- Project Owner는 Project를 보관하거나 비공개로 전환할 수 있다.
- 삭제 정책은 연결된 Change Card, Feedback, Rough Note 보존 문제와 함께 추가 검토가 필요하다.

## 6. Project 공개 상태 변경 정책

- Project 공개 상태 변경은 Project Owner만 할 수 있다.
- `비공개`, `링크 공개`, `전체 공개`는 서로 다른 접근 정책이다.
- Project가 비공개로 전환되면 기존 링크 공개 접근은 차단되어야 한다.
- Project가 전체 공개로 전환되어도 내부 전용 Change Card, Rough Note, AI Draft, 내부 Feedback은 공개되지 않는다.

## 7. Project 진행 상태 변경 정책

- Project 진행 상태 변경은 Project Owner만 할 수 있다.
- 진행 상태 후보는 `아이디어`, `제작 중`, `테스트 중`, `베타`, `운영 중`, `일시 중단`, `종료됨`이다.
- 중요한 진행 상태 변경은 Change Card 생성을 유도한다.
- 모든 상태 변경에 Change Card 생성을 강제하지는 않는다.

## 8. 현재 필요한 것 수정 정책

- Project Owner는 Project의 현재 필요한 것 요약을 수정할 수 있다.
- 현재 필요한 것은 외부에 보여주는 요약 상태다.
- 구체적인 피드백/테스터/검증 요청은 Feedback Request에서 다룬다.

## 9. Project Link 정책 후보

- Project Link는 1차 선택 데이터다.
- Project Owner만 링크를 추가/수정/삭제할 수 있다.
- 데모, GitHub, Figma, Notion 등은 자동 연동이 아니라 단순 링크 저장으로 둔다.
- 외부 링크 공개 여부는 Project 공개 상태와 별도 검토가 필요하다.

## 10. public_slug 후보 정책

- public_slug는 전체 공개용 읽기 쉬운 경로 후보다.
- public_slug는 보안 토큰이 아니다.
- 추측 가능한 public_slug만으로 링크 공개 접근 권한을 부여하지 않는다.
- 중복, 변경, 폐기 정책은 추가 검토 필요다.

## 11. share_token 후보 정책

- share_token은 링크 공개 상태에서만 유효하게 해석한다.
- Project가 비공개로 전환되면 기존 share_token 접근은 차단되어야 한다.
- share_token은 재발급 가능해야 한다.
- share_token 재발급 시 기존 링크는 무효화될 수 있다.
- share_token은 public_slug와 다른 목적이다.
- public_slug는 보안 토큰으로 사용하지 않는다.

## 12. updated_at과 last_activity_at 정책 후보

- `updated_at` 성격 값은 Project 자체 정보가 수정된 시점을 의미한다.
- `last_activity_at` 성격 값은 탐색 정렬과 최근 활동 표시를 위한 후보 값이다.
- Change Card 승인, Feedback Request 생성, 공개 업데이트 등은 last_activity_at 후보에 영향을 줄 수 있다.
- 1차에서 저장할지 파생할지는 migration 직전 결정한다.
- Activity Signal 복잡화는 피한다.

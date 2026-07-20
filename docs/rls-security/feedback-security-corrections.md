# Feedback Security Corrections

## 1. 기본 원칙

Feedback은 일반 댓글이 아니라 Feedback Request에 대한 판단 근거다. 1차에서는 반드시 Feedback Request를 통해 생성한다.

- 비로그인 Feedback은 차단한다.
- Feedback 작성 조건에는 Project 접근 조건이 포함되어야 한다.
- Feedback 내용은 기본 내부 검토용이다.
- Builder가 공개 선택한 Feedback만 공개 가능하다.
- 공개 Feedback에서도 이메일, auth ID, 내부 user ID, `author_user_profile_id`는 외부 응답에 노출하지 않는다.

## 2. Feedback 작성 조건

### 전체 공개 Project

로그인 사용자는 다음 조건을 만족할 때 Feedback을 작성할 수 있다.

- 대상 Feedback Request가 공개 요청 상태다.
- 대상 Project가 전체 공개 상태다.
- Feedback Request가 닫히거나 보관되지 않았다.
- 작성자는 로그인 사용자다.

### 링크 공개 Project

링크 공개 Project에서는 다음 조건이 모두 필요하다.

- 유효한 `share_token` 접근 조건
- 로그인 사용자
- 공개 Feedback Request
- Feedback Request가 닫히거나 보관되지 않음

### 비공개 Project

비공개 Project의 Feedback Request에는 외부 Feedback 작성이 불가하다. Project Owner 내부 요청으로만 사용할 수 있다.

## 3. Feedback Request 없이 Feedback 생성 차단

Feedback insert는 반드시 Feedback Request 참조를 가져야 한다. Project-level Feedback도 실제로는 Project에 연결된 Feedback Request의 한 유형으로 처리한다.

## 4. Feedback 작성자 위조 방지 조건

Feedback insert 시 다음 조건이 필요하다.

- `author_user_profile_id` 성격의 값은 현재 auth user와 연결된 user profile이어야 한다.
- 클라이언트가 임의의 작성자 profile id를 넣어 다른 사람으로 위장할 수 없어야 한다.
- 가능하면 작성자 정보는 서버/RLS/helper가 현재 인증 사용자로부터 결정하는 방향을 검토한다.

## 5. Feedback 읽기 정책 보정

| 행위자 | 읽기 가능 범위 |
|---|---|
| Feedback 작성자 | 자신의 Feedback |
| Project Owner | 자신의 Project에 달린 Feedback |
| 공개 방문자 | Builder가 공개 선택한 Feedback의 public-safe 응답만 |
| 다른 로그인 사용자 | 내부 검토 Feedback 읽기 차단 |
| 비로그인 방문자 | 내부 검토 Feedback 읽기 차단 |

## 6. Feedback 검토/공개 선택

- Project Owner만 Feedback 검토 상태를 변경할 수 있다.
- Project Owner만 Feedback 공개 선택을 할 수 있다.
- 공개 선택된 Feedback도 원천 row 전체를 직접 노출하지 않는다.

## 7. 작성자 표시 선택지 비교

| 선택지 | 장점 | 단점 | 1차 판단 |
|---|---|---|---|
| 익명 표시 | 개인정보 노출 최소화 | 맥락 부족 | 1차 권장 |
| 역할/맥락 표시 | 피드백 신뢰 맥락 제공 | 역할 정의 필요 | 1차 권장 후보 |
| 공개 표시명 표시 | 대화성 높음 | 동의/노출 위험 | 후순위 |
| 작성자 동의 후 표시명 | 사용자 통제 가능 | UX 필요 | 후순위 |

## 8. 1차 권장

- 익명 또는 역할/맥락 표시를 우선한다.
- 공개 표시명은 후순위 또는 동의 UX 이후로 둔다.
- 이메일/auth ID/내부 user ID/`author_user_profile_id`는 절대 공개 응답에 포함하지 않는다.

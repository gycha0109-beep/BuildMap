# DB 스키마 후보 관계

> 이 문서는 DB 스키마 초안 문서다. 실제 SQL, Supabase migration, RLS 정책, API, 프론트엔드 구현은 작성하지 않는다. 테이블명과 필드명은 후보이며 최종 확정이 아니다.

## 1. 관계 설계 원칙

BuildMap의 관계 설계는 Change Card 중심 구조를 유지해야 한다. 관계를 너무 강제하면 Builder의 기록 부담이 커지고, 너무 느슨하면 Decision Timeline의 맥락이 약해진다.

1차에서는 직접 참조를 우선하고, 복잡한 연결 테이블은 실제 다대다 요구가 확인된 뒤 검토한다.

## 2. 관계 후보 표

| 관계 후보 | 관계 설명 | 필수/선택 | 1차 포함 여부 | 직접 참조 적합성 | 연결 테이블 필요성 | 후순위 확장 | 주의할 점 |
|---|---|---|---|---|---|---|---|
| User → Builder Profile | 사용자 하나가 Builder Profile 하나를 가진다. | 필수 후보 | 1차 포함 | 직접 참조 적합 | 아니오 | 프로필 확장 가능 | Auth 연동 검토 |
| Builder Profile → Project | Builder가 여러 Project를 소유한다. | 필수 | 1차 포함 | 직접 참조 적합 | 팀 기능 전까지 불필요 | 팀 멤버십 후순위 | 소유자 변경 정책 |
| Project → Problem Definition | Project가 현재 문제 정의를 가진다. | 필수 | 1차 포함 | 직접 참조/Project 참조 적합 | 불필요 | 복수 문제 정의 후순위 | 이력은 Change Card |
| Project → Hypothesis | Project가 여러 Hypothesis를 가진다. | 필수 | 1차 포함 | Hypothesis가 Project 참조 | 불필요 | 가설 그룹 후순위 | 입력 부담 관리 |
| Project → Rough Note | Project에 여러 Rough Note가 쌓인다. | 필수 | 1차 포함 | Rough Note가 Project 참조 | 불필요 | 첨부 입력 후순위 | 비공개 기본 |
| Rough Note → AI Structured Draft | 메모에서 AI 초안이 생성된다. | 필수 후보 | 1차 포함 | AI Draft가 Rough Note 참조 | 불필요 | 다중 초안 가능성 | 실패 시 원문 보존 |
| AI Structured Draft → Change Card | 초안이 카드로 전환될 수 있다. | 선택/전환 시 필수 | 1차 포함 | 직접 참조 적합 | 불필요 | 초안 버전 관리 후순위 | AI Draft는 공식 기록 아님 |
| Project → Change Card | Project에 여러 Change Card가 쌓인다. | 필수 | 1차 포함 | Change Card가 Project 참조 | 불필요 | 없음 | 핵심 원천 |
| Change Card → Problem Definition | 카드가 관련 문제 정의를 참조할 수 있다. | 선택 | 1차 포함 후보 | 직접 참조 우선 | 후순위 | 다대다 가능 | 강제 연결 금지 |
| Change Card → Hypothesis | 카드가 관련 가설을 참조할 수 있다. | 선택 | 1차 포함 후보 | 직접 참조 우선 | 후순위 | 다대다 가능 | 연결 유도 |
| Change Card → Feedback | 카드가 반영된 피드백을 참조할 수 있다. | 선택 | 1차 포함 후보 | 직접 참조 우선 | 후순위 | 여러 피드백 묶음 | 일반 댓글화 주의 |
| Project → Feedback Request | Project에 여러 요청이 생성된다. | 필수 | 1차 포함 | Feedback Request가 Project 참조 | 불필요 | 대상 다형성 후보 | 막연한 요청 방지 |
| Feedback Request → Feedback | 요청에 여러 피드백이 달린다. | 필수 | 1차 포함 | Feedback이 Request 참조 | 불필요 | Feedback moderation 후순위 | 비로그인 보류 |
| Project → Public Project Page 표현 | Project 데이터가 공개 뷰로 표현된다. | 파생 | 1차 포함 | 별도 원천 없음 | 아니오 | 캐시 후순위 | 공개 상태 엄격히 반영 |
| Project → Project Links 후보 | Project에 여러 링크가 있을 수 있다. | 선택 | 1차 선택 | Project Link가 Project 참조 | 불필요 | 자동 연동 장기 | 단순 링크만 |
| User/Scout Profile → Project Save 후보 | 사용자가 프로젝트를 저장한다. | 선택 | 1차 선택/후순위 | Save가 User와 Project 참조 | 연결 테이블 성격 | Follow 확장 | 핵심보다 후순위 |

## 3. 1:N 관계 후보

- Builder Profile → Project
- Project → Hypothesis
- Project → Rough Note
- Project → Change Card
- Project → Feedback Request
- Feedback Request → Feedback

## 4. 선택 관계 후보

- Change Card → Problem Definition
- Change Card → Hypothesis
- Change Card → Feedback
- AI Structured Draft → Change Card
- User 또는 Scout Profile → Project Save

## 5. 직접 참조 후보

1차에서는 다음 직접 참조를 우선 검토한다.

- Change Card의 연결된 문제 정의 후보
- Change Card의 연결된 가설 후보
- Change Card의 연결된 피드백 후보
- AI Draft의 전환된 Change Card 후보

## 6. 연결 테이블 후보

연결 테이블은 다음 상황에서 후순위로 검토한다.

- 하나의 Change Card가 여러 Hypothesis와 연결되어야 한다.
- 하나의 Change Card가 여러 Feedback을 근거로 삼아야 한다.
- 하나의 Change Card가 여러 문제 정의 전환을 다루어야 한다.
- 외부 링크, 태그, 저장/팔로우가 복잡해진다.

## 7. 파생 관계 후보

- Project → Public Project Page 표현
- Change Card → Decision Timeline 표현
- Change Card + Problem/Hypothesis → Decision Diff 표현
- Project + Change Card + Feedback Request → Project Card Grid 표현

이 관계들은 원천 테이블 관계가 아니라 읽기 표현의 조합이다.

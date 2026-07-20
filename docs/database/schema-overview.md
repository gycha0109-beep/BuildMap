# DB 스키마 초안 개요

> 이 문서는 DB 스키마 초안 문서다. 실제 SQL, Supabase migration, RLS 정책, API, 프론트엔드 구현은 작성하지 않는다. 테이블명과 필드명은 후보이며 최종 확정이 아니다.

## 1. DB 스키마 설계의 목적

이 문서의 목적은 BuildMap의 1차 구현에 필요한 데이터 저장 구조 후보를 정리하는 것이다. 스키마 초안은 구현을 바로 시작하기 위한 최종 명세가 아니라, 실제 migration을 작성하기 전 관계와 책임을 검증하기 위한 기준이다.

## 2. BuildMap의 핵심 원천 데이터

BuildMap에서 원천 데이터로 취급할 후보는 다음이다.

- User 또는 인증 사용자 참조
- Builder Profile
- Project
- Problem Definition의 현재 상태
- Hypothesis의 현재 상태
- Rough Note
- AI Structured Draft
- Change Card
- Feedback Request
- Feedback
- Visibility / Status 필드

가장 중요한 원천 기록은 **Change Card**다. Change Card는 프로젝트에서 발생한 하나의 의사결정 단위이며, Decision Timeline과 공개 프로젝트 페이지의 핵심 원천이다.

## 3. 파생/표현 데이터 처리 원칙

다음은 1차에서 별도 원천 테이블로 만들지 않는 방향을 우선한다.

- Decision Timeline
- Public Project Page
- Project Card Grid 표시 정보
- 최근 전환 요약
- 공개 변화 카드 목록
- 간단한 Decision Diff
- Activity Signal 요약

이들은 가능한 한 Project, Problem Definition, Hypothesis, Change Card, Feedback Request, Feedback에서 파생해 보여준다. 캐시, 스냅샷, 검색 인덱스는 트래픽, 성능, 검색 요구가 확인된 뒤 후순위로 검토한다.

## 4. 1차 필수 테이블 후보

- `users` 또는 Supabase Auth 사용자 참조
- `builder_profiles`
- `projects`
- `problem_definitions`
- `hypotheses`
- `rough_notes`
- `ai_structured_drafts`
- `change_cards`
- `feedback_requests`
- `feedbacks`

상태와 공개 여부는 별도 테이블보다 각 핵심 테이블의 상태 필드 후보로 두는 방향을 우선 검토한다.

## 5. 1차 선택 테이블 후보

- `scout_profiles`
- `project_links`
- `project_tags`
- `project_saves` 또는 `project_follows`
- `simple_decision_diff_snapshots` 후보
- `activity_signals` 후보

이들은 유용하지만 Builder의 판단 흐름 기록보다 우선하지 않는다.

## 6. 2차 확장 테이블 후보

- `tester_applications`
- `collaboration_requests`
- `handoff_summaries`
- `detailed_visibility_rules`
- `scout_saved_projects`
- `project_activity_metrics`

## 7. 장기 확장 테이블 후보

- `hiring_requests`
- `headhunting_records`
- `investor_interest`
- `github_integrations`
- `notion_integrations`
- `external_traffic_snapshots`
- `organizations`
- `team_memberships`
- `billing_records`
- `advanced_search_indexes`

## 8. 이번 단계에서 제외할 테이블 후보

- 결제/가격 정책 테이블
- 투자 매칭 테이블
- AI 역량 점수 테이블
- Project DNA 테이블
- 지원자 관리 시스템 테이블
- 실시간 협업 편집 테이블
- 고급 랭킹 테이블

## 9. 핵심 데이터 흐름

```text
User
→ Builder Profile
→ Project
→ Problem Definition / Hypothesis
→ Rough Note
→ AI Structured Draft
→ Change Card
→ Decision Timeline 표현
→ Public Project Page 공개 뷰
→ Feedback Request
→ Feedback
→ 새 Change Card 후보
```

## 10. Change Card 중심 구조

Change Card가 중심인 이유는 프로젝트의 핵심 질문이 “무엇을 만들었는가”가 아니라 “왜 그렇게 바뀌었는가”이기 때문이다.

따라서 Change Card에는 단순 작업 완료가 아니라 다음이 담겨야 한다.

- 어떤 문제를 보았는가
- 어떤 가설이 생겼거나 반박되었는가
- 어떤 실험과 피드백이 있었는가
- 무엇을 유지하거나 제거했는가
- 어떤 판단으로 방향이 바뀌었는가

## 11. Decision Timeline을 별도 원천 테이블로 만들지 않는 이유

Decision Timeline을 별도 원천 테이블로 만들면 Change Card와 Timeline 사이에 기록 중복이 생긴다. 1차에서는 승인된 Change Card를 시간, 중요도, 공개 상태, 연결 관계에 따라 보여주는 표현 구조로 둔다.

추가 검토 필요: 장기적으로 성능이나 스냅샷 요구가 생기면 Timeline 캐시나 읽기 전용 뷰를 검토할 수 있다.

## 12. Public Project Page를 별도 원천 테이블로 만들지 않는 이유

공개 프로젝트 페이지는 제품 소개글이 아니다. Project, Problem Definition, Hypothesis, 공개 가능한 승인 Change Card, Feedback Request에서 파생되는 공개 뷰다.

별도 소개글 테이블을 만들면 공개 페이지가 BuildMap의 판단 흐름이 아니라 일반 랜딩 페이지처럼 변질될 위험이 있다.

## 13. Feedback을 일반 댓글 테이블처럼 만들지 않는 이유

Feedback은 일반 댓글이 아니라 특정 판단 또는 질문에 연결되는 근거다. 따라서 Feedback Request와 연결되고, Builder가 검토하며, 반영되면 새 Change Card로 이어질 수 있어야 한다.

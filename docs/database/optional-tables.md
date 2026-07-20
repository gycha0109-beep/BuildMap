# 선택 및 후순위 테이블 후보

> 이 문서는 DB 스키마 초안 문서다. 실제 SQL, Supabase migration, RLS 정책, API, 프론트엔드 구현은 작성하지 않는다. 테이블명과 필드명은 후보이며 최종 확정이 아니다.

## 1. 선택/후순위 분리 원칙

1차 DB 범위는 Builder의 판단 흐름 기록에 집중한다. 탐색, 저장, 히트맵, 협업, 채용, 외부 연동은 유용하지만 핵심 원천 기록보다 후순위다.

## 2. 후보 표

| 테이블 후보 | 왜 유용한가 | 왜 1차 필수가 아닌가 | 도입 조건 | 연결 핵심 테이블 | 대체 방법 |
|---|---|---|---|---|---|
| `scout_profiles` | 프로젝트 발견/저장/테스터 신청 목적을 세분화할 수 있다. | 초기에는 로그인 사용자 기반 피드백으로 충분할 수 있다. | Scout 탐색과 저장 요구가 강해질 때 | users, project_saves, feedbacks | 로그인 사용자 피드백으로 대체 |
| `project_links` | 공개 페이지에서 외부 자료 링크를 제공한다. | 핵심 판단 흐름에는 필수 아님 | 관련 링크 노출이 필요할 때 | projects | Project의 단순 링크 필드 후보 |
| `project_tags` | 탐색 필터를 돕는다. | 초기 탐색은 최근 업데이트와 필요 도움으로 가능 | 프로젝트 수가 늘어날 때 | projects | 한 줄 정의/현재 상태로 대체 |
| `project_saves 또는 project_follows` | 재방문과 관심 프로젝트 관리에 유용하다. | 핵심 기록 흐름보다 낮은 우선순위 | Scout 재방문 요구 확인 시 | users, projects | 브라우저 북마크/링크 공유 |
| `activity_signals` | 최근 활동과 배지를 만들 수 있다. | 복잡한 지표화 위험이 있다. | 카드 그리드 정렬이 부족할 때 | projects, change_cards, feedbacks | recent_updated_at으로 대체 |
| `simple_decision_diff_snapshots` | 비교 결과를 고정할 수 있다. | Change Card 기반 파생으로 시작 가능 | Diff 공유/성능 요구가 있을 때 | change_cards, problem_definitions, hypotheses | 실시간 파생 비교 |
| `tester_applications` | 테스터 신청을 구조화한다. | Feedback으로 임시 대체 가능 | 테스터 모집이 핵심화될 때 | feedback_requests, users | Feedback의 참여 의사 필드 |
| `collaboration_requests` | 협업 요청을 구조화한다. | 맥락 기반 연락으로 시작 가능 | 협업 요청이 빈번할 때 | projects, users | Feedback/연락 링크 |
| `handoff_summaries` | 인수인계 요약을 제공한다. | Timeline으로 1차 대응 가능 | 팀 합류/인수인계가 반복될 때 | projects, change_cards | Decision Timeline 필터 |
| `detailed_visibility_rules` | 세부 공개 권한을 제어한다. | 1차 공개 정책은 단순 상태로 충분 | 팀/조직 기능 도입 시 | projects, change_cards | 공개 상태 필드 |
| `project_activity_metrics` | 활동 지표를 누적한다. | 점수화/히트맵 과확장 위험 | 프로젝트 수와 탐색 요구 증가 시 | projects, activity_signals | 최근 업데이트 정렬 |
| `hiring_requests` | 채용 요청을 관리한다. | 초기 Scout 정의와 맞지 않음 | 채용 확장 단계 | builder_profiles, projects | 협업 요청 |
| `github_integrations` | GitHub 데이터를 연결한다. | BuildMap 핵심은 코드 변경이 아님 | 외부 연동 단계 | projects | 단순 링크 |
| `billing_records` | 결제를 관리한다. | 현재 제품 핵심 아님 | 가격 정책 확정 후 | users, organizations | 없음 |

## 3. 1차 선택 후보

- scout_profiles
- project_links
- project_tags
- project_saves 또는 project_follows
- activity_signals
- simple_decision_diff_snapshots 후보

이 후보들은 1차 설계에서 검토할 수 있지만, 구현 범위가 커질 경우 제외한다.

## 4. 2차 확장 후보

- tester_applications
- collaboration_requests
- handoff_summaries
- detailed_visibility_rules
- scout_saved_projects
- project_activity_metrics

## 5. 장기 확장 후보

- hiring_requests
- headhunting_records
- investor_interest
- github_integrations
- notion_integrations
- external_traffic_snapshots
- organizations
- team_memberships
- billing_records
- advanced_search_indexes

## 6. 추가 검토 필요 사항

- Scout Profile 없이도 피드백/저장/테스터 신청이 충분한가
- Save와 Follow를 구분할 필요가 있는가
- Activity Signal을 이벤트성 기록으로 둘지 파생 요약으로 둘지
- Decision Diff snapshot이 정말 필요한가

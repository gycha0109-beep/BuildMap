# 테이블 후보 범위 구분

> 이 문서는 DB 스키마 초안 문서다. 실제 SQL, Supabase migration, RLS 정책, API, 프론트엔드 구현은 작성하지 않는다. 테이블명과 필드명은 후보이며 최종 확정이 아니다.

## 1. 범위 구분 원칙

1차 필수 테이블은 Builder가 프로젝트를 만들고, 문제/가설을 입력하고, 거친 메모를 남기고, AI 초안을 검토한 뒤 Change Card를 승인하여 Decision Timeline과 공개 프로젝트 페이지로 표현하는 데 필요한 최소 후보만 포함한다.

1차 선택 테이블은 있으면 유용하지만 핵심 판단 흐름 기록이 없어도 동작 가능한 후보로 둔다.

## 2. 테이블 후보 범위 표

| 테이블 후보 | 포함 단계 | 왜 필요한가 | 1차 필수 여부 | 후순위/검토 가능성 | 관련 화면 |
|---|---|---|---|---|---|
| `users 또는 auth users 참조` | 1차 필수 | 인증 사용자와 Builder/피드백 작성자를 식별한다. | 필수 | Supabase Auth와 별도 users 테이블 관계는 추가 검토 필요 | 가입, 피드백 작성 |
| `builder_profiles` | 1차 필수 | Builder의 공개 이름, 역할 태그, 관심 분야를 담는다. | 필수 | 비공개 정보는 최소화 | Builder 대시보드, 공개 페이지 |
| `projects` | 1차 필수 | 판단 흐름이 쌓이는 중심 컨테이너다. | 필수 | 진행 상태와 공개 상태 분리 | 프로젝트 생성, 공개 페이지 |
| `problem_definitions` | 1차 필수 | 현재 문제 정의를 담는다. | 필수 | 과거 이력은 Change Card가 원천 | 문제/가설 입력, Timeline |
| `hypotheses` | 1차 필수 | 현재 가설 문장과 상태를 담는다. | 필수 | 모든 상태 변경에 카드 생성을 강제하지 않음 | 문제/가설 입력 |
| `rough_notes` | 1차 필수 | Builder의 거친 원문 기록이다. | 필수 | 내부 비공개 원칙 | 거친 메모 입력 |
| `ai_structured_drafts` | 1차 필수 | Change Card 후보 초안이다. | 필수 | 공식 기록 아님 | AI 초안 검토 |
| `change_cards` | 1차 필수 | 핵심 원천 기록이다. | 필수 | 필수 필드를 과도하게 늘리지 않음 | Timeline, 공개 페이지 |
| `feedback_requests` | 1차 필수 | 특정 판단에 대한 피드백 요청 단위다. | 필수 | 일반 댓글창 아님 | 피드백 요청 |
| `feedbacks` | 1차 필수 | 로그인 사용자가 남기는 판단 근거다. | 필수 | 기본 내부 검토, 선택 공개 | 피드백 작성/검토 |
| `scout_profiles` | 1차 선택 | Scout 탐색 목적과 관심 분야를 담을 수 있다. | 선택 | 로그인 사용자 기반으로 대체 가능 | Scout 탐색 |
| `project_links` | 1차 선택 | 데모/GitHub/Notion/Figma 등 단순 링크 저장 | 선택 | 자동 연동 아님 | 공개 페이지 |
| `project_tags` | 1차 선택 | 탐색과 필터링 보조 | 선택 | 배열/문자열/별도 테이블 검토 필요 | 탐색 카드 그리드 |
| `project_saves 또는 project_follows` | 1차 선택 | 공개 프로젝트 재방문과 탐색 보조 | 선택 | 범위 커지면 후순위 | Scout 탐색 |
| `simple_decision_diff_snapshots 후보` | 1차 선택 | 간단한 판단 비교 표시 | 선택 | 가능하면 Change Card 기반 파생 우선 | Decision Diff |
| `activity_signals 후보` | 1차 선택 | 최근 활동/배지/탐색 보조 | 선택 | 히트맵 산식 보류 | 카드 그리드 |
| `tester_applications` | 2차 확장 | 테스터 신청 관리 | 아님 | Feedback으로 대체 가능 | 테스터 모집 |
| `collaboration_requests` | 2차 확장 | 협업 요청 관리 | 아님 | 초기에는 맥락 기반 연락으로 대체 | 협업자 요청 |
| `handoff_summaries` | 2차 확장 | 인수인계 요약 | 아님 | 초기에는 Timeline 활용 | 인수인계 |
| `hiring_requests / headhunting_records` | 장기 확장 | 채용/헤드헌팅 확장 | 아님 | 초기 범위 제외 | 장기 Scout |
| `billing_records` | 장기 확장 | 결제/구독 | 아님 | 이번 단계 제외 | 가격/결제 |

## 3. 1차 필수에 포함할 수 있는 보조 상태 구조

상태와 공개 여부는 1차에서 별도 상태 테이블로 분리하기보다 각 핵심 테이블의 필드 후보로 둔다. 단, 상태축은 반드시 분리한다.

- Change Card: 작업 상태 / 공개 상태 분리
- Project: 진행 상태 / 공개 상태 분리
- Feedback: 검토 상태 / 공개 상태 분리
- AI Draft: 공식 승인 상태 없이 전환 상태로 표현

상태 전환 이력을 별도로 저장할지는 후순위다.

## 4. 이번 단계에서 제외할 테이블 후보

- payment tables
- investment matching tables
- AI skill score tables
- Project DNA tables
- applicant tracking system tables
- real-time collaborative editing tables
- advanced ranking tables

이 후보들은 BuildMap을 채용 플랫폼, 투자 매칭 서비스, 점수화 서비스처럼 보이게 할 수 있으므로 현재 단계에서 제외한다.

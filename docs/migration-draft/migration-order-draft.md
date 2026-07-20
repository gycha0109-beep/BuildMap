# Migration Order Draft

> 주의: 이 문서의 SQL은 검토용 초안이다. 실제 Supabase migration 파일이 아니며, 아직 실행하거나 적용하지 않는다. 실제 적용 전 Supabase/PostgreSQL 문법, 보안, RLS 동작을 별도로 검증해야 한다.

## 1. 적용 순서 후보

| 순서 | 단계 | 목적 | 의존성 | 실제 SQL 초안 |
|---:|---|---|---|---|
| 1 | extension 후보 검토 | uuid/hash 함수 후보 준비 | 없음 | 부분 작성 |
| 2 | schema primitive / 공통 함수 후보 | timestamp, current profile helper 후보 | 1 | 부분 작성 |
| 3 | `user_profiles` / `builder_profiles` | 사용자/Builder 기본 구조 | auth users | 작성 |
| 4 | `projects` | Project 컨테이너와 공개 접근 식별자 | builder_profiles | 작성 |
| 5 | `problem_definitions` / `hypotheses` | 현재 문제/가설 저장 | projects | 작성 |
| 6 | `rough_notes` / `ai_structured_drafts` | 내부 기록과 AI 초안 | projects | 작성 |
| 7 | `change_cards` | 핵심 원천 기록 | projects, notes, drafts | 작성 |
| 8 | `feedback_requests` / `feedbacks` | 판단 피드백 구조 | projects, change_cards | 작성 |
| 9 | `project_links` | 공개 가능한 외부 링크 후보 | projects | 작성 |
| 10 | index 후보 | 조회/Timeline 성능 후보 | 각 테이블 | 작성 |
| 11 | helper function 후보 | RLS 조건 재사용 후보 | 테이블 생성 이후 | 작성 |
| 12 | public-safe view 후보 | 전체 공개 응답 경계 | helper/RLS 검토 이후 | 작성 |
| 13 | secure RPC 후보 | 링크 공개 조회/Feedback 작성 | token hash 구조 | 작성 |
| 14 | trigger / constraint 후보 | 수정 제한, timestamp, 무결성 | 테이블 생성 이후 | 작성 |
| 15 | RLS enable 후보 | row-level 접근 제어 활성화 | 테이블 생성 이후 | 작성 |
| 16 | RLS policy 후보 | 객체별 정책 적용 | helper/RLS enable | 작성 |
| 17 | manual verification 후보 | 7.5 테스트 케이스 기반 검증 | 전체 | 문서화 |

## 2. 왜 이 순서인가

- profile 계층이 있어야 Project Owner 관계를 만들 수 있다.
- Project가 있어야 Problem, Hypothesis, Rough Note, Change Card, Feedback Request가 연결된다.
- Change Card가 있어야 Decision Timeline, 공개 Timeline, Feedback 반영 흐름을 파생할 수 있다.
- public-safe view와 secure RPC는 원천 테이블과 helper 후보가 정리된 뒤 검토해야 한다.
- RLS policy는 테이블, helper, view/RPC 경계가 정리된 뒤 작성해야 한다.

## 3. 적용 전 검증 필요 사항

- `auth.users` FK 참조 방식
- `security_invoker` view 사용 가능성
- token hash 생성/비교 방식
- RLS에서 helper function 호출 시 권한과 성능
- trigger가 RLS와 충돌하지 않는지

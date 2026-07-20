# Manual Test Case Mapping Review

> 주의: 이 문서는 실제 migration 파일이 아니다. SQL 실행, Supabase 연결, RLS 적용, helper/RPC/view/trigger 생성은 아직 하지 않는다. 실제 적용 전 Supabase/PostgreSQL 공식 문서와 로컬 dry-run으로 재검증해야 한다.

## 1. 검수 목적

7.5단계 Test Case ID와 9단계 migration draft의 RLS/policy/view/RPC 후보가 충분히 연결되어 있는지 검수한다.

상태 값:

- 충분
- 부분 충분
- 부족
- 후순위 제외

## 2. 문서별 매핑 상태

| 7.5 테스트 문서 | 대표 Test Case | 9단계 매핑 상태 | 검수 의견 | 보강 필요 |
|---|---|---|---|---|
| `project-access-test-cases.md` | `PRJ-*` | 부분 충분 | Owner/private/public는 반영됨 | 전체 ID별 mapping 보강 |
| `link-sharing-test-cases.md` | `LINK-*` | 부분 충분 | secure RPC 후보로 반영 | token 폐기/재발급 세부 mapping 필요 |
| `change-card-access-test-cases.md` | `CC-*` | 부분 충분 | 공개 조건 반영 | publishable/sensitive/held ID별 mapping 보강 |
| `rough-note-ai-draft-test-cases.md` | `RNAI-*` | 충분 | 외부 차단 일관 | 전환 후 수정 제한 mapping 보강 |
| `problem-hypothesis-test-cases.md` | `PH-*` | 부분 충분 | 현재값 공개 원칙 반영 | 민감 problem/hypothesis 처리 보강 |
| `feedback-test-cases.md` | `FB-*` | 부분 충분 | Request 기반 생성 반영 | link_shared insert / author spoofing mapping 보강 |
| `public-project-page-test-cases.md` | `PP-*` | 부분 충분 | public-safe view 후보 반영 | view 컬럼별 ID mapping 보강 |
| `owner-approval-test-cases.md` | `OWN-*` | 부분 충분 | Owner 중심 권한 반영 | 승인자/작성자 세부 mapping 보강 |

## 3. 대표적으로 충분한 항목

- 비공개 Project 외부 차단
- 전체 공개 Project 공개 정보 읽기
- Rough Note / AI Draft 외부 차단
- 공개 Timeline 조건: approved + published + normal
- Feedback Request 기반 Feedback 생성 원칙
- Project Owner 중심 update/approve/publish

## 4. 부분 충분 항목

- `share_token` 없음/잘못됨/폐기됨/재발급별 RPC mapping
- `public_slug`만으로 link_shared 접근 차단
- public-safe view 컬럼 단위 검증
- public Feedback 작성자 표시 정책
- 승인된 Change Card 수정 제한 trigger 검증

## 5. 부족 항목

현재 완전 부족은 아니지만, 11단계 전 다음은 보강 필요하다.

- 전체 Test Case ID별 정책 후보 매핑표
- RPC별 실패 케이스 응답 정책
- view별 포함/제외 컬럼 테스트 표
- trigger 실패 케이스 수동 검증 절차

## 6. 결론

현재 매핑은 migration 파일 작성 전 검토를 시작하기에는 충분하지만, 실제 migration 작성과 수동 검증 단계에서는 ID별 전체 매핑이 필요하다.

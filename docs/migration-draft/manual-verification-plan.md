# Manual Verification Plan

> 주의: 이 문서의 SQL은 검토용 초안이다. 실제 Supabase migration 파일이 아니며, 아직 실행하거나 적용하지 않는다. 실제 적용 전 Supabase/PostgreSQL 문법, 보안, RLS 동작을 별도로 검증해야 한다.

## 1. 목적

9단계 migration draft가 7.5 Access Policy Test Cases, 8단계 RLS Policy ID, 8.5 Security Gate를 만족하는지 수동으로 검증하기 위한 계획이다.

## 2. 검증 그룹

| 그룹 | 관련 문서 | 기대 결과 |
|---|---|---|
| Project 공개 상태 | `project-access-test-cases.md` | 비공개 차단, 전체 공개 허용, Owner 수정 허용 |
| Link sharing | `link-sharing-test-cases.md` | 유효 token만 링크 공개 접근 |
| Change Card 공개 조건 | `change-card-access-test-cases.md` | approved + published + normal만 공개 |
| Rough Note / AI Draft | `rough-note-ai-draft-test-cases.md` | 외부 완전 차단 |
| Feedback | `feedback-test-cases.md` | Request 기반 생성, 내부 검토 기본 |
| Public-safe view | 8.5 public read boundary | 내부 컬럼 노출 차단 |
| Secure RPC | link sharing RPC draft | token hash 검증, 원천 row 직접 노출 방지 |
| Approved Change Card mutation | change-card mutation boundary | 승인 후 핵심 내용 수정 제한 |

## 3. 대표 Test Case ID 매핑

| Test Case ID | 검증 목적 | migration draft 반영 |
|---|---|---|
| `PRJ-001` | Owner 비공개 Project 읽기 | `project_select_owner` 후보 |
| `PRJ-014` | 비공개 Project의 공개 Change Card 외부 차단 | Project + Change Card 정책 |
| `LINK-002` | 유효 token 링크 공개 접근 | secure RPC 후보 |
| `LINK-006` | 비공개 전환 후 token 접근 차단 | RPC 조건 후보 |
| `CC-004` | 공개 Change Card 읽기 | public change card view/policy 후보 |
| `CC-007` | 민감 Change Card 차단 | public view 조건 |
| `RNAI-006` | 공개 Project에서도 Rough Note 비노출 | anon policy 없음 |
| `FB-007` | 로그인 사용자의 공개 Feedback Request Feedback 작성 | feedback insert helper 후보 |
| `FB-019` | 링크 공개 Feedback 작성 조건 | secure RPC 후보 |
| `PP-007` | 공개 페이지 인증 ID/이메일 노출 차단 | public-safe view 후보 |

## 4. 실제 적용 전 검증 필요 여부

모든 항목은 실제 Supabase 환경에서 다음을 다시 확인해야 한다.

- RLS 정책 동작
- view security behavior
- RPC 권한 grant
- token hash 비교
- trigger 동작
- anon/authenticated role 권한

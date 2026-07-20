# Phase 14 Local Dry-run Execution Scope

## 확정한 것

- 14단계는 local dry-run 실행 / 실패 로그 수집 단계다.
- 이번 실행 환경에서는 Supabase CLI와 Docker가 없어 dry-run을 실행하지 않았다.
- remote Supabase 적용은 하지 않았다.
- production/staging DB 적용은 하지 않았다.
- Supabase SQL Editor는 사용하지 않았다.
- 정식 `supabase/migrations` 영구 승격은 하지 않았다.
- 원본 `migrations_draft`는 계속 DRAFT ONLY 상태를 유지한다.
- 실행한 명령은 모두 로그로 남겼다.
- 실패한 명령은 exit code와 stderr 요약을 남겼다.
- secret 값은 출력하지 않았다.
- dry-run 결과에 따라 15단계 SQL patch로 넘어가는 대신, 먼저 local 실행 환경 준비가 필요하다.

## 보류한 것

- 실제 remote Supabase migration
- production/staging DB 적용
- 정식 migration 승격
- API route
- 프론트엔드 구현
- 자동화 테스트 코드
- hmac/pepper 기반 token hash
- public_slug 실제 생성 정책
- last_activity_at 갱신 방식
- Feedback 작성자 동의 UX
- 관리자 권한
- 팀 권한
- 공동 편집
- 조직 권한
- 비로그인 피드백
- Save / Follow
- Activity Signal
- Decision Diff Snapshot
- 채용/헤드헌팅 권한
- 결제 권한
- Project DNA
- 역량 점수화
- 외부 연동 권한
- 히트맵 산식

## 다음 단계 후보

15단계는 두 방향 중 하나다.

1. 사용자의 로컬 PC에서 Supabase CLI와 Docker를 준비하고 dry-run을 재실행한다.
2. 사용자가 직접 실행한 실패 로그를 가져오면 그 로그 기반으로 SQL patch를 진행한다.

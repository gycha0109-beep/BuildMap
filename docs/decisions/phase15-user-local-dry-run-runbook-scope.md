# Phase 15 User Local Dry-run Runbook Scope

> 단계: BuildMap 15단계  
> 성격: User Local Dry-run Runbook & Log Intake  
> 주의: 이 문서는 사용자의 로컬 PC에서 실행할 후보 절차를 정리한다. 이 문서 작성 단계에서는 Supabase CLI, Docker, SQL, DB reset, db lint를 실행하지 않는다.


## 확정한 것

- 15단계는 사용자 로컬 PC dry-run runbook과 로그 수집 양식 작성 단계다.
- 15단계에서는 명령을 실행하지 않는다.
- SQL draft를 수정하지 않는다.
- 14단계의 실행 불가 원인은 Supabase CLI / Docker / `config.toml` 부재다.
- 다음 실제 실행은 사용자의 로컬 PC에서 수행한다.
- 사용자는 실행 전 Supabase CLI, Docker, Docker daemon을 확인한다.
- disposable workspace를 사용한다.
- `migrations_draft`는 원본에서 계속 `DRAFT ONLY` 상태를 유지한다.
- dry-run용 `supabase/migrations`는 임시 workspace에만 만든다.
- `supabase init`은 필요한 경우 disposable workspace에서만 허용 후보로 둔다.
- `supabase link`, `db push`, `db pull`, SQL Editor, remote DB 접속은 금지한다.
- secret은 값이 아니라 존재 여부만 확인한다.
- 사용자는 dry-run 결과를 `log-intake-template.md`에 맞춰 가져온다.
- 16단계는 로그 결과에 따라 SQL patch, 환경 보정, lint patch, manual RLS scenario plan 중 하나로 결정한다.

## 보류한 것

- 실제 local dry-run 실행
- Supabase CLI 실행
- Docker 실행
- `supabase db reset`
- `supabase db lint`
- SQL patch
- 정식 migration 승격
- remote Supabase migration
- production/staging DB 적용
- API route
- 프론트엔드 구현
- 자동화 테스트 코드
- hmac/pepper 기반 token hash
- `public_slug` 실제 생성 정책
- `last_activity_at` 갱신 방식
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

## 16단계로 넘어가기 위한 조건

사용자가 다음 중 하나를 가져와야 한다.

- preflight 결과
- `supabase start` 결과
- `supabase db reset` 결과
- `supabase db lint --local` 결과
- 첫 번째 실패 파일과 에러 요약
- 마스킹된 전체 로그
- remote 미적용 확인

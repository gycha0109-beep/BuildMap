# BuildMap 15단계 User Local Dry-run Runbook & Log Intake

> 단계: BuildMap 15단계  
> 성격: User Local Dry-run Runbook & Log Intake  
> 주의: 이 문서는 사용자의 로컬 PC에서 실행할 후보 절차를 정리한다. 이 문서 작성 단계에서는 Supabase CLI, Docker, SQL, DB reset, db lint를 실행하지 않는다.


## 15단계 목적

14단계에서는 sandbox 환경에 `supabase` CLI와 `docker` 명령이 없어 local dry-run을 실행하지 못했다. 15단계의 목적은 그 결과를 바탕으로, 사용자가 자신의 로컬 PC에서 **remote DB 위험 없이** local dry-run을 실행하고 실패 로그를 다시 가져올 수 있도록 절차서와 로그 수집 양식을 만드는 것이다.

이번 단계는 SQL patch가 아니다. `supabase/migrations_draft` 안의 SQL draft 파일은 수정하지 않는다.

## 14단계 결과와의 관계

14단계에서 확인된 상태는 다음이다.

- Supabase CLI 없음
- Docker 없음
- `supabase/config.toml` 없음
- local dry-run 미실행
- SQL/RLS/view/RPC/trigger 실패 로그 없음
- remote 적용 없음
- `migrations_draft`는 계속 `DRAFT ONLY` 상태

따라서 이번 단계는 사용자가 직접 로컬 환경에서 실행할 runbook과 로그 수집 포맷을 준비하는 단계다.

## 생성 문서 목록

- `runbook-overview.md`
- `local-environment-requirements.md`
- `preflight-checklist.md`
- `no-remote-safety-rules.md`
- `disposable-workspace-procedure.md`
- `migration-copy-procedure.md`
- `supabase-init-guidance.md`
- `windows-powershell-runbook.md`
- `mac-linux-bash-runbook.md`
- `command-sequence.md`
- `log-redaction-guide.md`
- `log-intake-template.md`
- `result-report-template.md`
- `failure-classification-guide.md`
- `after-log-intake-next-step.md`
- `../decisions/phase15-user-local-dry-run-runbook-scope.md`

## 읽는 순서

1. `runbook-overview.md`
2. `no-remote-safety-rules.md`
3. `local-environment-requirements.md`
4. `preflight-checklist.md`
5. `disposable-workspace-procedure.md`
6. `migration-copy-procedure.md`
7. `supabase-init-guidance.md`
8. 사용하는 OS에 맞는 runbook
9. `command-sequence.md`
10. `log-redaction-guide.md`
11. `log-intake-template.md`
12. `result-report-template.md`
13. `failure-classification-guide.md`
14. `after-log-intake-next-step.md`

## 사용자가 직접 실행해야 하는 이유

현재 문서 작성 환경에는 Supabase CLI와 Docker가 없다. 또한 remote DB에 잘못 연결되는 위험을 피해야 한다. 따라서 실제 dry-run은 사용자의 로컬 PC에서, disposable workspace 안에서만 수행한다.

## 이번 단계에서 하지 않는 것

- Supabase CLI 실행
- Docker 실행
- `supabase db reset`
- `supabase db lint`
- SQL 실행
- SQL draft 수정
- 정식 migration 승격
- remote Supabase 연결
- API/프론트엔드/테스트 코드 구현

## 핵심 안전 원칙

- `supabase link`, `supabase db push`, `supabase db pull` 금지
- Supabase SQL Editor 사용 금지
- production/staging/remote DB 적용 금지
- 원본 `supabase/migrations_draft` 유지
- 임시 `supabase/migrations`는 disposable workspace에서만 생성
- secret, token, DB URL, password는 출력하지 않음
- 실패 로그는 마스킹 후 필요한 범위만 전달

## 15단계 최종 결론

15단계는 **사용자 로컬 PC dry-run 실행 절차서와 로그 수집 양식 작성 단계**다. 실제 실패 로그가 확보되기 전까지 SQL patch는 하지 않는다.

## 16단계 dry-run 성공 결과

사용자 로컬 dry-run 성공 결과는 `docs/local-dry-run-success/README.md`에서 확인한다.

# Command Sequence

> 단계: BuildMap 15단계  
> 성격: User Local Dry-run Runbook & Log Intake  
> 주의: 이 문서는 사용자의 로컬 PC에서 실행할 후보 절차를 정리한다. 이 문서 작성 단계에서는 Supabase CLI, Docker, SQL, DB reset, db lint를 실행하지 않는다.


아래 명령은 사용자가 직접 실행할 후보이며, 이번 문서 작성 단계에서는 실행하지 않는다.

| Step ID | 목적 | 명령 후보 | 실행 위치 | 실행 전 조건 | 성공 기준 | 실패 시 중단 여부 | 로그에 남길 것 | secret 위험 |
|---|---|---|---|---|---|---|---|---|
| CMD-001 | 현재 경로 확인 | `pwd` / `Get-Location` | BuildMap 후보 | 압축 해제 완료 | BuildMap 경로 확인 | 아니오 | 경로 | 낮음 |
| CMD-002 | 파일 목록 확인 | `ls` / `dir` | BuildMap | 루트 진입 | `docs`, `supabase` 확인 | 예 | 목록 요약 | 낮음 |
| CMD-003 | SQL 파일 수 확인 | `find ... \| wc -l` / PowerShell Count | BuildMap | migrations_draft 존재 | 9개 | 예 | 파일 수 | 낮음 |
| CMD-004 | DRAFT header 확인 | 파일 상단 확인 | BuildMap | SQL 파일 존재 | DRAFT ONLY 확인 | 예 | 확인 여부 | 낮음 |
| CMD-005 | Supabase CLI 확인 | `supabase --version` | 어디서든 | 설치 후보 | version 출력 | 예 | version | 낮음 |
| CMD-006 | Docker 확인 | `docker --version` | 어디서든 | 설치 후보 | version 출력 | 예 | version | 낮음 |
| CMD-007 | Docker daemon 확인 | `docker info` | 어디서든 | Docker 실행 | 성공 | 예 | 성공/실패 | 낮음 |
| CMD-008 | Git 상태 | `git status --short` | BuildMap | git repo일 때 | 상태 출력 | 아니오 | 요약 | 낮음 |
| CMD-009 | Git branch | `git branch --show-current` | BuildMap | git repo일 때 | branch 출력 | 아니오 | branch | 낮음 |
| CMD-010 | config 확인 | `test -f supabase/config.toml` / `Test-Path` | workspace | Supabase 폴더 존재 | true/false | 아니오 | 존재 여부 | 낮음 |
| CMD-011 | workspace 생성 | `cp -R` / `Copy-Item` | 원본 외부 | 원본 경로 명확 | workspace 생성 | 예 | 경로 | 중간 |
| CMD-012 | migration 복사 | `cp` / `Copy-Item` | workspace | migrations_draft 존재 | 9개 복사 | 예 | 파일 목록 | 낮음 |
| CMD-013 | init 후보 | `supabase init` | workspace | config 없음 | config 생성 | 조건부 | stdout/stderr | 낮음 |
| CMD-014 | local stack 시작 | `supabase start` | workspace | CLI/Docker OK | 성공 | 예 | 요약 | 중간 |
| CMD-015 | migration dry-run | `supabase db reset` | workspace | local stack 준비 | 성공 또는 첫 실패 로그 | 예 | 실패 파일/에러 | 중간 |
| CMD-016 | lint | `supabase db lint --local` | workspace | local DB 준비 | 결과 출력 | 아니오 | warning 요약 | 중간 |
| CMD-017 | 상태 확인 후보 | `supabase status` | workspace | local stack 실행 | local status 출력 | 아니오 | secret 마스킹 | 높음 |

## 주의

`supabase status` 출력에는 connection string이나 password가 포함될 수 있다. 공유 전 반드시 마스킹한다.

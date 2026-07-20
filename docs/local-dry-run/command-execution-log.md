# Command Execution Log

## 원칙

명령은 local preflight 범위에서만 실행했다. remote Supabase에 접근하는 명령은 실행하지 않았다.

| Command ID | 명령 | 실행 위치 | 목적 | 실행 여부 | exit code | stdout 요약 | stderr 요약 | secret masking | 다음 조치 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CMD-001 | pwd | /mnt/data/buildmap14_unzip/BuildMap | 작업 경로 확인 | 실행 | 0 | BuildMap 루트 경로 확인 | 없음 | 해당 없음 | 계속 |
| CMD-002 | find supabase/migrations_draft -maxdepth 1 -type f | /mnt/data/buildmap14_unzip/BuildMap | SQL draft 파일 확인 | 실행 | 0 | SQL draft 9개 및 README 확인 | 없음 | 해당 없음 | 계속 |
| CMD-003 | head/grep DRAFT ONLY | /mnt/data/buildmap14_unzip/BuildMap | DRAFT ONLY 주석 확인 | 실행 | 0 | SQL draft 9개 모두 확인 | 없음 | 해당 없음 | 계속 |
| CMD-004 | git status --short | /mnt/data/buildmap14_unzip/BuildMap | git 상태 확인 | 실행 | 128 | 없음 | not a git repository | 해당 없음 | 계속 가능 |
| CMD-005 | git branch --show-current | /mnt/data/buildmap14_unzip/BuildMap | branch 확인 | 실행 | 128 | 없음 | not a git repository | 해당 없음 | 계속 가능 |
| CMD-006 | supabase --version | /mnt/data/buildmap14_unzip/BuildMap | Supabase CLI 확인 | 실행 | 127 | 없음 | supabase: command not found | 해당 없음 | dry-run 중단 사유 |
| CMD-007 | docker --version | /mnt/data/buildmap14_unzip/BuildMap | Docker 확인 | 실행 | 127 | 없음 | docker: command not found | 해당 없음 | dry-run 중단 사유 |
| CMD-008 | docker info | /mnt/data/buildmap14_unzip/BuildMap | Docker daemon 확인 | 실행 | 127 | 없음 | docker: command not found | 해당 없음 | dry-run 중단 사유 |
| CMD-009 | supabase start | N/A | local stack 실행 | 실행하지 않음 | N/A | N/A | preflight 실패로 미실행 | 해당 없음 | Supabase CLI/Docker 설치 후 실행 |
| CMD-010 | supabase db reset | N/A | local migration 적용 | 실행하지 않음 | N/A | N/A | preflight 실패로 미실행 | 해당 없음 | Supabase CLI/Docker 설치 후 실행 |
| CMD-011 | supabase db lint --local | N/A | local lint | 실행하지 않음 | N/A | N/A | preflight 실패로 미실행 | 해당 없음 | Supabase CLI/Docker 설치 후 실행 |

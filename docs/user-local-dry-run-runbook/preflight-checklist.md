# Preflight Checklist

> 단계: BuildMap 15단계  
> 성격: User Local Dry-run Runbook & Log Intake  
> 주의: 이 문서는 사용자의 로컬 PC에서 실행할 후보 절차를 정리한다. 이 문서 작성 단계에서는 Supabase CLI, Docker, SQL, DB reset, db lint를 실행하지 않는다.


## 실행 전 체크리스트

| 항목 | 확인 방법 | 통과 기준 | 실패 시 조치 | 로그에 남길 내용 |
|---|---|---|---|---|
| BuildMap ZIP 압축 해제 | 파일 탐색기 또는 `ls`/`dir` | `BuildMap` 루트 존재 | 압축 다시 해제 | 경로 |
| BuildMap 루트 진입 | `pwd` 또는 `Get-Location` | 현재 위치가 BuildMap | 경로 이동 | 현재 경로 |
| migrations_draft 존재 | `ls supabase/migrations_draft` | 디렉터리 존재 | ZIP 재확인 | 존재 여부 |
| SQL draft 9개 | 파일 수 확인 | 9개 | 누락 파일 확인 | 파일 목록 |
| DRAFT ONLY 주석 | 각 SQL 상단 확인 | 모든 파일에 존재 | 파일 버전 확인 | 확인 여부 |
| 정식 migrations 없음 | `supabase/migrations` 확인 | 원본에 없거나 사용하지 않음 | 원본 오염 여부 확인 | 존재 여부 |
| Supabase CLI | `supabase --version` | version 출력 | 설치 필요 | version 또는 없음 |
| Docker | `docker --version` | version 출력 | 설치 필요 | version 또는 없음 |
| Docker daemon | `docker info` | 성공 | daemon 실행 | 성공/실패 |
| config.toml | `supabase/config.toml` 확인 | 있으면 사용, 없으면 disposable init 후보 | 원본 init 금지 | 존재 여부 |
| git branch | `git branch --show-current` | branch 확인 | 수동 기록 | branch |
| git status | `git status --short` | 오염 여부 확인 | 변경 파일 기록 | 요약 |
| remote link | `.supabase` 등 확인 | remote 연결 없음이 안전 | remote 명령 금지 | 감지 여부 |
| secret env | 존재 여부만 확인 | 값 출력 없음 | 마스킹 | true/false |
| disposable workspace | 경로 확인 | 원본과 분리 | 생성 후 진행 | workspace 경로 |

## 진행 중단 기준

아래 중 하나라도 해당하면 `db reset`으로 넘어가지 않는다.

- Supabase CLI 없음
- Docker 없음
- Docker daemon 미실행
- BuildMap 루트 불명확
- `migrations_draft` 누락
- remote DB URL 또는 Supabase link 사용을 요구하는 상황
- 사용자가 workspace와 원본을 구분하지 못하는 상황

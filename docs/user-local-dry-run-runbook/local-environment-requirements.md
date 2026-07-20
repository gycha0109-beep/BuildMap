# Local Environment Requirements

> 단계: BuildMap 15단계  
> 성격: User Local Dry-run Runbook & Log Intake  
> 주의: 이 문서는 사용자의 로컬 PC에서 실행할 후보 절차를 정리한다. 이 문서 작성 단계에서는 Supabase CLI, Docker, SQL, DB reset, db lint를 실행하지 않는다.


## 필요한 환경

사용자는 자신의 PC에서 아래 환경을 확인한다.

- Windows, macOS, Linux 중 하나
- 터미널
  - Windows PowerShell
  - Git Bash
  - macOS Terminal
  - Linux shell
- Supabase CLI
- Docker
- Docker daemon 실행 상태
- Git 권장
- ZIP 압축 해제 도구

## 필요하지 않은 것

local dry-run에는 remote Supabase credential이 필요하지 않아야 한다.

- Supabase access token 불필요
- remote DB URL 불필요
- service role key 불필요
- anon key 불필요
- remote project link 불필요

## 설치 안내 원칙

설치 방법은 각 도구의 공식 문서를 따른다. 이 문서 안에서는 오래될 수 있는 설치 명령을 확정하지 않는다. 대신 설치 여부 확인 명령만 제공한다.

## 설치 여부 확인 명령 후보

```bash
supabase --version
docker --version
docker info
git --version
```

## 통과 기준

| 항목 | 통과 기준 |
|---|---|
| Supabase CLI | version 출력 |
| Docker | version 출력 |
| Docker daemon | `docker info` 성공 |
| Git | version 출력 또는 사용자가 branch/workspace를 수동 관리 가능 |
| ZIP | BuildMap 폴더 압축 해제 가능 |

## 실패 시 조치

- Supabase CLI가 없으면 Supabase CLI를 설치한 뒤 다시 preflight를 수행한다.
- Docker가 없으면 Docker를 설치한다.
- Docker daemon이 꺼져 있으면 Docker Desktop 또는 daemon을 실행한다.
- Git이 없어도 진행은 가능하나 disposable workspace 복사 방식이 더 안전하다.

# Supabase Init Guidance

> 단계: BuildMap 15단계  
> 성격: User Local Dry-run Runbook & Log Intake  
> 주의: 이 문서는 사용자의 로컬 PC에서 실행할 후보 절차를 정리한다. 이 문서 작성 단계에서는 Supabase CLI, Docker, SQL, DB reset, db lint를 실행하지 않는다.


## 목적

`supabase/config.toml`이 없으면 `supabase start` 또는 `supabase db reset`이 실패할 수 있다. 이 경우 `supabase init` 후보를 검토할 수 있지만, 원본 프로젝트가 아니라 disposable workspace에서만 허용한다.

## 원칙

- 원본 BuildMap 폴더에서 바로 `supabase init`을 실행하지 않는다.
- disposable workspace에서만 실행 후보로 둔다.
- `supabase init`은 `supabase link`와 다르다.
- `supabase link`는 금지한다.
- init 결과를 원본에 바로 반영하지 않는다.
- init 결과는 dry-run workspace 산출물로만 다룬다.

## config.toml이 이미 있는 경우

- 파일 존재 여부만 확인한다.
- remote project ref가 있는지 확인한다.
- remote link 흔적이 있으면 remote 명령을 중단한다.
- local dry-run에 필요한 최소 설정인지 확인한다.

## config.toml이 없는 경우

disposable workspace 안에서만 아래 후보를 검토한다.

```bash
supabase init
```

## 실행 전 확인

- 현재 위치가 disposable workspace인가?
- 원본 BuildMap 폴더가 아닌가?
- `supabase link`를 실행하지 않을 것인가?
- remote credential을 요구하지 않는가?

## init 후 확인할 항목

- `supabase/config.toml` 생성 여부
- remote project link가 생성되지 않았는지
- `supabase/migrations`에는 임시 복사된 SQL 파일 9개만 있는지
- 원본 프로젝트에는 변경이 없는지

## 실패 시

init이 실패하면 `INIT-FAIL`로 분류한다. 에러 메시지를 마스킹하여 수집한다.

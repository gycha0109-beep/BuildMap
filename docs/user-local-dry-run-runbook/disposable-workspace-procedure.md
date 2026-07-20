# Disposable Workspace Procedure

> 단계: BuildMap 15단계  
> 성격: User Local Dry-run Runbook & Log Intake  
> 주의: 이 문서는 사용자의 로컬 PC에서 실행할 후보 절차를 정리한다. 이 문서 작성 단계에서는 Supabase CLI, Docker, SQL, DB reset, db lint를 실행하지 않는다.


## 왜 disposable workspace가 필요한가

`supabase/migrations_draft`는 정식 migration이 아니다. local dry-run을 위해 임시 `supabase/migrations` 경로가 필요할 수 있지만, 원본 BuildMap 폴더에 이를 영구 생성하면 draft와 정식 migration의 경계가 흐려진다.

따라서 dry-run은 disposable workspace에서만 수행한다.

## 방식 A: 임시 branch 방식

원본 Git 저장소가 있는 경우 사용할 수 있다.

장점:

- 변경 추적이 쉽다.
- dry-run 후 branch를 폐기하기 쉽다.

주의:

- 정식 `supabase/migrations`가 생겨도 dry-run branch 안에서만 유지한다.
- 원본 main 작업물로 merge하지 않는다.

## 방식 B: 임시 폴더 복사 방식

Git 상태가 불명확하거나 안전하게 격리하고 싶을 때 권장한다.

장점:

- 원본 폴더를 직접 건드리지 않는다.
- 실패해도 폴더 삭제로 정리 가능하다.

## 권장 방식

1차 권장 방식은 **임시 폴더 복사 방식**이다. 원본 BuildMap 폴더를 보존하고, dry-run 전용 복사본에서만 `supabase/migrations`를 만든다.

## Windows PowerShell 예시 후보

```powershell
# 사용자가 실행할 후보. 실제 실행 전 경로를 확인한다.
$source = "C:\path\to\BuildMap"
$workspace = "C:\temp\BuildMap-dry-run"
Copy-Item -Recurse -Force $source $workspace
Set-Location $workspace
```

## macOS/Linux Bash 예시 후보

```bash
# 사용자가 실행할 후보. 실제 실행 전 경로를 확인한다.
SOURCE="/path/to/BuildMap"
WORKSPACE="/tmp/BuildMap-dry-run"
rm -rf "$WORKSPACE"
cp -R "$SOURCE" "$WORKSPACE"
cd "$WORKSPACE"
```

## workspace 생성 후 확인할 항목

- 현재 경로가 workspace인지
- 원본 BuildMap 경로가 아닌지
- `supabase/migrations_draft`가 존재하는지
- `supabase/migrations`는 아직 없거나 임시로 만들 준비가 되었는지

## dry-run 후 처리

- 성공/실패 로그를 수집한다.
- workspace는 삭제하거나 로그 분석 전까지 보관한다.
- workspace 전체를 최종 산출물로 포함하지 않는다.
- 원본 `migrations_draft`는 변경하지 않는다.

# 20단계 재실행 가이드

## 목적

20단계 첫 실행에서 발생한 `SEED_FAIL`을 patch한 뒤, 사용자가 로컬 PC에서 P0 script pack을 다시 실행하기 위한 절차를 정리한다.

## 실행 전 확인

- BuildMap 루트에서 실행한다.
- remote Supabase에 연결하지 않는다.
- `supabase link`, `supabase db push`, `supabase db pull`을 실행하지 않는다.
- hosted Supabase SQL Editor를 사용하지 않는다.
- local Docker Supabase DB container만 사용한다.
- secret, token, password, DB URL은 출력하지 않는다.

## 권장 순서

1. local Supabase stack 상태 확인
2. 필요 시 `supabase db reset`으로 local DB를 초기화
3. 현재 local dry-run 구조에서 `migrations_draft`가 local `supabase/migrations`에 반영되어 있는지 확인
4. BuildMap 루트에서 wrapper 실행
5. 로그에서 `SEED_FAIL`, `UNEXPECTED_ALLOW`, `FAIL`, `ERROR` 검색
6. seed가 PASS하면 이후 P0 본 테스트 결과를 공유
7. seed가 다시 실패하면 첫 번째 실패 로그만 공유

## 재실행 명령 후보

PowerShell 기준:

```powershell
.\scripts\manual-local-rls\run-phase20-p0-local.ps1
```

## 가져와야 할 로그

- wrapper가 출력한 log file 경로
- 첫 번째 실패 파일
- 첫 번째 `ERROR` 또는 `UNEXPECTED_ALLOW`
- `SEED-005 feedbacks` count
- `SUMMARY-006 fixture feedbacks` count
- secret 마스킹 확인

## 중단 기준

다음이 발생하면 즉시 중단한다.

- `UNEXPECTED_ALLOW`
- private Project 외부 노출
- Rough Note / AI Draft 외부 노출
- Feedback author spoofing 허용
- approved Change Card core mutation 허용
- remote DB 연결 의심
- secret 출력

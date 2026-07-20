# Preflight Before Manual Test


> 주의: 이 문서는 18단계에서 사용자가 local DB에서 검토 후 실행할 후보 절차를 정리한다.  
> 17단계에서는 SQL, RPC, view, trigger, function permission 테스트를 실행하지 않는다.  
> remote Supabase, staging, production DB 적용은 계속 금지한다.


## 체크리스트

| 항목 | 확인 후보 | 통과 기준 | 실패 시 조치 |
|---|---|---|---|
| local stack | `supabase status` 후보 | local services 표시 | `supabase start` 재확인 |
| db reset 상태 | 16단계 로그 확인 또는 필요 시 local reset 후보 | `Finished supabase db reset on branch main.` | schema 적용 문제로 분류 |
| db lint 상태 | 16단계 로그 확인 또는 필요 시 lint 후보 | `No schema errors found` | lint warning 분류 |
| 테스트 DB local 여부 | connection host/port 확인 | local host/port | remote 의심 시 중단 |
| remote link 없음 | `.supabase` 상태 확인 후보 | remote 연결 흔적 없음 | remote 명령 금지, 중단 |
| SQL draft 적용 상태 | migration 적용 로그 확인 | 9개 draft가 local DB에 적용됨 | migration copy/reset 재확인 |
| `migrations_draft` 원본 | 파일 header 확인 | `DRAFT ONLY` 유지 | 원본 오염 여부 점검 |
| 테스트 로그 위치 | local file path 지정 | secret 없는 로그 저장 위치 | 로그 경로 재지정 |
| secret masking | redaction 기준 확인 | raw token/DB URL 미출력 | 로그 공유 전 마스킹 |
| 중단 조건 숙지 | `stop-and-rollback-rules.md` 확인 | P0 발견 시 중단 | 테스트 진행 금지 |

## 테스트 전 권장 기록

```markdown
- OS:
- 터미널:
- Supabase CLI version:
- Docker version:
- local DB 상태:
- remote 미적용 확인:
- SQL draft 적용 확인:
- 테스트 로그 저장 위치:
```

## local DB reset 여부

수동 테스트 전 local DB를 reset할지는 사용자가 결정한다. reset을 한다면 반드시 local-only workspace에서만 실행한다. reset 후에는 test seed를 처음부터 다시 넣는다.

## 중단 기준

아래 중 하나라도 발생하면 RLS 시나리오 테스트를 시작하지 않는다.

- `auth.uid()` simulation 준비 전 actor별 테스트를 실행하려 함
- remote DB 연결 가능성이 있음
- secret이 로그에 노출됨
- seed 파일/SQL이 remote URL을 참조함

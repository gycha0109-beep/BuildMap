# Manual Test Log Intake Template

17단계 문서 작성 단계에서는 사용하지 않는다. 18단계 실행 후 아래 양식에 맞춰 결과를 가져온다.

```markdown
# BuildMap 18단계 Manual RLS Scenario Test Log Intake

## 1. 실행 환경

- OS:
- 터미널:
- Supabase CLI version:
- Docker version:
- local DB 상태:
- 실행 workspace:
- remote 미적용 확인: 예/아니오
- secret 마스킹 확인: 예/아니오

## 2. auth.uid() simulation 결과

| Actor | 기대 auth.uid() | 실제 결과 | PASS/FAIL/NEEDS_ADJUSTMENT |
|---|---|---|---|
| anon | null |  |  |
| authenticated_owner | owner UUID |  |  |
| authenticated_non_owner | non-owner UUID |  |  |
| feedback_author | feedback author UUID |  |  |

## 3. seed 결과

- seed 성공 여부:
- 실패한 seed:
- 첫 번째 seed error:
- FK/constraint/trigger 문제 여부:

## 4. scenario별 결과

| Area | Scenario ID | Actor | Expected | Actual | Classification | Error Summary |
|---|---|---|---|---|---|---|
| Project |  |  |  |  |  |  |
| Link |  |  |  |  |  |  |
| Change Card |  |  |  |  |  |  |
| Rough Note / AI Draft |  |  |  |  |  |  |
| Feedback |  |  |  |  |  |  |
| View |  |  |  |  |  |  |
| RPC |  |  |  |  |  |  |
| Function |  |  |  |  |  |  |
| Trigger |  |  |  |  |  |  |

## 5. 첫 번째 실패 scenario

- Scenario ID:
- 관련 SQL draft 파일:
- 실행 actor:
- 기대 결과:
- 실제 결과:
- error summary:
- classification:

## 6. unexpected allow 목록

- 없음 / 있음:
- 있다면 scenario ID와 요약:

## 7. unexpected deny 목록

- 없음 / 있음:
- 있다면 scenario ID와 요약:

## 8. trigger error 목록

- 없음 / 있음:

## 9. RPC error 목록

- 없음 / 있음:

## 10. view access error 목록

- 없음 / 있음:

## 11. function permission error 목록

- 없음 / 있음:

## 12. 로그 마스킹 확인

- raw share_token 제거:
- DB URL/password 제거:
- service role/anon key 제거:
- 개인 email 제거:

## 13. 다음 단계 요청

- SQL patch 필요:
- actor simulation patch 필요:
- seed patch 필요:
- public view/RPC boundary patch 필요:
- secure RPC patch 필요:
- trigger patch 필요:
```

# Next Step After Runbook


> 주의: 이 문서는 18단계에서 사용자가 local DB에서 검토 후 실행할 후보 절차를 정리한다.  
> 17단계에서는 SQL, RPC, view, trigger, function permission 테스트를 실행하지 않는다.  
> remote Supabase, staging, production DB 적용은 계속 금지한다.


## 17단계 이후 분기

| 결과 | 다음 단계 |
|---|---|
| runbook 작성 완료 | 18단계 Manual RLS Scenario Test Execution & Log Intake |
| `auth.uid()` simulation 실패 | Actor Simulation Patch |
| seed 실패 | Test Data Seed Patch |
| `UNEXPECTED_ALLOW` 발생 | Security Patch |
| `UNEXPECTED_DENY` 발생 | RLS Policy Patch |
| `VIEW_ACCESS_ERROR` 발생 | Public View / RPC Boundary Patch |
| `RPC_ERROR` 발생 | Secure RPC Patch |
| `TRIGGER_ERROR` 발생 | Trigger Patch |
| `GRANT_ERROR` 발생 | Function Permission Patch |
| 모든 P0/P1 PASS | 정식 migration 승격 검토 전 단계 |

## 18단계 입력

18단계에서 사용자가 가져와야 할 최소 결과:

1. `auth.uid()` simulation 결과
2. seed 성공/실패 결과
3. P0 scenario 결과
4. 첫 번째 실패 scenario와 error summary
5. `UNEXPECTED_ALLOW` 목록
6. public-safe view 제외 column 확인 결과
7. secure RPC token scenario 결과
8. trigger behavior 결과
9. remote 미적용 확인

## 계속 금지되는 것

- remote Supabase migration
- production/staging DB 적용
- 정식 migration 승격
- API route 구현
- frontend 구현
- 자동화 테스트 코드 작성

# Next Action After Manual Test

## 결과별 분기

| 수동 테스트 결과 | 다음 단계 |
|---|---|
| 모든 핵심 테스트 PASS | 정식 migration 승격 검토 전 단계로 이동 후보 |
| `UNEXPECTED_ALLOW` 발생 | blocker security patch 단계로 이동 |
| `UNEXPECTED_DENY` 발생 | policy/helper/view patch 단계로 이동 |
| `RPC_ERROR` 발생 | secure RPC patch 단계로 이동 |
| `TRIGGER_ERROR` 발생 | trigger patch 단계로 이동 |
| `VIEW_ACCESS_ERROR` 발생 | view/RPC/API boundary patch 단계로 이동 |
| `GRANT_ERROR` 발생 | function grant patch 단계로 이동 |
| `ENV_ERROR` 발생 | local environment 보정 단계로 이동 |
| `TEST_DATA_ERROR` 발생 | test data setup 보정 후 재실행 |

## 모든 핵심 테스트 PASS 시

- 아직 즉시 remote 적용하지 않는다.
- 정식 `supabase/migrations` 승격 여부를 별도 단계에서 검토한다.
- migration file ordering, rollback/repair plan, remote safety checklist를 별도 문서로 확인한다.

## blocker 발생 시

- remote 적용은 계속 금지한다.
- SQL patch scope를 열어 최소 수정한다.
- 수정 후 local db reset/lint/manual scenario를 반복한다.

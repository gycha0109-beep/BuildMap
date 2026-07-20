# Failure Classification

| Signal | 의미 | 조치 |
|---|---|---|
| `UNEXPECTED_ALLOW` | 차단돼야 할 read/write/integrity 변경이 허용됨 | blocker, 즉시 최소 policy/trigger patch |
| `VIEW_BOUNDARY_FAIL` | public-safe view에서 비공개/민감/내부 row 또는 column 노출 | blocker |
| `UNEXPECTED_DENY` | 허용돼야 할 owner/public 기능이 차단됨 | access-path/RLS 회귀 분석 |
| `POLICY_FAIL` | policy 존재/행위 불일치 | USING/WITH CHECK 검토 |
| `TRIGGER_FAIL` | exact integrity trigger contract 불일치 | trigger function/ordering 검토 |
| `GRANT_FAIL` | RLS 도달 전 object privilege 차단 | broad grant 금지, operation-specific 최소 grant 검토 |
| `SEED_FAIL` | fixture 불완전 | 정책 판정 전 seed만 보정 |
| `AUTH_CONTEXT_FAIL` | `auth.uid()`/profile actor simulation 실패 | actor setup 보정 |
| `SCENARIO_COVERAGE_FAIL` | expected scenario 누락/중복/충돌 | wrapper/SQL oracle 보정 |
| `ENV_ERROR` | local environment prerequisite 실패 | DB reset/container 상태 확인 |

## 금지

- `UNEXPECTED_ALLOW`를 `EXPECTED_DENY`로 이름만 바꾸지 않는다.
- source-table anon grant를 broad하게 추가하지 않는다.
- linked-card 공개 조건을 view에서만 맞추고 source RLS/helper 불일치를 방치하지 않는다.
- baseline hash를 실패 회피용으로 자동 갱신하지 않는다.

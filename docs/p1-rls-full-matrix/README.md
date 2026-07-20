# Phase27 P1 RLS Full Matrix

## 목적

P0와 Link Sharing에서 다루지 않은 BuildMap 핵심 RLS·integrity 경계를 local-only matrix로 검증한다.

## 실행 파일

```text
scripts/manual-local-rls-p1/
├─ phase27_p1_scenario_manifest.json
├─ phase27_00_preflight.sql
├─ phase27_01_seed_p1_fixture.sql
├─ phase27_02_problem_hypothesis_matrix.sql
├─ phase27_03_feedback_request_matrix.sql
├─ phase27_04_project_links_matrix.sql
├─ phase27_05_change_card_mutation_matrix.sql
├─ phase27_06_profile_discovery_matrix.sql
├─ phase27_07_integrity_permission_matrix.sql
├─ phase27_99_result_summary.sql
└─ run-phase27-p1-local.ps1
```

## 현재 규모

- SQL files: 9
- expected scenarios: 181
- fixture actor: 5 auth users, 4 user profiles, 3 builder profiles
- fixture project: 5

## 결과 원칙

- `PASS`: 허용 경계가 기대대로 작동
- `EXPECTED_DENY`: 차단 경계가 기대대로 작동
- `UNEXPECTED_ALLOW`: 보안/무결성 blocker
- `UNEXPECTED_DENY`: 정상 기능 회귀
- `POLICY_FAIL`, `TRIGGER_FAIL`, `VIEW_BOUNDARY_FAIL`: 구현 경계 실패
- `GRANT_FAIL`, `ENV_ERROR`, `SEED_FAIL`, `AUTH_CONTEXT_FAIL`: 선행조건 또는 실행 경계 문제

Phase27 첫 사용자 로컬 실행은 `OverallResult: FAIL`로 실제 access/integrity blocker를 검출했다. Phase27.1은 기대값을 완화하지 않고 additive migration draft 09와 강화된 181-scenario matrix로 보정한다. 현재 상태는 static reviewed / user local rerun pending이다.

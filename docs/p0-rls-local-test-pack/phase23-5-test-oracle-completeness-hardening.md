# Phase23.5 P0 Test Oracle Completeness & Wrapper False-negative Guard Hardening

## 목적

이 문서는 Phase23 이후 확인된 test harness assurance gap을 정리한다. 사용자 네 번째 local 실행의 P0 PASS 판정은 유지한다. 이번 단계는 schema, RLS policy, public-safe view execution model, P0 scenario 설계를 바꾸는 단계가 아니다.

## 확인된 gap

| 항목 | 내용 | 분류 |
|---|---|---|
| `NEEDS_REVIEW` 미반영 | `phase20_07_approved_change_card_trigger_p0.sql`은 `TRG-P0-008`, `TRG-P0-009`에서 `NEEDS_REVIEW`를 출력할 수 있었지만 wrapper final result에는 반영되지 않았다. | `WRAPPER_FALSE_NEGATIVE_RISK` |
| inert signal | `SEED_FAIL`, `AUTH_CONTEXT_FAIL`, `TRIGGER_FAIL`이 token으로는 존재하지만 final flag와 exit code에 완전 반영되지 않았다. | `WRAPPER_FALSE_NEGATIVE_RISK` |
| taxonomy mismatch | 문서의 failure taxonomy와 wrapper runtime taxonomy가 일치하지 않았다. | `TEST_ORACLE_COMPLETENESS_GAP` |
| broad expected deny | 일부 `when others`가 unrelated error까지 `EXPECTED_DENY`로 처리할 수 있었다. | `TEST_ORACLE_COMPLETENESS_GAP` |
| missing scenario 가능성 | 특정 scenario가 출력되지 않아도 file exit code 0과 일부 `PASS`/`EXPECTED_DENY`만으로 `OverallResult: PASS`가 가능했다. | `SCENARIO_COVERAGE_GAP` |
| `public_project_links` 약한 assertion | `VIEW-P0-008`이 query 성공만 확인하고 expected fixture count를 확인하지 않았다. | `SCENARIO_COVERAGE_GAP` |

## 보정 방향

1. wrapper가 runtime-relevant taxonomy를 모두 exact token으로 인식한다.
2. 모든 runtime signal은 final flag, `OverallResult`, exit code에 반영한다.
3. `EXPECTED_DENY`는 의도한 SQLSTATE/message 또는 결과 형태와 일치할 때만 출력한다.
4. `when others`는 default expected deny가 아니라 `SCRIPT_ERROR`, `TRIGGER_FAIL`, `POLICY_FAIL`, `NEEDS_REVIEW`로 분류한다.
5. SQL file별 expected scenario manifest를 두고 missing/duplicate/conflicting status를 감지한다.
6. seed는 count와 actor context를 machine-readable `PASS`/`SEED_FAIL`/`AUTH_CONTEXT_FAIL`로 출력한다.
7. `public_project_links`는 expected public fixture count가 정확히 1인지 확인한다.

## 기존 P0 PASS와의 관계

사용자 네 번째 local 실행에서 제공된 P0 PASS는 유지한다. Phase23.5는 이미 확인된 policy failure를 고치는 단계가 아니라, future false-negative와 oracle ambiguity를 줄이는 harness assurance patch다.

## 재실행 정책

Phase23.5는 SQL test oracle과 wrapper coverage logic을 수정하므로, 사용자는 local PC에서 phase20 wrapper를 다시 실행한다. 이 실행은 DB policy patch 검증이 아니라 다음을 확인하기 위한 wrapper/test-oracle assurance verification이다.

- exact negative-control oracle
- full signal taxonomy
- expected scenario coverage
- seed count assertions
- `public_project_links` positive count
- `OverallResult: PASS`
## Phase23.6 후속 보정

Phase23.5 결과물의 test oracle 방향은 유지한다. 다만 해당 ZIP의 wrapper 최종 조건문에 `elselseif` 2건이 있어 실제 실행 전에 parse될 수 없었고, result parser가 설명문을 재검색하는 결정성 문제가 남아 있었다.

Phase23.6에서 다음을 보정했다.

- invalid keyword 제거
- external PowerShell parse gate 문서화
- PRE-005~013 및 PRE-014 계열 manifest 확장
- result-position exact signal parsing
- hard failure와 `NEEDS_REVIEW` file summary 분리
- SUMMARY-020 단일 status 판정

사용자 네 번째 실행에서 확정한 기존 P0 PASS는 유지한다. Phase23.6 이후 wrapper 실행은 test harness assurance verification이다.

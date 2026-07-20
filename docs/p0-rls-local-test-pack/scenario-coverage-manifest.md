# Scenario Coverage Manifest

## 목적

Phase23.5부터 wrapper는 SQL file별 expected scenario/check ID를 manifest로 관리한다. SQL file의 `ExitCode = 0`만으로 성공 처리하지 않고, expected ID가 모두 machine-readable status를 출력했는지 확인한다.

## 대상 파일

| File | Manifest 성격 |
|---|---|
| `phase20_00_preflight.sql` | auth context, privilege, view option, source deny, forbidden column preflight |
| `phase20_01_seed_p0_fixture.sql` | seed fixture count와 actor context prerequisite |
| `phase20_02_project_access_p0.sql` | project access P0 scenarios |
| `phase20_03_rough_note_ai_draft_p0.sql` | Rough Note / AI Draft P0 scenarios |
| `phase20_04_change_card_public_boundary_p0.sql` | Change Card public boundary P0 scenarios |
| `phase20_05_feedback_author_spoofing_p0.sql` | Feedback insert/spoofing/public view P0 scenarios |
| `phase20_06_public_safe_view_p0.sql` | 8 public-safe view runtime checks |
| `phase20_07_approved_change_card_trigger_p0.sql` | approved Change Card trigger P0 scenarios |
| `phase20_99_result_summary.sql` | final summary checks |

## wrapper file summary

각 file 처리 후 wrapper는 다음을 출력한다.

```text
FileResult: <file>
ExitCode: <code>
ExpectedScenarioCount: <number>
ObservedScenarioCount: <number>
MissingScenarioIds: <none or list>
DuplicateScenarioIds: <none or list>
ConflictingScenarioIds: <none or list>
ParsedSignals: <summary>
FileOverallResult: <PASS/NEEDS_REVIEW/FAIL/ERROR>
```

## failure rule

정상 path에서 expected scenario/check ID가 누락되면 `SCENARIO_COVERAGE_FAIL`이다. 동일 scenario ID가 충돌 status를 둘 이상 출력하면 `SCENARIO_COVERAGE_FAIL` 또는 `SCRIPT_ERROR`로 본다.
## Phase23.6 preflight manifest expansion

`phase20_00_preflight.sql`의 expected manifest에 다음 prerequisite ID를 추가한다.

- `PRE-005`~`PRE-010`: core table/view 존재 여부
- `PRE-011`~`PRE-013`: helper function 존재 여부
- `PRE-014-projects`
- `PRE-014-rough_notes`
- `PRE-014-ai_structured_drafts`
- `PRE-014-change_cards`
- `PRE-014-feedback_requests`
- `PRE-014-feedbacks`

PRE-005~013은 `PASS` 또는 `ENV_ERROR`, PRE-014 계열은 `PASS` 또는 `POLICY_FAIL`을 출력한다. 누락, 중복, 상충 status는 기존과 같이 `SCENARIO_COVERAGE_FAIL`이다.

## deterministic parser rule

- psql table row는 scenario/check ID가 있는 cell과 exact result cell을 분리해 판독한다.
- `NOTICE/WARNING/ERROR` line은 scenario ID 직후 첫 signal token만 판독한다.
- 설명문 안의 일반 `PASS`, `FAIL`, `ERROR` 단어는 추가 signal이 아니다.
- `PASS/RECORDED`는 `PASS`로 정규화한다.

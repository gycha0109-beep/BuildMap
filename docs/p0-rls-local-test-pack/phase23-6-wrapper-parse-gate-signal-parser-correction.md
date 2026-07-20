# Phase23.6 Wrapper Parse Gate & Deterministic Signal Parser Correction

## 목적

Phase23.6은 Phase23.5 test oracle 보강 결과물에서 발견된 PowerShell parse error와 signal parser 결정성 문제를 최소 보정한다. 사용자 Phase20 네 번째 로컬 실행의 기존 P0 PASS 판정은 유지한다. 이번 단계는 migration, schema, RLS policy 또는 public-safe view execution model을 수정하지 않는다.

## 발견된 문제

| 문제 | 영향 | 분류 |
|---|---|---|
| wrapper 최종 조건문에 `elselseif` 2건 존재 | PowerShell이 wrapper body 실행 전에 parse 단계에서 중단 | `SCRIPT_PARSE_ERROR` |
| PowerShell static parse gate 부재 | syntax defect가 로컬 실행 직전에야 발견됨 | `WRAPPER_STATIC_VALIDATION_GAP` |
| PRE-005~013이 boolean 출력만 제공 | object/helper prerequisite 누락이 scenario coverage에 포함되지 않음 | `PREFLIGHT_MANIFEST_COVERAGE_GAP` |
| RLS enabled 목록이 machine-readable status가 아님 | RLS 비활성화가 coverage gate에 직접 반영되지 않음 | `PREFLIGHT_MANIFEST_COVERAGE_GAP` |
| 설명문 전체에서 signal token 재검색 | `unexpected error` 같은 설명 단어가 별도 `ERROR`로 중복 판독될 수 있음 | `SIGNAL_PARSER_DETERMINISM_GAP` |
| hard failure도 `FileOverallResult: NEEDS_REVIEW` 가능 | file summary 의미가 최종 exit classification과 불일치 | `FILE_RESULT_CLASSIFICATION_GAP` |
| SUMMARY-020이 먼저 PASS 후 별도 failure 출력 가능 | 동일 검증 block에서 상충 status 발생 가능 | `SUMMARY_RESULT_CONFLICT_GAP` |

## 적용한 보정

1. `elselseif` 2건을 정상 `elseif`로 수정했다.
2. wrapper header를 Phase23.6 patch level로 갱신했다.
3. PRE-005~013을 `PASS` 또는 `ENV_ERROR` 결과로 변경하고 manifest에 포함했다.
4. RLS 대상 6개 table을 `PRE-014-<table>` ID로 분리하고 `PASS` 또는 `POLICY_FAIL`을 출력한다.
5. parser는 psql table row의 exact result cell 또는 `NOTICE/WARNING/ERROR`의 scenario ID 직후 첫 signal만 판독한다.
6. 설명문 나머지에서 `PASS`, `FAIL`, `ERROR` 등을 재검색하지 않는다.
7. `PASS/RECORDED`는 `PASS`로 정규화한다.
8. hard failure와 review signal을 `FileOverallResult`에서 분리한다.
9. SUMMARY-020은 모든 public-safe boundary count를 평가한 뒤 `PASS`, `VIEW_BOUNDARY_FAIL`, `VIEW_ACCESS_ERROR`, `SCRIPT_ERROR` 중 하나만 출력한다.

## 기존 P0 PASS와의 관계

Phase23.6은 이전에 확인된 DB policy failure를 수정하는 단계가 아니다. 사용자 네 번째 로컬 실행에서 확인한 기존 P0 PASS는 취소하지 않는다. 이번 보정 후 실행은 wrapper parse 가능성, deterministic signal parsing, expanded prerequisite coverage를 확인하는 assurance verification이다.

## 변경하지 않은 경계

- `supabase/migrations_draft/*.sql`
- RLS policy
- public-safe view definition
- anon source table direct revoke
- authenticated source-table RLS path
- broad grant 금지
- remote 적용 금지

## 실행 전 조건

사용자는 wrapper 실행 전에 `powershell-static-parse-validation-guide.md`의 parser check를 실행한다. `POWERSHELL_PARSE_CHECK: FAIL`이면 wrapper를 실행하지 않는다.

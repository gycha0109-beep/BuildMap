# Decision: Phase23.6 Wrapper Parse Gate & Deterministic Signal Parser Correction Scope

## 확정

- 사용자 Phase20 네 번째 로컬 실행의 기존 P0 PASS 판정은 유지한다.
- Phase23.5 wrapper의 `elselseif` 2건은 `SCRIPT_PARSE_ERROR`다.
- 두 키워드를 `elseif`로 보정한다.
- wrapper 실행 전에 외부 PowerShell parser check를 수행한다.
- PRE-005~013 object/helper prerequisite를 machine-readable result와 scenario manifest에 포함한다.
- RLS 대상 6개 table은 `PRE-014-<table>`로 분리해 `PASS` 또는 `POLICY_FAIL`을 출력한다.
- signal parser는 result position에서 exact token 하나만 판독한다.
- 설명문 안의 일반 `pass`, `fail`, `error` 단어를 signal로 재해석하지 않는다.
- hard failure는 `FileOverallResult: FAIL`, prerequisite/review 상태는 `NEEDS_REVIEW`로 분리한다.
- SUMMARY-020은 단일 일관된 status만 출력한다.
- migration draft, RLS policy, public-safe view execution model은 수정하지 않는다.
- broad grant를 추가하지 않는다.
- remote 적용과 정식 migration 승격은 계속 금지한다.

## 정적 검토 결과

- `elselseif`: 0건
- `elseifelseif`: 0건
- `elseelseif`: 0건
- PRE-005~013 manifest 포함
- PRE-014 6개 RLS scenario manifest 포함
- SUMMARY-020 단일 result 구조 적용

현재 작업 환경에는 PowerShell runtime이 없어 `Parser.ParseFile()`은 실제 실행하지 않았다. 사용자가 로컬 PC에서 parse check를 수행해야 한다.

## 보류

- wrapper 실제 실행
- SQL/RLS/view runtime 재검증
- Phase24 Link Sharing Secure RPC Full Matrix
- P1/P2/P3 RLS test
- remote migration
- 정식 `supabase/migrations` 승격
- API/frontend integration

## Phase24 진입 조건

- `POWERSHELL_PARSE_CHECK: PASS`
- wrapper `ExitCode = 0`
- 모든 `FileOverallResult: PASS`
- `OverallResult: PASS`
- `MissingScenarioIds: none`
- `DuplicateScenarioIds: none`
- `ConflictingScenarioIds: none`
- failure/review signal 없음
- remote command 없음
- secret 노출 없음

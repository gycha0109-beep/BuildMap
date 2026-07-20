# Runtime Log Attestation Contract

## 목적

Phase26 gate의 `-PassLogPath`는 SQL 결과를 다시 해석하지 않는다. Phase25 wrapper가 생성한 최종 구조화 결과가 완전한 PASS 증거인지 검증한다.

## 필수 조건

- `OverallResult: PASS` 정확히 1개
- `Remote commands used: none` 정확히 1개
- `FileResult` 정확히 8개
- 각 FileResult `ExitCode=0`
- 각 FileResult `FileOverallResult=PASS`
- 각 파일의 expected count가 baseline manifest와 일치
- 각 파일의 observed count가 expected count와 일치
- `MissingScenarioIds=none`
- `DuplicateScenarioIds=none`
- `ConflictingScenarioIds=none`
- expected/observed 총합 107
- blocker/review/error boolean flag 전부 False

## 검증하지 않는 것

- 사용자가 실제로 어떤 Docker image를 사용했는지
- Supabase CLI 버전
- OS-level process provenance
- 로그 파일의 암호학적 서명
- hosted 환경과의 동등성

이 한계를 이유로 Phase25 baseline은 `USER_LOCAL_PASS`로 분류한다.

## 로그 보존

로그를 docs에 포함할 때는 다음을 제거하거나 확인한다.

- raw share token
- token hash
- password
- anon/service-role key
- remote DB URL
- 개인 식별 정보

Phase25 wrapper는 원칙적으로 local fixture token을 출력하지 않아야 한다.

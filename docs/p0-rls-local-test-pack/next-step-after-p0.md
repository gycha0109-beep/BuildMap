# Next Step After P0

## 모든 P0 PASS

P1/P2 manual RLS test pack 또는 link sharing RPC test pack으로 이동한다.

## UNEXPECTED_ALLOW

후속 Security Patch로 이동한다. private data 노출, Rough Note/AI Draft 노출, Feedback author spoofing 허용, approved Change Card mutation 허용은 즉시 blocker다.

## UNEXPECTED_DENY

정책이 너무 좁게 막힌 경우다. 후속 Policy Adjustment로 이동한다.

## SEED_FAIL

Seed Script Patch로 이동한다.

## TRIGGER_FAIL

Trigger Patch로 이동한다.

## VIEW_EXPOSURE_FAIL

Public View Boundary Patch로 이동한다.

## ENV_ERROR

Local Environment Fix로 이동한다.

## Phase21 이후 분기

- 모든 P0 PASS: P1/P2 또는 link sharing RPC matrix로 이동.
- `GRANT_FAIL`: 최소 privilege 또는 function/view grant patch로 이동.
- `ACCESS_PATH_MISMATCH`: P0 script access path patch로 이동.
- `VIEW_ACCESS_ERROR`: public-safe view execution model 또는 RPC/API boundary patch로 이동.
- `UNEXPECTED_ALLOW`: P0 Security Patch로 이동.

## Phase22 note

Phase22 이후 분기: `VIEW_ACCESS_ERROR`는 view execution boundary patch 재검토, `VIEW_BOUNDARY_FAIL`은 security patch, 모든 P0 PASS는 다음 manual RLS pack으로 이동한다.

## Phase22.5 next-step update

네 번째 실행에서 `public_builder_profiles` 관련 `VIEW_ACCESS_ERROR` 또는 `VIEW_BOUNDARY_FAIL`이 나오면, 다음 단계는 public-safe view boundary patch가 아니라 해당 view의 definition/grant/runtime coverage를 우선 재검토한다.

8개 public-safe view가 모두 PASS하고 P0 blocker가 없을 때만 다음 P0/P1 후속 단계로 진행한다.

## Phase23 post-P0 next step

Phase20 P0 local RLS test는 사용자 제공 로그 기준 PASS로 intake한다. Phase23 이후 선택 가능한 다음 단계는 다음이다.

1. `Link Sharing Secure RPC Full Matrix` - 권장 1순위
2. `P1/P2 Manual RLS Scenario Pack` - 권장 2순위

Link sharing secure RPC를 우선하는 이유는 share token no/wrong/revoked/reissued, token rotation/revocation, private transition, secure RPC `EXECUTE`/`search_path`가 외부 공유 보안 경계와 직접 연결되기 때문이다.


## Phase23.5 이후 분기

Phase23.5 wrapper assurance verification이 `OverallResult: PASS`, `MissingScenarioIds: none`, `DuplicateScenarioIds: none`을 출력하면 Phase24로 이동할 수 있다. Phase24 권장 주제는 Link Sharing Secure RPC Full Matrix다.


## Phase24 진입 결과

Phase24에서 `Link Sharing Secure RPC Full Matrix` 설계 및 local-only script pack을 작성했다. 다음 실제 실행 단계는 Phase25다.

Phase25 PASS 조건:

- PowerShell parse check PASS
- wrapper ExitCode 0
- 모든 `FileOverallResult: PASS`
- missing/duplicate/conflicting scenario 없음
- `OverallResult: PASS`
- remote command 및 secret 노출 없음

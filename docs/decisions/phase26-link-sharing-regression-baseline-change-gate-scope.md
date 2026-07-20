# Phase26 Link Sharing Regression Baseline & Change Gate Scope

## 확정

- 사용자 로컬 Phase25 `OverallResult: PASS`를 현재 link-sharing runtime 기준선으로 수용한다.
- 기준선 증거 등급은 `USER_LOCAL_PASS`다.
- migration draft 9개, Phase25 SQL 8개, Phase25 runner 1개를 SHA-256 보호 대상으로 고정한다.
- scenario contract는 8개 파일, 총 107개다.
- Phase26 gate는 기본적으로 DB에 연결하지 않는 정적 gate다.
- 기존 Phase25 로그가 있으면 `-PassLogPath`로 구조화 PASS를 재검증할 수 있다.
- baseline 자동 갱신 기능은 만들지 않는다.
- remote Supabase 적용과 정식 migration 승격은 계속 금지한다.
- 이후 모든 단계는 `docs/handoff/`의 누적 handoff를 함께 갱신한다.

## 변경하지 않음

- SQL schema
- RLS policy
- public-safe view
- link-sharing RPC response contract
- token lifecycle
- GRANT
- Phase25 expected scenario ID
- Phase25 wrapper result classification

## 보류

- hosted Supabase 적용
- production migration 승격
- signed runtime attestation
- CI runner 연동
- API/frontend integration
- rate limiting/token expiry/HMAC pepper

## 다음 권장 단계

Phase27은 P0 밖의 RLS 경계를 확장하는 P1 Full Matrix를 우선 검토한다.

- Problem/Hypothesis owner/non-owner mutation
- Feedback Request state/visibility
- Project Links owner/public boundary
- approved Change Card mutation 확대
- user profile/discovery read boundary

Phase25 link-sharing baseline은 Phase27과 독립된 보호 기준선으로 유지한다.

# BuildMap Migration Promotion Readiness

> **Status: SUPERSEDED AS CURRENT AUTHORITY**
>
> 이 디렉터리는 Phase29–31 migration promotion / target attestation / staging reconciliation의 historical evidence를 보존한다. 현재 상태는 `docs/handoff/CURRENT-HANDOFF.md`와 `docs/README.md`를 우선 기준으로 본다.

## Phase29 historical starting point

초기 Phase29는 migration drafts `00–09`의 promotion readiness를 판정했고 당시 결과는 `PROMOTION_HOLD`였다.

당시 HOLD 사유:

1. `public.is_feedback_author(uuid)`의 residual `SECURITY DEFINER` search-path hardening 필요
2. fresh-install replay evidence 미완료
3. incremental-upgrade replay evidence 미완료

이 판정은 이후 단계에서 해소됐다.

## Subsequent closure

- Phase29.1: residual `SECURITY DEFINER` boundary hardening
- Phase29.2: fresh/incremental replay evidence closure → `PROMOTION_READY`
- Phase30: formal migration promotion bundle closure
- Phase30.5: hosted target read-only attestation
- Phase31: already-applied staging reconciliation + CI lifecycle closure

현재 Phase31은 `CLOSED`이며 production deployment는 `OUT_OF_SCOPE`다.

## Directory purpose

이 디렉터리의 문서는 다음을 보존한다.

- canonical migration inventory/dependency contract
- static destructive/privilege/security-definer review
- PostgreSQL catalog checks
- fresh-install/incremental replay evidence contracts
- target-project attestation design/review
- staging reconciliation design/review
- forward-fix/recovery planning
- historical user-local attestations

과거 문서 내부의 `PENDING`, `HOLD`, `DRAFT` 문자열은 해당 Phase 시점의 상태이며 현재 프로젝트 상태로 해석하지 않는다.

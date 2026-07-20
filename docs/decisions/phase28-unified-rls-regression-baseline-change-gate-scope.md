# Decision: Phase28 Unified RLS Regression Baseline & Change Gate Scope

## Status

Accepted for local validation.

## Decision

Protect the accepted Phase20, Phase25, and Phase27.1 RLS contracts through one local-only static manifest and gate.

## Fixed baseline

- migration drafts `00–09`;
- 46 protected files;
- 3 packs;
- 26 SQL scenario files;
- 435 scenarios.

## Rationale

The previous Phase26 gate protected only Link Sharing. Phase27.1 introduced a new additive security migration and 181 P1 scenarios, so continued reliance on the narrower baseline would leave P0/P1 drift and unlisted migration additions outside one canonical gate. The final scope also protects the four executable Phase28 PowerShell files so accidental gate-implementation drift is detected.

## Constraints

- no hosted/remote connection;
- no migration promotion;
- no automatic hash refresh;
- no expected-result weakening;
- no replacement of runtime wrappers by the static gate;
- evidence remains `USER_LOCAL_PASS`.

## Next decision

After user local `Phase28GateResult: PASS`, proceed to migration-promotion readiness without promoting or applying migrations remotely.

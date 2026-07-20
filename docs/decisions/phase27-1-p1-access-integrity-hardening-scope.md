# Phase27.1 P1 Access & Integrity Hardening Scope Decision

## Accepted scope

- fix all blocker classes exposed by the first Phase27 user-local run;
- add one forward-only migration draft rather than editing Phase25-protected migration drafts;
- preserve public-safe view projections and Link Sharing RPC response contracts;
- strengthen scenario oracles where review found false-negative risk.

## Excluded scope

- remote/staging/production application;
- formal migration promotion;
- administrative ownership-transfer RPC design;
- Phase26 baseline refresh before Phase27.1 user-local PASS;
- application frontend/backend integration.

## Gate

Phase27.1 remains pending until one clean local reset reports Phase20 P0 `OverallResult: PASS`, Phase26 `Phase26GateResult: PASS`, and all 181 Phase27.1 scenarios with `OverallResult: PASS`.

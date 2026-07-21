# Phase28 Static Validation

## Result

`PASS`

## Verified

- manifest JSON parses successfully;
- protected files: 46/46 present;
- normalized SHA-256: 46/46 match;
- packs: 3;
- scenario files: 26;
- expected scenarios: 435;
- unique scenario IDs: 435;
- Phase20: 147;
- Phase25: 107;
- Phase27.1: 181;
- exact-source scenario mismatches: 0;
- duplicate scenario ownership: 0;
- protected path duplicates: 0;
- executable Phase28 scripts protected: 4/4;
- malformed `FileResult` fail-closed guard: present;
- blocker/unknown `ParsedSignals` rejection: present;
- migration/test inventory mismatches: 0;
- invalid UTF-8 protected files: 0;
- ambiguous PowerShell `$variable:` references: 0;
- `elselseif`: 0;
- delimiter balance: PASS;
- prohibited executable remote-command matches: 0.

## Mutation checks

The static audit model rejects:

- a one-byte protected-file change;
- an added migration draft SQL file;
- a removed exact-source scenario ID;
- an added exact-source scenario ID;
- duplicate scenario ownership;
- a hard-coded pack count, path, regex, flag, or validation-mode drift;
- count drift from 46/3/26/435;
- automatic baseline refresh enabled;
- a missing required PASS log under `-RequireAllPassLogs`.

## Limitation

PowerShell's native parser and the gate itself must still run on the user's local Windows environment. Docker, Supabase CLI, and SQL execution are not required for Phase28.

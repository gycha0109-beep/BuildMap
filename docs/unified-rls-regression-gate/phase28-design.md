# Phase28 Design

## Objective

Create a fail-closed, local-only static change gate for all accepted BuildMap RLS test baselines without executing a database command.

## Inputs protected

1. migration draft SQL `00–09`;
2. Phase20 P0 runner and SQL contract;
3. Phase25 Link Sharing runner and SQL contract;
4. Phase27.1 P1 runner, external manifest, and SQL contract;
5. Phase26 Link Sharing baseline manifest and gate;
6. the four executable Phase28 gate scripts.

## Baseline dimensions

- 46 protected files
- 3 test packs
- 26 scenario files
- 435 unique scenario IDs

## Gate responsibilities

### Content drift

Every protected UTF-8 text file has a SHA-256 digest. The digest normalizes BOM and line endings so a Windows checkout does not create a false mismatch.

### Inventory drift

The gate compares exact directory inventories for:

- migration draft SQL;
- Phase20 SQL;
- Phase25 SQL;
- Phase27 SQL.

An unlisted extra migration or test SQL file is a blocker, not an ignored file.

### Scenario-contract drift

The gate validates:

- fixed pack IDs and counts;
- exact scenario IDs and global uniqueness;
- exact SQL source IDs for Phase20 files whose IDs are statically emitted, all Phase25 files, and all Phase27 files;
- protected embedded/generated Phase20 contracts for the two files whose runtime IDs are constructed dynamically.

### Runner assurance

All relevant PowerShell runners and gates are parsed using the PowerShell parser. Executable text is scanned for prohibited remote-capable commands.

### Optional runtime attestation

Each supplied wrapper log must contain:

- exactly one `OverallResult: PASS`;
- exactly one `Remote commands used: none`;
- all blocker flags exactly once and `False`;
- required positive flags exactly once and `True`;
- the exact expected `FileResult` set;
- zero exit codes;
- matching expected/observed counts;
- no missing, duplicate, or conflicting scenario IDs;
- every `FileOverallResult=PASS`.

A supplied malformed log fails the gate. No supplied log is silently reclassified as `SKIPPED`.

## Non-goals

Phase28 does not:

- execute Docker, Supabase CLI, `psql`, or SQL;
- connect to hosted Supabase;
- promote migration drafts;
- modify RLS, RPC, trigger, grant, or view design;
- create a new runtime PASS claim.

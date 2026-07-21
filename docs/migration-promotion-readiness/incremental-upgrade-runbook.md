# Incremental Upgrade Runbook

## Purpose

Simulate the real upgrade path from an existing `00–08` database to migration `09`.

## Required fixture boundary

Before applying 09, retain representative rows for:

- active and disabled users;
- private, public, and link-shared Projects;
- raw and revoked share-token state;
- draft and approved Change Cards;
- public and internal Feedback Requests;
- internal and public-selected Feedback;
- Project Links;
- archived child records.

## Sequence

1. initialize a disposable local database with `00–08`;
2. seed the representative fixture;
3. record pre-upgrade row counts and stable IDs;
4. apply only migration 09;
5. verify row counts and stable IDs are unchanged;
6. run the Phase29 catalog readiness wrapper;
7. run Phase20, Phase25, Phase27.1, and Phase28;
8. record incremental evidence.

## Evidence shape

```text
EvidenceType: INCREMENTAL_00_08_TO_09
RemoteCommandsUsed: none
MigrationOrderResult: PASS
CatalogReadinessResult: PASS
Phase20Result: PASS
Phase25Result: PASS
Phase27Result: PASS
Phase28GateResult: PASS
OverallResult: PASS
```

## Failure handling

Do not edit migration 09 after it has been promoted anywhere. Create a new forward-fix migration and preserve the failing database/log as evidence.

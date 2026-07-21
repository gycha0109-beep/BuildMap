# Phase29.2 Design Review

## Scope

Close the remaining promotion HOLD by producing independent fresh-install `00–10` and incremental `00–09 → 10` evidence from the disposable local Supabase stack.

## Approved design

- preserve migration drafts and replay mirrors `00–10` unchanged;
- execute fresh and incremental paths as separate database rebuilds;
- fresh path: `supabase db reset --no-seed` and exact `00–10` history verification;
- incremental path: reset through `20260720000000`, verify the historical precondition, then run `supabase migration up --local`;
- require the incremental applied-version delta to be exactly `20260721000000`;
- rerun Phase20, Phase25, and Phase27.1 on both paths;
- pass each new runtime log to Phase28 with `-RequireAllPassLogs`;
- require Phase29 catalog coverage `26/26` on both paths;
- bind evidence to current Git HEAD, baseline ID, migration-set digest, and protected-gate-set digest;
- require different evidence paths and different RunId values;
- allow `PROMOTION_READY` only when both evidence files validate against the same current HEAD;
- write local evidence only below `.local-evidence/`, excluded from Git.

## Design review corrections

1. Manually authored evidence text was rejected because it could claim PASS without executing the protected packs.
2. A fresh reset alone was rejected because it does not prove an upgrade from the historical `00–09` state.
3. Running Phase28 without supplied logs was rejected because it would validate only static contracts, not the new runtime executions.
4. Incremental validation now proves both the pre-upgrade vulnerable state and the exact migration-10-only delta.
5. Evidence is rejected when generated from a different commit or protected-contract digest.
6. A static readiness preflight runs before destructive local replay work so manifest/hash/blocker failures stop immediately.

## Safety boundary

- no hosted or remote database target;
- no `supabase link`, `db push`, or `db pull`;
- no DB URL, password, token, anon key, or service-role key parameters;
- no migration history rewrite;
- no production deployment or formal migration promotion.

## Verdict

`PASS`

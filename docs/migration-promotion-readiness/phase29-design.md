# Phase29 Design

## Goal

Build a release-safety gate around migration drafts `00–09` without creating formal migrations or running remote commands.

## Decision model

The gate emits two independent results:

- `Phase29GateResult`: whether the readiness analysis completed correctly;
- `PromotionDecision`: `PROMOTION_READY` or `PROMOTION_HOLD`.

A correctly detected blocker therefore produces:

```text
Phase29GateResult: PASS
PromotionDecision: PROMOTION_HOLD
```

`-RequirePromotionReady` converts HOLD into exit code `2` for CI or an explicit release gate.

## Static controls

1. exact ten-file migration inventory;
2. normalized UTF-8/LF SHA-256 contract;
3. Phase28 baseline gate execution;
4. prohibited destructive and broad-privilege pattern scan;
5. final-definition analysis for every `SECURITY DEFINER` function;
6. tracked formal-migration detection;
7. PowerShell parser checks;
8. duplicate and malformed evidence rejection;
9. normalized hash protection for five PowerShell files and two catalog SQL files.

## Runtime evidence

Promotion readiness requires two independent local evidence files:

- fresh install: migrations `00–09` applied to a clean local database;
- incremental upgrade: an existing `00–08` database upgraded by applying `09`.

Both evidence files must attest:

- no remote commands;
- migration order PASS;
- catalog readiness PASS;
- Phase20 PASS;
- Phase25 PASS;
- Phase27.1 PASS;
- Phase28 gate PASS;
- overall PASS.

## Safety boundary

Phase29 never:

- copies files into tracked `supabase/migrations`;
- runs `supabase link`, `db push`, or `db pull`;
- accepts a database URL, token, password, anon key, or service-role key;
- changes hosted or production state.

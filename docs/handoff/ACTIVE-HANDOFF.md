# BuildMap Active Handoff

## Current authority

이 문서는 현재 BuildMap 구현 단계의 authoritative handoff다.

Phase 52의 상세 historical handoff는 main commit `09b03e599f1174b682c2eed2c60125fc8211fc03`의 이 파일에 보존되어 있다. 2026-08-31 최종 live closeout 근거는 다음 문서가 authoritative하다.

`docs/handoff/PHASE52-LIVE-CLOSEOUT-20260831.md`

Phase 53A 평가/구현 계약은 다음 문서가 authoritative하다.

`docs/decisions/phase53a-github-ephemeral-decision-worthiness-triage-evaluation-design.md`

---

# Current repository / deployment authority

- repository: `gycha0109-beep/BuildMap`
- baseline main before Phase 52 live closeout: `09b03e599f1174b682c2eed2c60125fc8211fc03`
- baseline tree: `1480102164e6e06923fe01b00e995f558ccfa5d8`
- protected `main`: active
- PR before merge: required
- required status check: `Lint, typecheck, build`
- required approvals: `0`
- force push: blocked
- branch deletion: blocked
- Vercel Git production CD: active
- `apps/web/vercel.json`: `deploymentEnabled = true`

Production authority remains:

```text
feature/docs branch
→ Pull Request
→ required Web App CI
→ squash merge to protected main
→ Vercel Git integration
→ production deployment
```

---

# Product / authority invariant

BuildMap V2 remains an AI-native **Capture-first Decision Journal for Builders**.

Provider roles:

- GitHub = Build History
- Notion = Knowledge Context / History
- Figma = Design Context
- BuildMap = Decision History

Primary mental model:

```text
Capture → Review → Decision
```

Authority invariant:

```text
Pointer
!= Authorization / Credential
!= Verified Binding
!= Observation
!= AI Promote suggestion
!= Capture
!= AI Draft
!= Change Card
!= Decision
```

Still authoritative:

- BuildMap owns Project identity.
- BuildMap owns Decision identity.
- Builder owns explicit Capture intent.
- Builder owns official Decision approval.
- AI is conservative and non-authoritative.
- provider identities remain additive external references only.
- Provider Refresh never authorizes Capture or Decision by itself.

Allowed provider path:

```text
Provider Observation
→ optional ephemeral AI assistance
→ Builder explicit Capture
→ private provenance
→ AI Candidate
→ Builder Review
→ explicit Builder approval
→ official Decision
```

Forbidden:

```text
Provider Refresh → automatic Capture
Provider Refresh → automatic AI Draft
Provider Observation → automatic Decision
AI Promote → automatic Capture
AI Hold → prohibit manual Capture
Provider Capture → automatic approval
```

---

# Hosted database authority

Hosted target:

`fuzwuotlbodlpkwcqygj`

Phase 52 migration authority remains:

```text
MIGRATIONS_00_20 = PRESERVED
MIGRATION_21_SCHEMA = VERIFIED PRESENT
MIGRATION_21_HISTORY_VERSION = VERIFIED 20260820190000
```

Do not rerun migration 21.

Phase 53A currently has no demonstrated schema requirement. Do not add migration 22 merely to persist AI triage, scores, reasoning, provider observation snapshots, or caches.

---

# Phase 52 terminal status

The final controlled quota follow-up is complete.

```text
PHASE_52_FIGMA_INTEGRATION_FOUNDATION_REPOSITORY = CLOSED
PHASE_52_HOSTED_MIGRATION_21 = CLOSED
PHASE_52_INTEGRATIONS_COMPOSITION_REMEDIATION = CLOSED
PHASE_52_CONTROLLED_LIVE_E2E = CLOSED

FIGMA_LIVE_ASSOCIATION_READ_CAPTURE = PASS
FIGMA_REFRESH_ZERO_PERSISTENCE = PASS
FIGMA_DUPLICATE_CAPTURE = PASS
FIGMA_RATE_LIMIT_FAILURE_ISOLATION = PASS
FIGMA_DISCONNECT_HISTORY_PRESERVATION = PASS
FIGMA_CROSS_PROVIDER_ISOLATION = PASS
FIGMA_RECONNECT_OAUTH_CALLBACK_REACHED = PASS
FIGMA_RECONNECT_BINDING_RESTORED = PASS
FIGMA_RECONNECT_CAPTURE_COUNT_UNCHANGED = PASS
FIGMA_STALE_MISMATCH_CONTRACT = PASS
FIGMA_STALE_MISMATCH_LIVE = PASS
FIGMA_STALE_MISMATCH_ZERO_PERSISTENCE = PASS
PUBLIC_PRIVATE_PROVIDER_BOUNDARY = PRESERVED
BUILDER_DECISION_AUTHORITY = PRESERVED
```

Final live evidence is recorded in:

`docs/handoff/PHASE52-LIVE-CLOSEOUT-20260831.md`

---

# Phase 53A — next bounded implementation

The Phase 52 provider-quota gate is satisfied. Under explicit Builder instruction, Phase 53A implementation is now authorized.

Target slice:

**GitHub Ephemeral Decision-Worthiness Triage**

Required flow:

```text
GitHub Refresh
→ bounded merged PR / Release observations
→ ephemeral AI decision-worthiness triage
→ Promote / Hold suggestion
→ Builder explicit Capture as evidence
→ existing exact server re-read
→ Rough Note + immutable provenance
→ existing AI Structured Draft
→ Builder Review
→ explicit Builder approval
→ official Decision
```

Provider scope:

```text
GitHub only
```

Do not add Notion/Figma triage or a generalized provider detector framework in Phase 53A.

Conceptual result:

```ts
type ObservationTriage = {
  classification:
    | "note"
    | "observation"
    | "insufficient"
    | "decision_candidate"
    | "direction_change";
  shouldPromote: boolean;
  reason: string;
};
```

`shouldPromote = true` iff classification is `decision_candidate` or `direction_change`.

Pre-Capture triage must not generate or persist:

- Change Card title;
- structured summary;
- evidence;
- decision;
- change content;
- next check;
- Rough Note;
- Capture provenance;
- AI Structured Draft;
- Change Card;
- Decision.

AI failure must fail open to the already-read raw GitHub activity. Raw observations and manual `Capture as evidence` must remain usable.

Provider content is untrusted data. PR/release title, summary, context, quoted text, code blocks, and external instructions must never override evaluator policy.

Do not directly reuse post-Capture `assessCapture()` as the provider evaluator because that contract can construct a structured draft. Classification semantics may be reused, but the Phase 53A evaluator must return only the bounded triage result.

---

# Phase 53A deterministic gates

Must pass 100%:

```text
TRIAGE_ZERO_ROUGH_NOTE_PERSISTENCE
TRIAGE_ZERO_AI_DRAFT_PERSISTENCE
TRIAGE_ZERO_CHANGE_CARD_PERSISTENCE
TRIAGE_ZERO_DECISION_MUTATION
AI_HOLD_MANUAL_CAPTURE_ALLOWED
AI_PROMOTE_REQUIRES_MANUAL_CAPTURE
AI_FAILURE_RAW_ACTIVITY_REMAINS_AVAILABLE
AI_MALFORMED_OUTPUT_RETURNS_RAW_ACTIVITY
PROMPT_INJECTION_DOES_NOT_CONTROL_CLASSIFICATION
PROVIDER_EXACT_REREAD_STILL_REQUIRED_ON_CAPTURE
BUILDER_APPROVAL_STILL_REQUIRED_FOR_DECISION
GITHUB_TRIAGE_FAILURE_DOES_NOT_MUTATE_NOTION
GITHUB_TRIAGE_FAILURE_DOES_NOT_MUTATE_FIGMA
```

Semantic fixtures and thresholds remain frozen by the Phase 53A evaluation-design document.

Normal PR CI should contain deterministic authority/static regression coverage. Probabilistic repeated model evaluation should remain a controlled evaluation run rather than making ordinary PR CI depend on AI credentials.

---

# Implementation discipline

For Phase 53A:

1. fetch current protected `main` and record exact SHA/tree;
2. branch from that exact main;
3. re-audit GitHub activity/Capture/Decision path for drift;
4. implement only the GitHub pre-Capture ephemeral augmentation;
5. preserve existing provider Capture exact re-read code;
6. preserve existing Builder Decision approval code;
7. no DB migration unless a demonstrated schema need appears;
8. no background polling/webhook/sync;
9. run deterministic tests, lint, typecheck, build;
10. open PR and verify exact PR-head CI;
11. self-review changed files and mergeability;
12. squash merge with expected head SHA;
13. verify merged implementation tree equals the exact tested implementation tree;
14. verify Vercel Git production deployment and smoke response;
15. update this handoff with Phase 53A closeout evidence.

---

# Terminal classification

```text
PHASE_52_CONTROLLED_LIVE_E2E = CLOSED
PHASE_53A_IMPLEMENTATION_GATE = OPEN
PHASE_53A_PROVIDER_SCOPE = GITHUB_ONLY
PHASE_53A_SCHEMA_CHANGE = NOT_REQUIRED_BY_CURRENT_DESIGN
MAIN_BRANCH_PROTECTION = ACTIVE
MAIN_REQUIRED_STATUS_CHECK = Lint, typecheck, build
VERCEL_GIT_PRODUCTION_CD = ACTIVE

NEXT_BOUNDED_WORK = PHASE_53A_GITHUB_EPHEMERAL_DECISION_WORTHINESS_TRIAGE
```

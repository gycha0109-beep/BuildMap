# Phase 48 — Notion OAuth Bootstrap Runbook

## Scope

This runbook documents the configuration required by the Phase 48 repository implementation.

It does **not** authorize production deployment, live Supabase migration, live secret changes, or external Notion registration as part of Phase 48 implementation/merge.

## 1. Register a Notion public connection

Use the Notion Creator dashboard to create a **Public connection** with the installation scope appropriate for the intended BuildMap environment.

BuildMap Phase 48 is read-only. Configure only the read-content capability required by the implemented page/database reads. Do not add insert/update content capabilities for convenience.

Configure the exact redirect URI used by the BuildMap environment.

Default application callback shape:

```text
{NEXT_PUBLIC_SITE_URL}/api/integrations/notion/callback
```

If `NOTION_REDIRECT_URI` is set, it overrides that default and must exactly match a redirect URI registered with Notion.

The application includes the redirect URI in the authorization URL and therefore includes the same redirect URI in the authorization-code exchange.

## 2. Required server-only environment values

```text
NOTION_CLIENT_ID=
NOTION_CLIENT_SECRET=
NOTION_OAUTH_STATE_SECRET=
NOTION_CREDENTIAL_ENCRYPTION_KEY=
```

Optional:

```text
NOTION_REDIRECT_URI=
```

Existing environment dependency:

```text
NEXT_PUBLIC_SITE_URL=
```

No Notion secret may be prefixed with `NEXT_PUBLIC_`.

## 3. Generate independent secrets

### OAuth state / binding integrity secret

`NOTION_OAUTH_STATE_SECRET` must contain at least 32 bytes of independent random secret material.

It signs time-bounded OAuth state and Notion binding integrity proofs. It is not an encryption key.

### Credential encryption key

`NOTION_CREDENTIAL_ENCRYPTION_KEY` must be a base64-encoded 32-byte key used only for AES-256-GCM token sealing.

Example generation command for an operator-controlled environment:

```bash
openssl rand -base64 32
```

Do not reuse the OAuth state secret as the encryption key.

Do not commit either value.

## 4. Migration 19 prerequisite

Repository file:

```text
supabase/migrations/20260819043000_buildmap_19_notion_oauth_credentials.sql
```

The migration is additive and must be applied through the project's controlled database process before the OAuth runtime can function in an environment.

Phase 48 repository CI only validates migration history/contract. It does not apply migration 19 to a remote database.

Expected migration effects:

- add `integration_bindings.external_resource_type`;
- create `private.notion_oauth_credentials`;
- deny direct `anon`/`authenticated` credential-table access;
- add owner-checked SECURITY DEFINER RPCs for authorization save/load, refresh lease/rotation, and disconnect.

## 5. OAuth connection smoke-check sequence

Only after the environment has the migration, Notion public connection, and secrets configured:

1. Sign in as a BuildMap Builder.
2. Open a Project → Integrations.
3. Add an explicit Notion page/database pointer.
4. Confirm UI shows the pointer separately from read authorization.
5. Select **Connect Notion read access**.
6. In Notion, choose a workspace and share content that includes the exact linked Project resource.
7. Complete authorization.
8. Confirm BuildMap returns to the same Project Integrations page.
9. Confirm the row shows `Read connected` only after exact provider verification.
10. Select **Refresh Notion context**.
11. Confirm the result is bounded and ephemeral.
12. Confirm no Rough Note, AI Draft, `capture_source_refs`, Change Card, Decision, Current Direction, or public content changed.

## 6. Resource verification expectations

A successful OAuth authorization is insufficient by itself.

BuildMap must verify the exact UUID already stored by the Project Link.

Expected outcomes:

- page ID readable → bind as `page`;
- database ID readable → bind as `database`;
- exact data-source ID readable → reject as unsupported Phase 48 Project root;
- inaccessible/unknown ID → do not persist an active binding.

The authorization page picker can grant access to more content than one BuildMap pointer. BuildMap still associates only the exact Project Link resource with that Project.

## 7. Runtime read bounds

Page preview:

- exact page metadata;
- one top-level block children request;
- `page_size=20`;
- maximum 4,000 normalized text characters;
- no recursive child traversal.

Database preview:

- exact database container metadata;
- at most five child data-source labels from the database response;
- no data-source row query;
- no database mirror.

No workspace search, polling, cron, background sync, or webhook intake is part of Phase 48.

## 8. Token refresh behavior

The audited Notion public OAuth documentation does not define an application-usable access-token expiry TTL or `expires_in` field for this flow.

BuildMap does not schedule refreshes based on an invented lifetime.

When an exact read returns `401`:

1. claim the DB refresh lease;
2. decrypt the currently sealed refresh token server-side;
3. request a new access token and new refresh token;
4. verify returned bot/workspace identity remains unchanged;
5. seal both new tokens;
6. atomically replace both only if the lease and `credential_version` still match;
7. retry the bounded read once.

A concurrent request that cannot claim the lease receives `refresh_in_progress` and should be retried by the Builder rather than starting a second refresh race.

## 9. Disconnect / revoke check

Select **Read access 해제**.

Expected behavior:

1. BuildMap attempts Notion's official token revoke endpoint when a usable active token/config exists.
2. Local disconnect runs regardless of provider availability.
3. Stored access-token ciphertext becomes `NULL`.
4. Stored refresh-token ciphertext becomes `NULL`.
5. refresh lease is cleared.
6. credential version increments.
7. credential status becomes `disconnected`.
8. active Notion binding is archived/disconnected.
9. the Notion pointer itself remains unless separately removed.

If provider revoke cannot be confirmed, the UI reports that local authorization was disabled. BuildMap no longer retains usable local token material.

## 10. Key rotation warning

Phase 48 persists `encryption_key_version = 1` and fails closed on unknown versions, but the runtime currently accepts a single configured encryption key.

Do **not** replace `NOTION_CREDENTIAL_ENCRYPTION_KEY` in an environment that has active Phase 48 credential rows without first choosing one of these bounded procedures:

- deploy a future dual-key/key-ring reader and reseal active credentials; or
- revoke/disconnect all existing Notion authorizations and require reconnect after the new key is installed.

Blind replacement of the sole key makes existing ciphertext intentionally undecryptable.

Likewise, rotating `NOTION_OAUTH_STATE_SECRET` invalidates outstanding OAuth state and existing Notion binding proofs. Plan reconnect/re-proof behavior before changing it in an active environment.

## 11. Failure checks

Verify these provider failures are isolated from BuildMap core:

- 401 → at most one controlled refresh attempt, then reconnect;
- 403/404 → resource unavailable/inaccessible;
- 429 → bounded error honoring the normalized Retry-After signal;
- timeout/5xx → provider unavailable;
- revoked token → reconnect/disconnect flow.

None may mutate Project, Decision, Current Direction, publication, Feedback, Outcome, GitHub integration, or ordinary Capture.

## 12. Public boundary check

Inspect the public Project Map after Notion authorization.

It may show only a Builder-selected `public_project_links` Notion pointer.

It must not show:

- auth/read status;
- workspace or bot identity;
- OAuth state;
- access/refresh token or ciphertext;
- `integration_bindings`;
- authenticated Notion preview/content;
- provider error details.

## 13. Production boundary

The following remain separate operational work and must not be inferred from a successful Phase 48 repository merge:

- migration 19 applied to live BuildMap DB;
- Notion public connection registered for production;
- production redirect URI registered;
- production secrets configured;
- production deployment;
- real end-to-end OAuth execution;
- real provider refresh/revoke execution.

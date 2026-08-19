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
- create `private.notion_oauth_credentials` keyed by Notion `bot_id`;
- deny direct `anon`/`authenticated` credential-table access;
- add owner- and credential-owner-checked SECURITY DEFINER RPCs for authorization save/load, refresh lease/rotation, and disconnect.

`workspace_id` must not be treated as credential uniqueness. The provider can issue multiple user-level tokens in one workspace.

## 5. OAuth connection smoke-check sequence

Only after the environment has the migration, Notion public connection, and secrets configured:

1. Sign in as a BuildMap Builder.
2. Open a Project → Integrations.
3. Add an explicit Notion page/database pointer.
4. Confirm UI shows `Pointer linked` separately from read authorization.
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

The provider authorization identity is `bot_id`; the Project resource association is the Notion `integration_bindings` row. Do not collapse these identities.

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

1. resolve the Project Link's active `integration_bindings.external_connection_id` (`bot_id`);
2. claim the shared bot credential refresh lease;
3. decrypt the currently sealed refresh token server-side using `bot_id`-bound AEAD context;
4. request a new access token and new refresh token;
5. verify returned `bot_id` and `workspace_id` remain unchanged;
6. seal both new tokens;
7. atomically replace both only if the Project Link is still bound to the same bot, the lease matches, and `credential_version` still matches;
8. retry the bounded read once.

A concurrent request through any Project Link sharing the same bot authorization that cannot claim the lease receives `refresh_in_progress` and should be retried by the Builder rather than starting a second refresh race.

Refresh `400`, `401`, or `403` ends the lease and requires reconnect.

## 9. Reconnect behavior

If the Builder reauthorizes a Project Link and Notion returns a different `bot_id`:

1. the new token set and exact resource binding are saved transactionally;
2. the old binding is replaced;
3. the old bot credential is locally disconnected only if no other active binding owned by that Builder still references it;
4. if the old credential was disconnected, the callback best-effort revokes its old access token after the new transaction succeeds.

If the old `bot_id` is still referenced elsewhere, it remains active and must not be revoked.

## 10. Disconnect / revoke check

Select **Read access 해제**.

Expected behavior:

1. BuildMap reads/decrypts the current access token into server memory when configuration is available.
2. Local disconnect archives only this Project Link's Notion binding first.
3. The database counts remaining active same-Builder bindings for that `bot_id`.
4. If references remain, the bot credential remains active and no provider revoke occurs.
5. If this was the final binding, stored access-token ciphertext becomes `NULL`.
6. Stored refresh-token ciphertext becomes `NULL`.
7. Refresh lease is cleared.
8. Credential version increments.
9. Credential status becomes `disconnected`.
10. The server then best-effort calls Notion's official revoke endpoint using the access token held only in memory.
11. The Notion pointer itself remains unless separately removed.

If final provider revoke cannot be confirmed, the UI reports that local authorization was disabled. BuildMap no longer retains usable local token material.

## 11. Pointer removal check

Pointer removal is not OAuth disconnect.

When an active Notion binding exists, **Pointer 제거** must be blocked and the Builder must use **Read access 해제** first. This prevents pointer archival from bypassing credential-reference cleanup.

Once the binding is detached, the pointer can be removed independently.

## 12. Key rotation warning

Phase 48 persists `encryption_key_version = 1` and fails closed on unknown versions, but the runtime currently accepts a single configured encryption key.

Do **not** replace `NOTION_CREDENTIAL_ENCRYPTION_KEY` in an environment that has active Phase 48 credential rows without first choosing one of these bounded procedures:

- deploy a future dual-key/key-ring reader and reseal active credentials; or
- revoke/disconnect all existing Notion authorizations and require reconnect after the new key is installed.

Blind replacement of the sole key makes existing ciphertext intentionally undecryptable.

Likewise, rotating `NOTION_OAUTH_STATE_SECRET` invalidates outstanding OAuth state and existing Notion binding proofs. Plan reconnect/re-proof behavior before changing it in an active environment.

## 13. Failure checks

Verify these provider failures are isolated from BuildMap core:

- initial read 401 → at most one controlled refresh attempt, then reconnect;
- refresh 400/401/403 → reconnect;
- resource 403/404 → resource unavailable/inaccessible;
- 429 → bounded error honoring normalized Retry-After;
- timeout/5xx → provider unavailable;
- revoked token → reconnect/disconnect flow.

None may mutate Project, Decision, Current Direction, publication, Feedback, Outcome, GitHub integration, or ordinary Capture.

## 14. Public boundary check

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

## 15. Production boundary

The following remain separate operational work and must not be inferred from a successful Phase 48 repository merge:

- migration 19 applied to live BuildMap DB;
- Notion public connection registered for production;
- production redirect URI registered;
- production secrets configured;
- production deployment;
- real end-to-end OAuth execution;
- real provider refresh/revoke execution.

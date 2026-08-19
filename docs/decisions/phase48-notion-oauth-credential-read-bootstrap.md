# Phase 48 — Notion OAuth Credential & Read Bootstrap

## Status

Implemented repository contract. Production registration, live database application, secret configuration, deployment, and live Notion execution remain out of scope.

## Product authority

BuildMap remains an AI-native Capture-first Decision Journal.

```text
Pointer
!= Credential
!= Observation
!= Capture
!= Decision
```

Notion authorization grants BuildMap permission to read selected knowledge context. It does not grant Notion authority over BuildMap Decisions.

Phase 48 ends at an ephemeral, Builder-triggered current-state read. Refresh does not create Rough Notes, AI Drafts, Change Cards, `capture_source_refs`, Decisions, publication, or Current Direction mutations.

## Official Notion contract audited

Audit date: 2026-08-19.

Primary authority was restricted to official Notion developer documentation.

- Authorization guide: https://developers.notion.com/guides/get-started/authorization
- Authentication: https://developers.notion.com/reference/authentication
- Refresh token: https://developers.notion.com/reference/refresh-a-token
- Revoke token: https://developers.notion.com/reference/revoke-token
- Retrieve page: https://developers.notion.com/reference/retrieve-a-page
- Retrieve block children: https://developers.notion.com/reference/get-block-children
- Retrieve database: https://developers.notion.com/reference/retrieve-a-database
- Retrieve data source: https://developers.notion.com/reference/retrieve-a-data-source
- Query data source: https://developers.notion.com/reference/query-a-data-source
- Request limits: https://developers.notion.com/reference/request-limits
- Versioning / changes: https://developers.notion.com/reference/versioning and https://developers.notion.com/reference/changes-by-version

Audited API version: `2026-03-11`.

The official authorization guide establishes these Phase 48 facts:

- public connections use OAuth 2.0;
- authorization uses `owner=user`, `client_id`, `redirect_uri`, `response_type=code`;
- `state` is supported and is explicitly documented as usable for CSRF protection;
- the user selects the pages/databases shared with the connection;
- the authorization code is exchanged server-side at `/v1/oauth/token` with HTTP Basic client authentication;
- the token response includes `access_token`, `refresh_token`, `bot_id`, `workspace_id`, workspace display metadata, and owner information;
- the connection must persist both access and refresh tokens;
- refresh returns a new access token and a new refresh token;
- `/v1/oauth/revoke` is the official access-token revocation endpoint.

The audited public OAuth documentation does **not** publish an `expires_in` contract or a deterministic access-token lifetime for this flow. Phase 48 therefore does not invent a token TTL. Runtime refresh is attempted only after a provider `401` indicates that the current access token cannot authenticate the read.

The page API requires read-content capability and returns page properties, not page body content. Page body content is read through Retrieve block children. The current database model treats a database as a container whose `data_sources` array identifies child data sources. Phase 48 preserves that distinction.

The current documented rate limit is an average of three requests per second per connection. A `429` includes `Retry-After`. Phase 48 surfaces a bounded retry signal and does not create an internal retry queue, polling loop, cron, or background worker.

No official revision-history API was assumed or fabricated.

## Credential persistence verdict

A schema expansion is required.

`project_links`, `integration_bindings`, and `capture_source_refs` remain credential-free. Migration 19 creates a Notion-specific credential model in a non-public `private` schema:

```text
private.notion_oauth_credentials
```

The credential row is keyed by the exact BuildMap `project_link_id` and stores authorization identity plus application-sealed access and refresh token ciphertext.

This is intentionally not a generalized future-provider vault. It exists because the current Notion public OAuth lifecycle requires persistent rotating credentials.

### Why no service-role runtime was added

The existing web runtime uses the authenticated Supabase session with the publishable key. Phase 48 does not introduce `SUPABASE_SERVICE_ROLE_KEY`.

Instead:

1. the credential table lives in `private`;
2. `anon` and `authenticated` receive no schema/table privileges;
3. RLS is enabled with no browser policies;
4. the application reaches credential material only through narrowly scoped `public` SECURITY DEFINER RPCs;
5. every RPC re-validates the active Notion Project Link and `public.is_project_owner(...)` before touching the private row;
6. direct authenticated table SELECT/INSERT/UPDATE/DELETE is explicitly denied and asserted by the migration.

The owner-callable sealed-credential RPC can return ciphertext to the authenticated owner because the current server runtime also uses that authenticated session. Ciphertext is not a usable provider credential without the server-only AEAD key. This avoids introducing a service role solely to move ciphertext between the application server and Postgres.

A malicious authenticated Project owner could still invoke owner-scoped RPCs directly and corrupt their own integration state with invalid ciphertext or an invalid binding proof. They cannot generate a valid provider binding proof or decrypt a valid credential without server secrets, and cross-Project access remains denied. This residual self-denial-of-service risk is accepted for Phase 48 in preference to a new globally privileged service-role runtime.

## Encryption / sealing model

Raw Notion access and refresh tokens are never written to Postgres.

The web server seals each token independently with Node `crypto` using:

- AES-256-GCM;
- a fresh 96-bit random nonce per seal;
- a server-only 32-byte key from `NOTION_CREDENTIAL_ENCRYPTION_KEY`;
- an authenticated tag for ciphertext tamper detection;
- authenticated additional data binding the ciphertext to:
  - sealing format `notion-credential-v1`,
  - exact `project_link_id`,
  - token kind (`access` or `refresh`),
  - encryption key version.

Stored format:

```text
v1.<base64url nonce>.<base64url auth tag>.<base64url ciphertext>
```

The OAuth/state secret and credential encryption key are independent environment values. HMAC signing is not used as encryption.

`encryption_key_version` is persisted and unknown versions fail closed. Phase 48 supports key-version metadata but only active key version `1`. A transparent future key rotation requires a dual-key/key-ring deployment or explicit reconnect/reseal plan before changing the active key. Replacing the only configured key without such a plan would intentionally make old ciphertext undecryptable.

### Threat model

Protected against within the Phase 48 repository architecture:

- plaintext token persistence;
- token exposure through browser storage;
- direct authenticated table reads of credential material;
- cross-Project RPC access;
- ciphertext modification going undetected by the application;
- ciphertext replay onto another Project Link or token kind because AEAD additional data changes;
- refresh-token lost update from two concurrent refreshes;
- provider credential inclusion in public views or provider-neutral association tables.

Not protected if both the database ciphertext and the server encryption key are compromised. Phase 48 also does not provide a managed KMS/HSM or online key-rewrapping service. Those are deployment/key-management concerns, not claims made by this repository implementation.

## OAuth state / callback security

The authorization request uses a signed, time-bounded state payload containing:

- provider literal `notion`;
- BuildMap `projectId`;
- BuildMap `projectLinkId`;
- initiating authenticated BuildMap `userId`;
- fixed Project integrations return path;
- random nonce;
- expiry (10 minutes).

The payload is HMAC-SHA256 signed by `NOTION_OAUTH_STATE_SECRET`.

On callback the server verifies, before persistence:

1. state signature;
2. state expiry;
3. provider literal;
4. fixed return path;
5. current authenticated BuildMap user equals initiating user;
6. current user still owns the Project;
7. the exact Project Link still belongs to that Project;
8. the link remains active, `link_type = notion`, and canonical;
9. the authorization code exists;
10. the exact linked Notion resource is actually readable with the exchanged authorization.

A browser-supplied Project ID, Link ID, or Notion resource ID never becomes provider authority merely because it appears in a request.

## Token exchange

The temporary authorization code is exchanged only inside the server callback.

Server-only configuration:

- `NOTION_CLIENT_ID`
- `NOTION_CLIENT_SECRET`
- `NOTION_OAUTH_STATE_SECRET`
- `NOTION_CREDENTIAL_ENCRYPTION_KEY`
- optional `NOTION_REDIRECT_URI`

No Notion secret is `NEXT_PUBLIC_*`.

The callback never returns access tokens, refresh tokens, ciphertext, or raw provider payloads to the browser and does not intentionally log them.

## Resource verification

OAuth success is not a Project binding.

The callback starts from the existing canonical Phase 47 pointer and obtains its exact UUID. With the newly issued token it performs bounded exact-ID reads:

1. Retrieve Page for that UUID.
2. If Notion returns 404, Retrieve Database for that same UUID.
3. If both are 404, Retrieve Data Source for the same UUID only to distinguish an unsupported data-source pointer from an inaccessible page/database.

A verified `page` or `database` can become the Project provider association. A raw `data_source` pointer is rejected as a Phase 48 Project root. The database root is never silently replaced by a child data-source identity.

Workspace-wide search is not used.

## integration_bindings semantics

Migration 19 adds one provider-neutral metadata column:

```text
integration_bindings.external_resource_type
```

This is required now because Notion page and database IDs use different read endpoints and type is not safely inferable from the URL.

For `provider = notion`:

- `project_link_id` = BuildMap Project Link that owns the canonical Notion pointer;
- `external_connection_id` = Notion `bot_id`, the authorization identity returned with the tokens;
- `external_account_id` = Notion `workspace_id`;
- `external_account_label` = Notion workspace display name, with a bounded fallback label;
- `external_resource_id` = exact provider-verified linked page/database UUID;
- `external_resource_type` = `page` or `database` from authenticated provider verification;
- `external_resource_label` = bounded title read from the provider;
- `binding_proof` = HMAC integrity proof over `project_link_id + bot_id + workspace_id + resource_id + resource_type` with a Notion-specific domain separator.

No token or ciphertext is stored in `integration_bindings`.

The callback saves the private credential and provider-neutral binding through one database RPC transaction so a persisted credential cannot be committed without the corresponding verified association metadata in the same call.

## Refresh / rotation concurrency

The official Notion refresh contract rotates both the access and refresh token.

Phase 48 handles this with a database lease plus optimistic concurrency:

```text
old access + old refresh
      ↓ provider 401
claim refresh_lock_id (30-second lease)
+ read credential_version N
      ↓
POST /v1/oauth/token grant_type=refresh_token
      ↓
new access + new refresh
      ↓
complete only if
  refresh_lock_id still matches
  lease is still live
  credential_version still equals N
      ↓
atomic replacement of both ciphertexts
credential_version = N + 1
```

A second request cannot acquire an unexpired refresh lease. It receives a bounded `refresh_in_progress` response instead of racing the provider.

Reconnect or disconnect clears the lease and changes the credential version/state. A late refresh completion therefore fails its compare-and-swap and cannot overwrite the newer authorization. The runtime then reloads the latest credential once rather than persisting stale rotated tokens.

The refresh response must retain the same `bot_id` and `workspace_id`; otherwise the runtime fails closed and requires reconnect.

## Disconnect / revocation

Read authorization and pointer association remain separate concepts.

The explicit **Read access 해제** action:

1. loads and decrypts the active access token server-side when server configuration is available;
2. attempts the official Notion `/v1/oauth/revoke` endpoint;
3. regardless of provider availability, calls the local disconnect RPC;
4. the local disconnect transaction nulls both stored ciphertext fields, increments the credential version, clears any refresh lease, marks the private credential disconnected, and archives/disconnects the Notion `integration_bindings` row.

Therefore BuildMap stops possessing a usable stored provider credential immediately even if the provider revoke call cannot be confirmed. The UI distinguishes confirmed revoke from local-only disablement.

Pointer visibility/removal remains separate from OAuth authorization. The existing pointer removal path archives the pointer and active binding; once the pointer is archived, credential RPCs refuse access because they require an active owned Notion Project Link. Builders should use the explicit read-access disconnect action when they want provider revocation and ciphertext purge independent of pointer lifecycle.

## Bounded read runtime

A Builder-triggered GET reads only the exact bound resource.

### Page

At most:

- one Retrieve Page request;
- one top-level Retrieve Block Children request with `page_size=20`;
- up to 4,000 characters of normalized top-level textual content.

No nested block recursion occurs. A response marks itself truncated when there are more top-level blocks, nested child blocks, or more than 4,000 normalized characters.

### Database

At most:

- one Retrieve Database request;
- metadata for up to five child data sources from the database container response.

Phase 48 does not query database rows. It does not choose one child data source and silently redefine the Project association.

All preview responses use `Cache-Control: no-store` and are kept only in client component state. No raw Notion payload is persisted.

## Failure isolation

Notion failures are provider-local.

- `401`: one refresh attempt through the rotation gate; if still unusable, reconnect required.
- `403` / `404`: exact resource unavailable/inaccessible; no BuildMap core mutation.
- `429`: bounded rate-limit response including normalized retry delay when supplied.
- other provider/network/timeout/5xx failures: bounded provider-unavailable response.

No provider failure mutates Project, Decision, Current Direction, publication, Feedback, Outcome, ordinary Capture, or GitHub state.

## Public/private boundary

The public Scout route remains unchanged and continues to use `public_project_links` only.

Phase 48 does not expose through public views/routes:

- access token;
- refresh token;
- ciphertext;
- OAuth state;
- workspace ID;
- bot ID;
- authorizer user ID;
- `integration_bindings`;
- authenticated Notion content;
- bounded read preview;
- provider errors or source proofs.

A public Notion pointer still means only that the Builder chose to show the pointer. It does not assert that the Notion content itself is public.

## Explicit non-goals

Phase 48 does not implement:

- Notion writes;
- workspace-wide search or mirroring;
- recursive page-tree crawling;
- full database row mirroring;
- polling, cron, background sync, or webhook intake;
- revision history;
- automatic Capture or `capture_source_refs`;
- AI Draft or Decision Candidate creation;
- Decision approval/publication/Current Direction mutation;
- PIE or Factory Intelligence runtime coupling;
- production deployment, live DB migration, live Notion registration, or live secret configuration.

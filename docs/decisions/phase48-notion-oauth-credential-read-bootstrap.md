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
- Public connections: https://developers.notion.com/guides/get-started/public-connections
- Authentication: https://developers.notion.com/reference/authentication
- Create token: https://developers.notion.com/reference/create-a-token
- Refresh token: https://developers.notion.com/reference/refresh-a-token
- Revoke token: https://developers.notion.com/reference/revoke-token
- Retrieve page: https://developers.notion.com/reference/retrieve-a-page
- Retrieve block children: https://developers.notion.com/reference/get-block-children
- Retrieve database: https://developers.notion.com/reference/retrieve-a-database
- Retrieve data source: https://developers.notion.com/reference/retrieve-a-data-source
- Request limits: https://developers.notion.com/reference/request-limits
- Versioning / changes: https://developers.notion.com/reference/versioning and https://developers.notion.com/reference/changes-by-version
- Historical OAuth token identity contract: https://developers.notion.com/guides/resources/historical-changelog

Audited API version: `2026-03-11`.

The audited public OAuth contract establishes these Phase 48 facts:

- public connections use OAuth 2.0 and act on behalf of the individual authorizing user;
- authorization uses `owner=user`, `client_id`, `redirect_uri`, and `response_type=code`;
- `state` is supported and explicitly documented as usable for CSRF protection;
- users choose content through the authorization page picker;
- authorization code exchange occurs at `/v1/oauth/token` with HTTP Basic client authentication;
- the response includes `access_token`, `refresh_token`, `bot_id`, `workspace_id`, workspace display metadata, and owner information;
- both access and refresh tokens must be persisted for ongoing authorization lifecycle support;
- refresh returns a new access token and a new refresh token;
- `/v1/oauth/revoke` is the official access-token revocation endpoint;
- `bot_id` identifies the authorization and Notion explicitly recommends using it as the primary key for stored token information;
- `workspace_id` is not token-unique: a workspace can have multiple public OAuth tokens;
- historical Notion guidance states that `bot_id` is unique per API token and warns against mapping stored tokens only by workspace or authorizing user.

The audited public OAuth documentation does **not** publish a deterministic access-token lifetime or an application-usable `expires_in` contract for this flow. Phase 48 therefore does not invent a token TTL. Runtime refresh is attempted only after a provider `401` indicates that the current access token cannot authenticate the read.

The page API requires read-content capability and returns page properties, not page body content. Page body content is read through Retrieve block children. The current database model treats a database as a container whose `data_sources` array identifies child data sources. Phase 48 preserves that distinction.

The current documented rate limit is an average of three requests per second per connection. A `429` includes `Retry-After`. Phase 48 surfaces a bounded retry signal and does not create an internal retry queue, polling loop, cron, or background worker.

No official revision-history API was assumed or fabricated.

## Credential persistence verdict

Schema expansion is required.

`project_links`, `integration_bindings`, and `capture_source_refs` remain credential-free. Migration 19 creates a Notion-specific credential model in a non-public `private` schema:

```text
private.notion_oauth_credentials
```

The private credential row is keyed by Notion `bot_id`, matching the provider authorization/token identity contract.

This is deliberately **not** keyed by `project_link_id` and deliberately **not** keyed by `workspace_id`.

```text
Notion bot authorization credential
        ↓ external_connection_id = bot_id
integration_bindings
        ↓
BuildMap Project Link ↔ exact verified Notion resource
```

One Notion authorization can therefore remain a single credential lifecycle boundary even if multiple BuildMap Project Links of the same Builder legitimately reference resources accessible through that authorization. Project association identity stays in `integration_bindings`, not in the credential vault.

This is intentionally not a generalized future-provider vault. It exists because the current Notion public OAuth lifecycle requires persistent rotating credentials.

## Why no service-role runtime was added

The existing web runtime uses the authenticated Supabase session with the publishable key. Phase 48 does not introduce `SUPABASE_SERVICE_ROLE_KEY`.

Instead:

1. the credential table lives in `private`;
2. `anon` and `authenticated` receive no schema/table privileges;
3. RLS is enabled with no browser policies;
4. the application reaches sealed credential material only through narrowly scoped `public` SECURITY DEFINER RPCs;
5. every RPC re-validates an active Notion Project Link and `public.is_project_owner(...)`;
6. credential lookup additionally requires the stored credential's `created_by_builder_profile_id` to resolve to the current `auth.uid()`;
7. direct authenticated table SELECT/INSERT/UPDATE/DELETE is denied and asserted by migration 19.

The owner-callable RPC can return sealed ciphertext to the authenticated owner because the current server runtime also uses that authenticated session. Ciphertext is not a usable provider credential without the server-only AEAD key. This avoids introducing a globally privileged service role solely to transport ciphertext between the application server and Postgres.

A malicious authenticated owner could invoke their own owner-scoped RPCs and cause self-denial-of-service with invalid sealed-format values or invalid association metadata. They cannot decrypt a valid credential, forge the server binding proof, or cross the credential-owner boundary without server secrets. This residual self-DoS risk is accepted for Phase 48 in preference to service-role expansion.

## Encryption / sealing model

Raw Notion access and refresh tokens are never written to Postgres.

The web server seals each token independently with Node `crypto` using:

- AES-256-GCM;
- a fresh 96-bit random nonce per seal;
- a server-only 32-byte key from `NOTION_CREDENTIAL_ENCRYPTION_KEY`;
- an authenticated tag for ciphertext tamper detection;
- authenticated additional data binding the ciphertext to:
  - sealing format `notion-credential-v1`,
  - provider authorization `bot_id`,
  - token kind (`access` or `refresh`),
  - encryption key version.

Stored format:

```text
v1.<base64url nonce>.<base64url auth tag>.<base64url ciphertext>
```

Migration 19 also constrains persisted token material to the sealed envelope shape, reducing the chance that an application bug accidentally writes a raw bearer token through the RPC boundary. Cryptographic authenticity remains enforced only by AES-GCM open on the server.

The OAuth/state secret and credential encryption key are independent environment values. HMAC signing is not used as encryption.

`encryption_key_version` is persisted and unknown versions fail closed. Phase 48 supports key-version metadata but only active key version `1`. A transparent future key rotation requires a dual-key/key-ring deployment or explicit reconnect/reseal plan before changing the active key.

### Threat model

Protected against within the Phase 48 repository architecture:

- plaintext token persistence;
- token exposure through browser storage;
- direct authenticated table reads of credential material;
- cross-Project access to Project-bound RPCs;
- cross-Builder credential access even if a foreign `bot_id` were guessed or placed into a forged binding;
- ciphertext modification going undetected by the application;
- ciphertext replay onto a different authorization identity or token kind because AEAD additional data changes;
- refresh-token lost update from concurrent reads sharing one `bot_id` authorization;
- provider credential inclusion in public views or provider-neutral association tables.

Not protected if both database ciphertext and the server encryption key are compromised. Phase 48 does not claim a managed KMS/HSM or online key-rewrapping service.

## OAuth state / callback security

The authorization request uses a signed, time-bounded state payload containing:

- provider literal `notion`;
- BuildMap `projectId`;
- BuildMap `projectLinkId`;
- initiating authenticated BuildMap `userId`;
- fixed Project integrations return path;
- random nonce;
- expiry of 10 minutes.

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

A browser-supplied Project ID, Link ID, or resource ID never becomes provider authority merely because it appears in a request.

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
2. If Notion returns 404, Retrieve Database for the same UUID.
3. If both are 404, Retrieve Data Source for the same UUID only to distinguish an unsupported data-source pointer from an inaccessible page/database.

A verified `page` or `database` can become the Project provider association. A raw `data_source` pointer is rejected as a Phase 48 Project root. The database root is never silently replaced by a child data-source identity.

Workspace-wide search is not used.

## integration_bindings semantics

Migration 19 adds one provider-neutral metadata column:

```text
integration_bindings.external_resource_type
```

This is required because Notion page and database IDs use different current read endpoints and type is not safely inferable from the URL.

For `provider = notion`:

- `project_link_id` = BuildMap Project Link that owns the canonical Notion pointer;
- `external_connection_id` = Notion `bot_id`, the authorization/token identity;
- `external_account_id` = Notion `workspace_id`;
- `external_account_label` = Notion workspace display name, with a bounded fallback label;
- `external_resource_id` = exact provider-verified linked page/database UUID;
- `external_resource_type` = `page` or `database` from authenticated provider verification;
- `external_resource_label` = bounded title read from the provider;
- `binding_proof` = HMAC integrity proof over `project_link_id + bot_id + workspace_id + resource_id + resource_type` with a Notion-specific domain separator.

No token or ciphertext is stored in `integration_bindings`.

The callback saves the sealed bot authorization and provider-neutral resource binding through one database RPC transaction.

If reconnect replaces a Project Link's old `bot_id` binding with a different authorization, migration 19 locally disconnects the old credential only when no other active binding owned by that Builder still references it. The callback keeps the previous access token only in server memory long enough to best-effort revoke that now-unreferenced old authorization after the new transaction succeeds.

## Refresh / rotation concurrency

The official Notion refresh contract rotates both access and refresh tokens.

The refresh lock and credential version live on the `bot_id` credential, not on a Project Link. This matters when more than one Project Link uses the same authorization.

```text
old access + old refresh for bot_id B
      ↓ provider 401
claim B.refresh_lock_id (30-second lease)
+ read B.credential_version N
      ↓
POST /v1/oauth/token grant_type=refresh_token
      ↓
new access + new refresh
      ↓
verify bot_id/workspace_id remain B/current workspace
      ↓
complete only if
  the requesting Project Link is still actively bound to B
  refresh_lock_id still matches
  lease is still live
  credential_version still equals N
      ↓
atomic replacement of both ciphertexts
credential_version = N + 1
```

A second request through any Project Link sharing B cannot acquire the unexpired refresh lease. It receives a bounded `refresh_in_progress` response rather than racing the rotating refresh token.

Reconnect or disconnect clears/invalidate the relevant lifecycle state. A late refresh completion cannot overwrite a changed authorization because the active binding, lease, and version all must still match.

A refresh response whose `bot_id` or `workspace_id` changes fails closed and requires reconnect.

## Disconnect / revocation

Read authorization and pointer association remain separate concepts.

The explicit **Read access 해제** action:

1. loads/decrypts the active credential server-side when configuration is available;
2. atomically archives/disconnects this Project Link's Notion binding;
3. counts remaining active bindings owned by the same Builder that reference the same `bot_id`;
4. if another binding still uses the bot authorization, the shared credential remains active and is not revoked;
5. if this was the last binding, both stored ciphertext fields are nulled immediately, credential version increments, refresh lease is cleared, and the credential is marked disconnected;
6. only when the local transaction identifies this as the last binding does the server best-effort call Notion `/v1/oauth/revoke` using the access token held in memory.

Therefore BuildMap stops possessing a locally usable credential as soon as the last binding is disconnected even if provider revoke cannot be confirmed.

Pointer removal does not silently perform OAuth disconnect. While an active Notion read binding exists, the pointer removal server action rejects the removal and the UI directs the Builder to disconnect read access first. Once authorization/binding is detached, pointer removal remains an independent Knowledge Context operation.

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

- initial read `401`: one refresh attempt through the bot-level rotation gate;
- refresh `400/401/403` or changed authorization identity: reconnect required;
- resource `403/404`: exact resource unavailable/inaccessible;
- `429`: bounded rate-limit response including normalized retry delay when supplied;
- other provider/network/timeout/5xx failures: bounded provider-unavailable response.

No provider failure mutates Project, Decision, Current Direction, publication, Feedback, Outcome, ordinary Capture, or GitHub state. Credential lifecycle RPCs mutate only Notion authorization/binding state.

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

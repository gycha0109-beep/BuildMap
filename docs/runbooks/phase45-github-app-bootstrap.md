# Phase 45 — GitHub App Bootstrap Runbook

## Scope

This runbook configures the GitHub App required by the repository implementation from Phase 45.

It does not deploy BuildMap, apply database migrations to a live environment, enable webhooks, or authorize automatic Decision creation.

## 1. GitHub App registration

Create or edit the BuildMap GitHub App.

### Homepage URL

Use the deployed BuildMap site URL for the target environment.

### Callback URL

Set:

```text
{BUILDMap_SITE_URL}/api/integrations/github/callback
```

This URL is used only after BuildMap explicitly starts the GitHub App user authorization flow.

### Request user authorization during installation

Keep **Request user authorization (OAuth) during installation disabled**.

Reason: Phase 45 intentionally uses the post-install Setup URL first, validates BuildMap-signed state, and then starts a separate PKCE authorization flow. GitHub does not allow a Setup URL when OAuth-during-install is enabled.

### Setup URL

Set:

```text
{BUILDMAP_SITE_URL}/api/integrations/github/setup
```

GitHub redirects here after installation. The route receives `installation_id`, but BuildMap does not trust that value by itself; it verifies the installation using a GitHub App user access token before saving a binding.

### Redirect on update

Leave disabled for Phase 45.

Repository-access updates are not a background synchronization trigger in this phase. A Builder may reconnect explicitly when repository selection changes.

### Webhook

Disable webhook delivery for Phase 45.

There is no webhook endpoint, event subscription, polling loop, cron job, or background worker in this phase.

## 2. Repository permissions

Configure only:

```text
Metadata: read
Contents: read
Pull requests: read
```

No repository write permission is authorized.

Do not request Issues permission in Phase 45.

## 3. Repository selection

When installing the GitHub App, grant access only to repositories the Builder intends BuildMap to read.

BuildMap verifies that the exact canonical repository stored in the Project Link is included in the installation before saving the connection binding.

## 4. Server environment

Configure these server-only values in the target runtime:

```text
GITHUB_APP_ID=
GITHUB_APP_CLIENT_ID=
GITHUB_APP_CLIENT_SECRET=
GITHUB_APP_PRIVATE_KEY=
GITHUB_APP_SLUG=
GITHUB_APP_STATE_SECRET=
```

BuildMap also needs:

```text
NEXT_PUBLIC_SITE_URL=https://<target-buildmap-host>
```

Optional callback override:

```text
GITHUB_APP_CALLBACK_URL=https://<target-buildmap-host>/api/integrations/github/callback
```

If the override is omitted, BuildMap derives the callback URL from `NEXT_PUBLIC_SITE_URL`.

### Private key encoding

`GITHUB_APP_PRIVATE_KEY` may be supplied as normal PEM text or as an environment value whose line breaks are represented by literal `\n` sequences. The runtime normalizes escaped line breaks before signing the App JWT.

### State secret

`GITHUB_APP_STATE_SECRET` must be an unpredictable server secret suitable for HMAC signing.

It signs short-lived installation/OAuth state and the tamper-evident provider binding proof.

Never expose it to browser code.

## 5. Database prerequisite

The target BuildMap database must have migration 17 applied before GitHub read connections can be persisted:

```text
20260819002000_buildmap_17_integration_bindings.sql
```

Repository CI validation of this migration is not proof that it has been applied to staging or production.

Verify the actual BuildMap environment before claiming GitHub read access is activated there.

## 6. Expected Builder flow

```text
Project > Integrations
→ add canonical repository pointer
→ GitHub App 연결
→ select account/repository in GitHub installation flow
→ return to BuildMap setup route
→ authorize GitHub App user access
→ callback verifies exact installation + repository
→ Read connected
→ Refresh GitHub activity
→ merged PR + Release preview
```

## 7. Token lifecycle

### GitHub user access token

Created during callback authorization only.

Used to verify:

- accessible installation,
- installation belongs to the configured App,
- exact linked repository is accessible.

It is discarded after callback processing and is not stored in BuildMap.

### Installation access token

Created only when the Builder requests Refresh.

The request scopes the token to the single bound repository ID. It is used for merged PR and Release reads and is not stored or returned to the browser.

## 8. Smoke checks after environment activation

For an owned BuildMap Project:

1. Add a canonical GitHub repository pointer.
2. Confirm `GitHub App ready` appears only when server configuration is present.
3. Start GitHub App connection.
4. Select the intended repository during installation.
5. Complete GitHub authorization.
6. Confirm `Read connected` appears.
7. Press `Refresh GitHub activity`.
8. Confirm only merged PRs and non-draft Releases appear.
9. Confirm refresh does not create a Capture, AI Draft, Change Card, publication mutation, Feedback mutation, or public activity record.
10. Revoke/remove repository access in GitHub and confirm Refresh degrades to a reconnect/provider error without mutating BuildMap.

## 9. Security negative checks

Verify:

- setup request with a forged/expired state fails,
- setup request for a different BuildMap user fails,
- installation without exact repository access fails binding creation,
- manually altered binding IDs fail HMAC integrity verification,
- anonymous users cannot read `integration_bindings`,
- Scout Public Project Map exposes only the public repository pointer,
- no GitHub access token is visible in HTML, JSON response, browser storage, cookies, or logs.

## 10. Explicitly deferred

Do not enable during Phase 45:

- GitHub webhook events
- periodic polling
- background synchronization
- Issues intake
- raw commit stream intake
- automatic Capture
- automatic Decision candidates
- public PR/Release activity
- PIE integration
- Factory Intelligence

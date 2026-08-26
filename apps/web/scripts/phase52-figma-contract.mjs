import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (relative) => readFile(path.join(root, relative), "utf8");

const [
  oauth,
  resource,
  api,
  readBoundary,
  provenance,
  previewRoute,
  previewComponent,
  captureAction,
  integrationActions,
  migration21,
  envExample,
  vercelConfig,
  publicMap,
  integrationsPage,
  figmaSection,
] = await Promise.all([
  read("apps/web/lib/figma/oauth.ts"),
  read("apps/web/lib/figma/resource.ts"),
  read("apps/web/lib/figma/api.ts"),
  read("apps/web/lib/figma/read.ts"),
  read("apps/web/lib/figma/provenance.ts"),
  read("apps/web/app/api/projects/[projectId]/integrations/figma/context/route.ts"),
  read("apps/web/components/buildmap/figma-context-preview.tsx"),
  read("apps/web/app/projects/[projectId]/figma-capture-actions.ts"),
  read("apps/web/app/projects/[projectId]/integration-actions.ts"),
  read("supabase/migrations/20260820190000_buildmap_21_figma_oauth_credentials.sql"),
  read("apps/web/.env.example"),
  read("apps/web/vercel.json"),
  read("apps/web/app/p/[publicSlug]/page.tsx"),
  read("apps/web/app/projects/[projectId]/integrations/page.tsx"),
  read("apps/web/components/buildmap/figma-integration-section.tsx"),
]);

function appearsBefore(text, first, second, message) {
  const firstIndex = text.indexOf(first);
  const secondIndex = text.indexOf(second);
  assert.notEqual(firstIndex, -1, `${message}: missing ${first}`);
  assert.notEqual(secondIndex, -1, `${message}: missing ${second}`);
  assert.ok(firstIndex < secondIndex, message);
}

assert.match(oauth, /FIGMA_OAUTH_SCOPES = \["file_metadata:read", "file_content:read"\]/);
assert.doesNotMatch(oauth, /file_versions:read|comments:write|webhooks:write|projects:read/);
assert.match(oauth, /code_challenge_method", "S256"/);
assert.match(oauth, /FIGMA_OAUTH_SESSION_COOKIE/);
assert.doesNotMatch(envExample, /NEXT_PUBLIC_FIGMA/);

assert.match(resource, /fileKey/);
assert.match(resource, /nodeId/);
assert.match(resource, /normalizeNodeId/);
assert.doesNotMatch(resource, /teamId|projectId/);

assert.match(api, /response\.headers\.get\("Retry-After"\)/);
assert.match(api, /Number\.isSafeInteger\(seconds\)/);
assert.doesNotMatch(api, /Math\.min\(Number\(value\), 300\)/);

assert.match(integrationActions, /link_type: "figma"/);
const figmaPointerSection = integrationActions.slice(
  integrationActions.indexOf("export async function addFigmaResourceAction"),
);
assert.match(figmaPointerSection, /from\("project_links"\)/);
assert.doesNotMatch(
  figmaPointerSection.split("export async function setFigmaResourceVisibilityAction")[0],
  /from\("integration_bindings"\)|save_figma_oauth_authorization/,
  "Saving a Figma pointer must not create authorization/binding state.",
);

assert.match(readBoundary, /eq\("project_id", input\.projectId\)/);
assert.match(readBoundary, /eq\("project_link_id", input\.linkId\)/);
assert.match(readBoundary, /verifyFigmaBindingProof/);
assert.match(readBoundary, /loadFigmaCredential/);
assert.match(readBoundary, /readBoundedFigmaContext/);

assert.match(provenance, /function canonicalProofTimestamp/);
assert.match(provenance, /toISOString\(\)\.replace\("\.000Z", "Z"\)/);
assert.match(provenance, /occurredAt: canonicalProofTimestamp\(input\.occurredAt\)/);
assert.match(provenance, /observedAt: canonicalProofTimestamp\(input\.observedAt\)/);

assert.match(previewRoute, /Cache-Control": "no-store"/);
assert.match(previewRoute, /createFigmaCaptureToken/);
assert.doesNotMatch(previewRoute, /from\("rough_notes"\)|from\("capture_source_refs"\)|from\("change_cards"\)/);
assert.doesNotMatch(previewRoute, /\.insert\(|\.update\(/);
assert.match(previewComponent, /Refresh Figma context/);
assert.match(previewComponent, /preview is ephemeral/);
assert.match(previewComponent, /Capture as evidence/);

appearsBefore(
  captureAction,
  "readVerifiedFigmaProjectContext",
  'from("rough_notes")',
  "Capture must exact re-read the provider before Rough Note persistence.",
);
appearsBefore(
  captureAction,
  "observationKey !== captureToken.observationKey",
  'from("rough_notes")',
  "Capture must reject stale/mismatched bounded observation before persistence.",
);
assert.match(captureAction, /eq\("observation_key", observationKey\)/);
assert.match(captureAction, /verifyFigmaCaptureSourceProof/);
appearsBefore(
  captureAction,
  "const sourceRef = await supabase",
  "const draft = await supabase",
  "Provenance must be persisted before AI draft generation begins.",
);
assert.match(captureAction, /status: "failed"/);
assert.doesNotMatch(captureAction, /from\("change_cards"\)|from\("decisions"\)|approved_at/);

assert.match(migration21, /create table if not exists private\.figma_oauth_credentials/);
assert.match(migration21, /revoke all privileges on table private\.figma_oauth_credentials from public, anon, authenticated/);
assert.match(migration21, /claim_figma_oauth_refresh/);
assert.match(migration21, /credential_version/);
assert.match(migration21, /refresh_lock_expires_at/);
assert.match(migration21, /provider = 'figma'/);
assert.doesNotMatch(migration21, /alter table public\.capture_source_refs|alter table public\.integration_bindings|alter table public\.project_links/);

const vercel = JSON.parse(vercelConfig);
assert.equal(vercel.git?.deploymentEnabled, true, "Approved Git production deployment must remain enabled.");

assert.match(publicMap, /isCanonicalFigmaResourceUrl/);
assert.match(publicMap, /link\.link_type === "figma"/);
assert.match(publicMap, /Figma pointer ↗/);
assert.match(publicMap, /from\("public_project_links"\)/);
assert.doesNotMatch(publicMap, /integration_bindings|capture_source_refs|oauth_credentials|access_token|refresh_token|binding_proof|source_proof|observation_key|rough_notes|ai_structured_drafts/);

assert.match(integrationsPage, /FigmaIntegrationNotice/);
assert.match(integrationsPage, /FigmaIntegrationSection/);
assert.match(integrationsPage, /상단 provider 숫자는 저장된 pointer 수입니다/);
appearsBefore(
  integrationsPage,
  "<FigmaIntegrationNotice />",
  "GitHub · Build History",
  "Provider OAuth feedback must be visible before the provider configuration sections.",
);
appearsBefore(
  integrationsPage,
  "Notion resources",
  "<FigmaIntegrationSection projectId={projectId} />",
  "Figma must be composed as the third provider after Notion.",
);
appearsBefore(
  integrationsPage,
  "<FigmaIntegrationSection projectId={projectId} />",
  "Authority boundary",
  "The overall authority boundary must remain the final integrations section.",
);
assert.doesNotMatch(figmaSection, /FigmaIntegrationNotice/);
assert.doesNotMatch(figmaSection, /Figma authority boundary/);
assert.match(integrationsPage, /Figma Design Context는 모두 외부 source context입니다/);

console.log("Phase52FigmaContract: PASS");
console.log("PointerDoesNotAuthorize: PASS");
console.log("RefreshIsEphemeral: PASS");
console.log("CaptureExactRereadBeforePersistence: PASS");
console.log("ProvenanceTimestampRoundTripStable: PASS");
console.log("ProviderRetryAfterPreserved: PASS");
console.log("CredentialBrowserBoundary: PASS");
console.log("PublicFigmaPointerSafeBoundary: PASS");
console.log("IntegrationsCompositionOrder: PASS");
console.log("ProviderFeedbackVisibleBeforeSections: PASS");
console.log("AutomaticDecisionForbidden: PASS");
console.log("ProductionGitDeploymentEnabled: PASS");

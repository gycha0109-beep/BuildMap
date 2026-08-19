import type { SupabaseClient } from "@supabase/supabase-js";

export type StoredNotionCredential = {
  botId: string;
  workspaceId: string;
  workspaceName: string | null;
  authorizerUserId: string | null;
  accessTokenCiphertext: string;
  refreshTokenCiphertext: string;
  encryptionKeyVersion: number;
  credentialVersion: number;
  activeBindingCount: number;
};

export type NotionRefreshClaim = {
  lockId: string;
  refreshTokenCiphertext: string;
  encryptionKeyVersion: number;
  credentialVersion: number;
  botId: string;
  workspaceId: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function stringValue(row: Record<string, unknown>, key: string) {
  return typeof row[key] === "string" && row[key] ? (row[key] as string) : null;
}

function numberValue(row: Record<string, unknown>, key: string) {
  return typeof row[key] === "number" && Number.isFinite(row[key])
    ? (row[key] as number)
    : null;
}

function parseCredential(value: unknown): StoredNotionCredential | null {
  const row = asRecord(value);
  if (!row || row.ok !== true) return null;
  const botId = stringValue(row, "bot_id");
  const workspaceId = stringValue(row, "workspace_id");
  const accessTokenCiphertext = stringValue(row, "access_token_ciphertext");
  const refreshTokenCiphertext = stringValue(row, "refresh_token_ciphertext");
  const encryptionKeyVersion = numberValue(row, "encryption_key_version");
  const credentialVersion = numberValue(row, "credential_version");
  const activeBindingCount = numberValue(row, "active_binding_count");
  if (
    !botId ||
    !workspaceId ||
    !accessTokenCiphertext ||
    !refreshTokenCiphertext ||
    encryptionKeyVersion === null ||
    credentialVersion === null ||
    activeBindingCount === null
  ) {
    return null;
  }
  return {
    botId,
    workspaceId,
    workspaceName:
      typeof row.workspace_name === "string" && row.workspace_name ? row.workspace_name : null,
    authorizerUserId:
      typeof row.authorizer_user_id === "string" && row.authorizer_user_id
        ? row.authorizer_user_id
        : null,
    accessTokenCiphertext,
    refreshTokenCiphertext,
    encryptionKeyVersion,
    credentialVersion,
    activeBindingCount,
  };
}

function parseRefreshClaim(value: unknown): NotionRefreshClaim | null {
  const row = asRecord(value);
  if (!row || row.ok !== true) return null;
  const lockId = stringValue(row, "lock_id");
  const refreshTokenCiphertext = stringValue(row, "refresh_token_ciphertext");
  const encryptionKeyVersion = numberValue(row, "encryption_key_version");
  const credentialVersion = numberValue(row, "credential_version");
  const botId = stringValue(row, "bot_id");
  const workspaceId = stringValue(row, "workspace_id");
  if (
    !lockId ||
    !refreshTokenCiphertext ||
    encryptionKeyVersion === null ||
    credentialVersion === null ||
    !botId ||
    !workspaceId
  ) {
    return null;
  }
  return {
    lockId,
    refreshTokenCiphertext,
    encryptionKeyVersion,
    credentialVersion,
    botId,
    workspaceId,
  };
}

export async function loadNotionCredential(supabase: SupabaseClient, projectLinkId: string) {
  const result = await supabase.rpc("get_notion_oauth_credential", {
    p_project_link_id: projectLinkId,
  });
  if (result.error) return { credential: null, error: result.error };
  return { credential: parseCredential(result.data), error: null };
}

export async function claimNotionRefresh(supabase: SupabaseClient, projectLinkId: string) {
  const result = await supabase.rpc("claim_notion_oauth_refresh", {
    p_project_link_id: projectLinkId,
  });
  if (result.error) return { claim: null, error: result.error };
  return { claim: parseRefreshClaim(result.data), error: null };
}

export async function completeNotionRefresh(
  supabase: SupabaseClient,
  input: {
    projectLinkId: string;
    lockId: string;
    expectedCredentialVersion: number;
    accessTokenCiphertext: string;
    refreshTokenCiphertext: string;
    encryptionKeyVersion: number;
  },
) {
  const result = await supabase.rpc("complete_notion_oauth_refresh", {
    p_project_link_id: input.projectLinkId,
    p_lock_id: input.lockId,
    p_expected_credential_version: input.expectedCredentialVersion,
    p_access_token_ciphertext: input.accessTokenCiphertext,
    p_refresh_token_ciphertext: input.refreshTokenCiphertext,
    p_encryption_key_version: input.encryptionKeyVersion,
  });
  const row = asRecord(result.data);
  return {
    completed: !result.error && row?.ok === true,
    error: result.error,
  };
}

export async function releaseNotionRefresh(
  supabase: SupabaseClient,
  projectLinkId: string,
  lockId: string,
) {
  return supabase.rpc("release_notion_oauth_refresh", {
    p_project_link_id: projectLinkId,
    p_lock_id: lockId,
  });
}

export async function disconnectStoredNotionAuthorization(
  supabase: SupabaseClient,
  projectLinkId: string,
) {
  const result = await supabase.rpc("disconnect_notion_oauth_authorization", {
    p_project_link_id: projectLinkId,
  });
  const row = asRecord(result.data);
  return {
    disconnected: !result.error && row?.ok === true,
    providerRevokeRequired: !result.error && row?.provider_revoke_required === true,
    error: result.error,
  };
}

import type { SupabaseClient } from "@supabase/supabase-js";

export type StoredFigmaCredential = {
  figmaUserId: string;
  accessTokenCiphertext: string;
  refreshTokenCiphertext: string;
  accessTokenExpiresAt: string;
  encryptionKeyVersion: number;
  credentialVersion: number;
  activeBindingCount: number;
};

export type FigmaRefreshClaim = {
  lockId: string;
  refreshTokenCiphertext: string;
  encryptionKeyVersion: number;
  credentialVersion: number;
  figmaUserId: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function stringValue(row: Record<string, unknown>, key: string) {
  return typeof row[key] === "string" && row[key] ? (row[key] as string) : null;
}

function numberValue(row: Record<string, unknown>, key: string) {
  return typeof row[key] === "number" && Number.isFinite(row[key]) ? (row[key] as number) : null;
}

function parseCredential(value: unknown): StoredFigmaCredential | null {
  const row = asRecord(value);
  if (!row || row.ok !== true) return null;
  const figmaUserId = stringValue(row, "figma_user_id");
  const accessTokenCiphertext = stringValue(row, "access_token_ciphertext");
  const refreshTokenCiphertext = stringValue(row, "refresh_token_ciphertext");
  const accessTokenExpiresAt = stringValue(row, "access_token_expires_at");
  const encryptionKeyVersion = numberValue(row, "encryption_key_version");
  const credentialVersion = numberValue(row, "credential_version");
  const activeBindingCount = numberValue(row, "active_binding_count");
  if (
    !figmaUserId ||
    !accessTokenCiphertext ||
    !refreshTokenCiphertext ||
    !accessTokenExpiresAt ||
    encryptionKeyVersion === null ||
    credentialVersion === null ||
    activeBindingCount === null
  ) {
    return null;
  }
  return {
    figmaUserId,
    accessTokenCiphertext,
    refreshTokenCiphertext,
    accessTokenExpiresAt,
    encryptionKeyVersion,
    credentialVersion,
    activeBindingCount,
  };
}

function parseRefreshClaim(value: unknown): FigmaRefreshClaim | null {
  const row = asRecord(value);
  if (!row || row.ok !== true) return null;
  const lockId = stringValue(row, "lock_id");
  const refreshTokenCiphertext = stringValue(row, "refresh_token_ciphertext");
  const encryptionKeyVersion = numberValue(row, "encryption_key_version");
  const credentialVersion = numberValue(row, "credential_version");
  const figmaUserId = stringValue(row, "figma_user_id");
  if (
    !lockId ||
    !refreshTokenCiphertext ||
    encryptionKeyVersion === null ||
    credentialVersion === null ||
    !figmaUserId
  ) {
    return null;
  }
  return {
    lockId,
    refreshTokenCiphertext,
    encryptionKeyVersion,
    credentialVersion,
    figmaUserId,
  };
}

export async function loadFigmaCredential(supabase: SupabaseClient, projectLinkId: string) {
  const result = await supabase.rpc("get_figma_oauth_credential", {
    p_project_link_id: projectLinkId,
  });
  if (result.error) return { credential: null, error: result.error };
  return { credential: parseCredential(result.data), error: null };
}

export async function claimFigmaRefresh(supabase: SupabaseClient, projectLinkId: string) {
  const result = await supabase.rpc("claim_figma_oauth_refresh", {
    p_project_link_id: projectLinkId,
  });
  if (result.error) return { claim: null, error: result.error };
  return { claim: parseRefreshClaim(result.data), error: null };
}

export async function completeFigmaRefresh(
  supabase: SupabaseClient,
  input: {
    projectLinkId: string;
    lockId: string;
    expectedCredentialVersion: number;
    accessTokenCiphertext: string;
    refreshTokenCiphertext: string;
    accessTokenExpiresAt: string;
    encryptionKeyVersion: number;
  },
) {
  const result = await supabase.rpc("complete_figma_oauth_refresh", {
    p_project_link_id: input.projectLinkId,
    p_lock_id: input.lockId,
    p_expected_credential_version: input.expectedCredentialVersion,
    p_access_token_ciphertext: input.accessTokenCiphertext,
    p_refresh_token_ciphertext: input.refreshTokenCiphertext,
    p_access_token_expires_at: input.accessTokenExpiresAt,
    p_encryption_key_version: input.encryptionKeyVersion,
  });
  const row = asRecord(result.data);
  return { completed: !result.error && row?.ok === true, error: result.error };
}

export async function releaseFigmaRefresh(
  supabase: SupabaseClient,
  projectLinkId: string,
  lockId: string,
) {
  return supabase.rpc("release_figma_oauth_refresh", {
    p_project_link_id: projectLinkId,
    p_lock_id: lockId,
  });
}

export async function disconnectStoredFigmaAuthorization(
  supabase: SupabaseClient,
  projectLinkId: string,
) {
  const result = await supabase.rpc("disconnect_figma_oauth_authorization", {
    p_project_link_id: projectLinkId,
  });
  const row = asRecord(result.data);
  return {
    disconnected: !result.error && row?.ok === true,
    credentialDisconnected: !result.error && row?.credential_disconnected === true,
    error: result.error,
  };
}

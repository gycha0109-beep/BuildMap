import type { FreshProviderRecheck } from "./deterministic-evaluator";

type Health = {
  sourceId: string;
  sourceState: "CURRENT_SOURCE_MATCH" | "UNKNOWN";
  checkedAt: string;
  currentSha: string | null;
  cachedSha: string | null;
};

type BoundSource = {
  evidenceId: string;
  repositoryId: string;
  sourceId: string;
  cachedSha: string;
  nowIso: string;
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const repoId = /^[1-9][0-9]{0,15}$/;
const sourceId = /^pr:[1-9][0-9]{0,14}$/;
const sha40 = /^[0-9a-f]{40}$/;

/** This is a consistency guard, not authentication. Only the server-only
 * authorized adapter may call it with its own fresh provider read. */
export function composeFreshPrRecheck(
  source: BoundSource,
  health: Health,
): FreshProviderRecheck | null {
  if (!uuid.test(source.evidenceId) || !repoId.test(source.repositoryId) ||
      !sourceId.test(source.sourceId) || !sha40.test(source.cachedSha) ||
      health.sourceState !== "CURRENT_SOURCE_MATCH" ||
      health.sourceId !== source.sourceId ||
      !health.currentSha || !sha40.test(health.currentSha) ||
      !health.cachedSha || !sha40.test(health.cachedSha) ||
      health.currentSha !== source.cachedSha ||
      health.cachedSha !== source.cachedSha) return null;
  const now = Date.parse(source.nowIso);
  const checked = Date.parse(health.checkedAt);
  if (!Number.isFinite(now) || !Number.isFinite(checked) ||
      checked > now || now - checked > 5 * 60_000) return null;
  return {
    kind: "GITHUB_PR_MERGE_RECHECK",
    evidenceId: source.evidenceId,
    repositoryId: source.repositoryId,
    sourceId: source.sourceId,
    checkedAt: health.checkedAt,
    currentSha: health.currentSha,
    cachedSha: health.cachedSha,
    result: "CURRENT_SOURCE_MATCH",
  };
}

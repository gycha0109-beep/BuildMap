/** Safe display of GitHub cache identities. Never an acceptance attestation. */
const REPOSITORY = /^[A-Za-z0-9-]{1,100}\/[A-Za-z0-9._-]{1,100}$/;
const PULL_ID = /^pr:([1-9][0-9]{0,14})$/;

export function canonicalObservedPullUrl(input: {
  repositoryName: string;
  sourceType: string;
  sourceId: string;
}): string | null {
  if (input.sourceType !== "merged_pull_request" ||
      !REPOSITORY.test(input.repositoryName)) return null;
  const pull = PULL_ID.exec(input.sourceId);
  if (!pull) return null;
  return "https://github.com/" + input.repositoryName + "/pull/" + pull[1];
}

export type SourceDisplayState = "UNKNOWN" | "NO_SNAPSHOT" | "CACHE_ONLY";

export function sourceDisplayState(input: {
  source_state: string | null;
  source_sha: string | null;
} | null): SourceDisplayState {
  if (!input) return "NO_SNAPSHOT";
  if (input.source_state !== "SOURCE_CONFIRMED" ||
      !input.source_sha || !/^[0-9a-f]{40}$/.test(input.source_sha)) return "UNKNOWN";
  return "CACHE_ONLY";
}

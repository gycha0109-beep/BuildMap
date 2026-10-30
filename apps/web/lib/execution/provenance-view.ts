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
  sourceState: string | null;
  sourceSha: string | null;
} | null): SourceDisplayState {
  if (!input) return "NO_SNAPSHOT";
  if (input.sourceState !== "SOURCE_CONFIRMED" ||
      !input.sourceSha || !/^[0-9a-f]{40}$/.test(input.sourceSha)) return "UNKNOWN";
  return "CACHE_ONLY";
}

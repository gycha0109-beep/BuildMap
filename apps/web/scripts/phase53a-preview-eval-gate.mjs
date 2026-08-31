import { spawnSync } from "node:child_process";

if (process.env.VERCEL_ENV !== "preview") {
  console.log("PHASE_53A_PREVIEW_MODEL_ACCEPTANCE = SKIPPED_NON_PREVIEW");
  process.exit(0);
}

const result = spawnSync(
  process.execPath,
  ["--experimental-strip-types", "scripts/phase53a-github-triage-eval.mjs"],
  {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
    stdio: "inherit",
  },
);

if (result.error) throw result.error;
process.exit(result.status ?? 1);

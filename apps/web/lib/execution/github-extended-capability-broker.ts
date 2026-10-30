import "server-only";

import {
  createGitHubAppJwt,
  getGitHubAppConfig,
  githubRequestHeaders,
} from "@/lib/github/app";
import { inspectGitHubExecutionInstallation } from "@/lib/execution/github-installation-diagnostic";
import type {
  AuthorizedExtendedRead,
  ScopedReadCapability,
} from "@/lib/execution/github-extended-rule-reads";

/**
 * EM-3C-B2 server-side, default-off capability broker.
 *
 * The GitHub App MUST first be reconfigured and its requested permissions
 * approved by the GitHub installation administrator. This code neither edits
 * GitHub App permissions nor enables itself. Both environment conditions are
 * deployment/operator release controls, not a browser/API switch.
 */
export function extendedExecutionSourceReadsEnabled(): boolean {
  const desiredAppId=process.env.EXECUTION_EXTENDED_GITHUB_APPROVED_APP_ID;
  if (process.env.EXECUTION_EXTENDED_GITHUB_VERIFICATION_ENABLED!=="true" ||
    !desiredAppId || !/^[1-9][0-9]{0,15}$/.test(desiredAppId)) return false;
  try {
    return String(getGitHubAppConfig().appId)===desiredAppId;
  } catch {
    return false;
  }
}

const maxDurationMs=8_000;
const ID=/^[1-9][0-9]{0,15}$/;
const capabilities:readonly ScopedReadCapability[]=[
  "checks","actions","deployments",
] as const;

type JsonObject=Record<string,unknown>;
function object(value:unknown):JsonObject|null{
  return value!==null && typeof value==="object" && !Array.isArray(value)
    ?value as JsonObject:null;
}

export async function acquireExtendedExecutionRead(input:{
  installationId:string;
  repositoryId:string;
  owner:string;
  repository:string;
  capability:ScopedReadCapability;
}):Promise<AuthorizedExtendedRead|null> {
  if(!extendedExecutionSourceReadsEnabled())return null;
  if(!capabilities.includes(input.capability) ||
    !ID.test(input.installationId) || !ID.test(input.repositoryId) ||
    !Number.isSafeInteger(Number(input.repositoryId)) ||
    !/^[A-Za-z0-9-]{1,100}$/.test(input.owner) ||
    !/^[A-Za-z0-9._-]{1,100}$/.test(input.repository))return null;

  // This GET uses the already-approved narrow token and app JWT to verify
  // both installation ID and current exact repository numeric identity.
  let installation;
  try {
    installation=await inspectGitHubExecutionInstallation(input);
  } catch {
    return null;
  }
  if(installation.installationIdentity!=="MATCH" ||
    installation.repositoryIdentity!=="MATCH" ||
    installation.scopes[input.capability]!=="READ_GRANTED_BUT_TOKEN_NOT_REQUESTED")
    return null;

  // GitHub grants are discovered, never automatically changed. Request only
  // ONE repository and ONE additional read permission per short-lived token.
  // No global/all-repositories token, write scope or OAuth user token.
  let response:Response;
  try {
    response=await fetch(
      `https://api.github.com/app/installations/${input.installationId}/access_tokens`,{
        method:"POST",cache:"no-store",
        headers:{
          ...githubRequestHeaders,
          Authorization:`Bearer ${createGitHubAppJwt()}`,
          "Content-Type":"application/json",
        },
        body:JSON.stringify({
          repository_ids:[Number(input.repositoryId)],
          permissions:{[input.capability]:"read"},
        }),
        signal:AbortSignal.timeout(maxDurationMs),
      },
    );
  } catch {
    return null;
  }
  if(!response.ok)return null;
  let payload:JsonObject|null=null;
  try {payload=object(await response.json());} catch {return null;}
  if(!payload || typeof payload.token!=="string" ||
    !payload.token ||payload.token.length>4096)return null;

  // Refuse a token if GitHub does not echo the exact repository subset and
  // the requested single read grant. A provider schema drift must fail closed.
  const permissionData=object(payload.permissions);
  const repositories=Array.isArray(payload.repositories)?payload.repositories:null;
  if(!permissionData || permissionData[input.capability]!=="read" ||
    Object.keys(permissionData).some(key=>
      key!==input.capability && !(
        key==="metadata" && permissionData[key]==="read"
      )) ||
    !repositories || repositories.length!==1)return null;
  const repository=object(repositories[0]);
  if(!repository || String(repository.id)!==input.repositoryId ||
    typeof repository.full_name!=="string" ||
    repository.full_name.toLowerCase()!==
      `${input.owner}/${input.repository}`.toLowerCase())return null;

  const expires=Date.parse(String(payload.expires_at??""));
  if(!Number.isFinite(expires)||expires<=Date.now() ||
    expires>Date.now()+61*60*1000)return null;

  return {
    token:payload.token,
    capability:input.capability,
    repositoryId:input.repositoryId,
    owner:input.owner,
    repository:input.repository,
  };
}

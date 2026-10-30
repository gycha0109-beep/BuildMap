import Link from "next/link";
import { redirect } from "next/navigation";
import { GitHubEvidencePreviewPanel } from "@/components/execution/github-evidence-preview-panel";
import { ensureBuilderContext } from "@/lib/buildmap/account";
import { createClient } from "@/lib/supabase/server";

export default async function ExecutionEvidencePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();
  const currentUser = await supabase.auth.getUser();
  if (!currentUser.data.user) redirect("/login");

  const actor = await ensureBuilderContext(supabase, currentUser.data.user);
  const project = await supabase.from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_builder_profile_id", actor.builderProfileId)
    .is("archived_at", null)
    .maybeSingle();
  if (!project.data || project.error) redirect("/dashboard?error=project-access");

  const links = await supabase.from("project_links")
    .select("id, label, url")
    .eq("project_id", projectId)
    .eq("link_type", "github")
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(25);

  return (
    <div className="page-stack">
      <div className="row">
        <Link href={`/projects/${projectId}/execution`}>← 로드맵 정의</Link>
      </div>
      {links.error ? (
        <div className="alert error">GitHub 링크 목록을 읽지 못했습니다.</div>
      ) : (
        <GitHubEvidencePreviewPanel projectId={projectId} links={links.data ?? []} />
      )}
    </div>
  );
}

import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { ProjectTabs } from "@/components/app/project-tabs";
import { FirstDecisionActivation } from "@/components/buildmap/first-decision-activation";
import { Badge } from "@/components/ui/badge";
import { ensureBuilderContext } from "@/lib/buildmap/account";
import { projectLifecycleLabel, visibilityLabel } from "@/lib/buildmap/presentation";
import { createClient } from "@/lib/supabase/server";

export default async function ProjectWorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();
  const currentUser = await supabase.auth.getUser();

  if (!currentUser.data.user) {
    redirect("/login");
  }

  const context = await ensureBuilderContext(supabase, currentUser.data.user);
  const [project, builderProfile] = await Promise.all([
    supabase
      .from("projects")
      .select("id, title, one_line_description, lifecycle_status, visibility_status")
      .eq("id", projectId)
      .eq("owner_builder_profile_id", context.builderProfileId)
      .is("archived_at", null)
      .maybeSingle(),
    supabase
      .from("builder_profiles")
      .select("public_display_name, user_profile_id")
      .eq("id", context.builderProfileId)
      .maybeSingle(),
  ]);

  if (project.error || !project.data) {
    notFound();
  }

  const [captures, reviewDrafts, changeCards] = await Promise.all([
    supabase
      .from("rough_notes")
      .select("id")
      .eq("project_id", projectId)
      .is("archived_at", null)
      .limit(1),
    supabase
      .from("ai_structured_drafts")
      .select("id, status")
      .eq("project_id", projectId)
      .in("status", ["generating", "generated", "editing"])
      .is("archived_at", null),
    supabase
      .from("change_cards")
      .select("id, work_status")
      .eq("project_id", projectId)
      .is("archived_at", null),
  ]);

  const activationAvailable = !captures.error && !reviewDrafts.error && !changeCards.error;
  const hasCapture = (captures.data?.length ?? 0) > 0;
  const cardRows = changeCards.data ?? [];
  const hasDecision = cardRows.some((card) => card.work_status === "approved");
  const reviewCount =
    (reviewDrafts.data?.length ?? 0) +
    cardRows.filter((card) => ["draft", "editing"].includes(card.work_status)).length;

  let builderName = builderProfile.data?.public_display_name || "Builder";

  if (!builderProfile.data?.public_display_name && builderProfile.data?.user_profile_id) {
    const userProfile = await supabase
      .from("user_profiles")
      .select("display_name")
      .eq("id", builderProfile.data.user_profile_id)
      .maybeSingle();
    builderName = userProfile.data?.display_name || builderName;
  }

  return (
    <AppShell
      builderName={builderName}
      project={{ id: project.data.id, title: project.data.title }}
    >
      <div className="page-stack">
        <header className="project-header">
          <div>
            <p className="eyebrow">Project</p>
            <h1>{project.data.title}</h1>
            <p className="project-description">
              {project.data.one_line_description || "설명 없음"}
            </p>
            <div className="project-meta">
              <Badge tone="primary">
                {projectLifecycleLabel(project.data.lifecycle_status)}
              </Badge>
              <Badge>{visibilityLabel(project.data.visibility_status)}</Badge>
            </div>
          </div>
        </header>

        <ProjectTabs projectId={projectId} />
        {activationAvailable && !hasDecision ? (
          <FirstDecisionActivation
            projectId={projectId}
            hasCapture={hasCapture}
            reviewCount={reviewCount}
          />
        ) : null}
        {children}
      </div>
    </AppShell>
  );
}

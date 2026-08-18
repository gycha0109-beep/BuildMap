import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { ProjectTabs } from "@/components/app/project-tabs";
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
        {children}
      </div>
    </AppShell>
  );
}

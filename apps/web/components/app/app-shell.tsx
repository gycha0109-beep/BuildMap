import Link from "next/link";
import type { ReactNode } from "react";
import { signOutAction } from "@/app/dashboard/actions";
import { AppNavigation } from "./app-navigation";

export function AppShell({
  builderName,
  project,
  children,
}: {
  builderName: string;
  project?: { id: string; title: string };
  children: ReactNode;
}) {
  const initial = builderName.trim().charAt(0).toUpperCase() || "B";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/dashboard">
          <span className="brand-mark">BM</span>
          BuildMap
        </Link>

        {project ? <div className="sidebar-project-name">{project.title}</div> : null}
        <AppNavigation projectId={project?.id} />

        <div className="sidebar-footer">
          <div className="builder-chip">
            <span className="builder-avatar">{initial}</span>
            <div className="builder-copy">
              <strong>{builderName}</strong>
              <small>Builder</small>
            </div>
          </div>
          <form action={signOutAction}>
            <button className="sidebar-signout" type="submit">
              로그아웃
            </button>
          </form>
        </div>
      </aside>

      <main className="app-main">
        <div className="app-content">{children}</div>
      </main>
    </div>
  );
}

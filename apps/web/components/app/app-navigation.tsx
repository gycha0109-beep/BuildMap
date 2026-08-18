"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function isActive(pathname: string, href: string, exact = false) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNavigation({ projectId }: { projectId?: string }) {
  const pathname = usePathname();
  const projectRoot = projectId ? `/projects/${projectId}` : null;

  return (
    <div className="sidebar-scroll">
      <nav className="nav-group" aria-label="Global navigation">
        <span className="nav-label">BuildMap</span>
        <Link
          className={`nav-link ${isActive(pathname, "/dashboard", true) ? "active" : ""}`}
          href="/dashboard"
        >
          <span className="nav-icon">D</span>
          Dashboard
        </Link>
        <Link
          className={`nav-link ${isActive(pathname, "/projects") && !projectId ? "active" : ""}`}
          href="/projects"
        >
          <span className="nav-icon">P</span>
          Projects
        </Link>
      </nav>

      {projectRoot ? (
        <nav className="nav-group" aria-label="Project navigation">
          <span className="nav-label">Current project</span>
          <Link
            className={`nav-link ${isActive(pathname, projectRoot, true) ? "active" : ""}`}
            href={projectRoot}
          >
            <span className="nav-icon">O</span>
            Overview
          </Link>
          <Link
            className={`nav-link ${isActive(pathname, `${projectRoot}/workspace`) ? "active" : ""}`}
            href={`${projectRoot}/workspace`}
          >
            <span className="nav-icon">W</span>
            Workspace
          </Link>
          <Link
            className={`nav-link ${isActive(pathname, `${projectRoot}/decisions`) ? "active" : ""}`}
            href={`${projectRoot}/decisions`}
          >
            <span className="nav-icon">✓</span>
            Decisions
          </Link>
        </nav>
      ) : null}
    </div>
  );
}

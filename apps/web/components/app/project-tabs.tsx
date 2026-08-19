"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function ProjectTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const root = `/projects/${projectId}`;
  const tabs = [
    { href: root, label: "Overview", exact: true },
    { href: `${root}/workspace`, label: "Capture", exact: true },
    { href: `${root}/workspace/review`, label: "Review", exact: false },
    { href: `${root}/decisions`, label: "Decisions", exact: false },
    { href: `${root}/evidence`, label: "Evidence", exact: false },
    { href: `${root}/feedback`, label: "Feedback", exact: false },
  ];

  return (
    <nav className="project-tabs" aria-label="Project sections">
      {tabs.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href
          : pathname === tab.href || pathname.startsWith(`${tab.href}/`);

        return (
          <Link
            key={tab.href}
            className={`project-tab ${active ? "active" : ""}`}
            href={tab.href}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

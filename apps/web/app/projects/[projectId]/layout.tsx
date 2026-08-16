import type { ReactNode } from "react";
import AiWorkflow from "./ai-workflow";

export default async function ProjectWorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return (
    <>
      {children}
      <div className="shell stack">
        <AiWorkflow projectId={projectId} />
      </div>
    </>
  );
}

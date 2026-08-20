import type { ReactNode } from "react";
import { FigmaIntegrationSection } from "@/components/buildmap/figma-integration-section";

export default async function IntegrationsLayout({
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
      <FigmaIntegrationSection projectId={projectId} />
    </>
  );
}

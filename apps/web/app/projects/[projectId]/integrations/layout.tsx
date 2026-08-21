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
      <div className="alert">
        상단 provider 숫자는 저장된 pointer 수입니다. Pointer 존재 여부와 OAuth/App read access 연결 상태는 별도이며, 실제 read authorization은 각 provider 카드의 `Read connected` 또는 `Connect ... read access` 상태로 확인합니다.
      </div>
      {children}
      <FigmaIntegrationSection projectId={projectId} />
    </>
  );
}

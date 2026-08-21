"use client";

import { useSearchParams } from "next/navigation";

const errorMessages: Record<string, string> = {
  "invalid-figma-resource": "Figma file/node URL과 공개 설정을 확인해 주세요.",
  "figma-link-save": "Figma pointer를 저장하지 못했습니다.",
  "figma-link-update": "Figma pointer 공개 설정을 변경하지 못했습니다.",
  "figma-link-remove": "Figma pointer를 제거하지 못했습니다.",
  "figma-link-read-connected": "Figma read access를 먼저 해제한 뒤 pointer를 제거해 주세요.",
  "figma-oauth-not-configured": "서버의 Figma OAuth/read 설정이 아직 완료되지 않았습니다.",
  "figma-oauth-config-invalid": "Figma OAuth 보안 설정을 사용할 수 없습니다. 서버 설정을 확인해 주세요.",
  "figma-read-link-invalid": "Figma read access를 연결할 exact file/node pointer를 확인해 주세요.",
  "figma-read-disconnect": "Figma read access 연결을 해제하지 못했습니다.",
  "figma-oauth-state": "Figma OAuth state/PKCE session을 검증하지 못했습니다. 다시 연결해 주세요.",
  "figma-oauth-denied": "Figma authorization이 취소되었습니다.",
  "figma-oauth-user": "Figma authorization을 시작한 BuildMap 사용자와 현재 사용자가 다릅니다.",
  "figma-resource-not-authorized": "선택한 Figma authorization으로 이 exact file/branch를 읽을 수 없습니다.",
  "figma-node-not-authorized": "선택한 Figma authorization으로 pointer의 exact node를 다시 검증하지 못했습니다.",
  "figma-binding-save": "검증된 Figma read authorization을 안전하게 저장하지 못했습니다.",
  "figma-authorization-invalid": "Figma authorization을 검증하지 못했습니다. 다시 연결해 주세요.",
  "figma-rate-limited": "Figma가 이 connection을 일시적으로 rate limit하고 있습니다. 잠시 후 다시 시도해 주세요.",
  "figma-provider-unavailable": "Figma 응답을 확인하지 못했습니다. BuildMap/GitHub/Notion 데이터는 변경되지 않았습니다.",
  "figma-reconnect-required": "저장된 Figma authorization을 더 이상 사용할 수 없습니다. read access를 다시 연결해 주세요.",
  "figma-resource-unavailable": "연결된 Figma file/node를 현재 authorization으로 읽을 수 없습니다.",
  "figma-refresh-in-progress": "다른 요청이 Figma token을 갱신하고 있습니다. 잠시 뒤 Refresh를 다시 실행해 주세요.",
  "figma-observation-token": "Figma bounded observation selection을 검증하지 못했습니다. 다시 Refresh해 주세요.",
  "figma-observation-changed": "Capture 전에 Figma bounded context가 변경되었습니다. 저장하지 않았으므로 다시 Refresh해 주세요.",
  "figma-observation-too-large": "선택한 Figma bounded observation이 Capture 허용 크기를 초과했습니다.",
  "figma-capture-create": "Figma observation을 private Capture로 보존하지 못했습니다.",
  "figma-capture-source": "Figma provenance를 보존하지 못했습니다. Capture는 완료 처리되지 않았습니다.",
  "figma-capture-source-integrity": "기존 Figma Capture provenance의 무결성을 확인하지 못했습니다.",
};

const successMessages: Record<string, string> = {
  "figma-linked": "Figma file/node pointer를 저장했습니다. 아직 read authorization은 생기지 않았습니다.",
  "figma-visibility": "Figma pointer 공개 설정을 변경했습니다.",
  "figma-removed": "Figma pointer를 제거했습니다. 기존 Capture provenance는 보존됩니다.",
  "figma-read-connected": "Figma OAuth와 exact file/node read access를 검증하고 연결했습니다.",
  "figma-read-disconnected": "이 pointer의 Figma read access를 해제했습니다. 기존 Capture provenance는 보존됩니다.",
};

export function FigmaIntegrationNotice() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") ?? "";
  const updated = searchParams.get("updated") ?? "";
  const errorMessage = errorMessages[error];
  const successMessage = successMessages[updated];

  return (
    <>
      {errorMessage ? <div className="alert error">{errorMessage}</div> : null}
      {successMessage ? <div className="alert success">{successMessage}</div> : null}
    </>
  );
}

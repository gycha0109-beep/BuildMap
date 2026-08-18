import type { ReactNode } from "react";

export type BadgeTone =
  | "neutral"
  | "primary"
  | "ai"
  | "review"
  | "success"
  | "danger";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: BadgeTone;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

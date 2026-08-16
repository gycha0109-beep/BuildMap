"use client";

import { useFormStatus } from "react-dom";

type WorkspaceSubmitButtonProps = {
  label: string;
  pendingLabel: string;
  className?: string;
};

export function WorkspaceSubmitButton({
  label,
  pendingLabel,
  className = "button",
}: WorkspaceSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}

"use client";

import { useAssistantDrawer } from "@/features/assistant/assistant-drawer-context";

export function AssistantToggle() {
  const { isOpen, toggleDrawer } = useAssistantDrawer();

  return (
    <button
      className="assistant-toggle"
      type="button"
      aria-label={isOpen ? "Close dreRuss Concierge" : "Open dreRuss Concierge"}
      aria-controls="assistant-drawer"
      aria-expanded={isOpen}
      onClick={toggleDrawer}
    >
      <span className="assistant-toggle-icon" aria-hidden="true">✳</span>
      <span>Ask dreRuss</span>
    </button>
  );
}

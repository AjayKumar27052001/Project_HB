"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { AssistantPanel } from "@/components/organisms/assistant-panel";
import { useAssistantDrawer } from "@/features/assistant/assistant-drawer-context";

export function BookingFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { isOpen, closeDrawer } = useAssistantDrawer();

  useEffect(() => {
    closeDrawer();
  }, [pathname, closeDrawer]);

  useEffect(() => {
    if (!isOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") closeDrawer();
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen, closeDrawer]);

  return (
    <div className="booking-frame">
      <main className="page-content">{children}</main>
      <div className="assistant-drawer-layer" data-open={isOpen}>
        <button
          className="assistant-backdrop"
          type="button"
          aria-label="Close Juniper Concierge"
          tabIndex={isOpen ? 0 : -1}
          onClick={closeDrawer}
          hidden={!isOpen}
        />
        <div id="assistant-drawer" className="assistant-drawer" hidden={!isOpen}>
          <AssistantPanel key={pathname} />
        </div>
      </div>
    </div>
  );
}

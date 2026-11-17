"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type AssistantDrawerContextValue = {
  isOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
};

const AssistantDrawerContext = createContext<AssistantDrawerContextValue | null>(null);

export function AssistantDrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const openDrawer = useCallback(() => setIsOpen(true), []);
  const closeDrawer = useCallback(() => setIsOpen(false), []);
  const toggleDrawer = useCallback(() => setIsOpen((currentlyOpen) => !currentlyOpen), []);
  const value = useMemo(() => ({ isOpen, openDrawer, closeDrawer, toggleDrawer }), [isOpen, openDrawer, closeDrawer, toggleDrawer]);

  return <AssistantDrawerContext.Provider value={value}>{children}</AssistantDrawerContext.Provider>;
}

export function useAssistantDrawer() {
  const context = useContext(AssistantDrawerContext);
  if (!context) {
    throw new Error("useAssistantDrawer must be used inside AssistantDrawerProvider.");
  }
  return context;
}

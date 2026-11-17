"use client";

import { useRef } from "react";
import Link from "next/link";
import { DemoProfileSelector } from "@/components/molecules/demo-profile-selector";
import { AssistantToggle } from "@/components/molecules/assistant-toggle";
import { useAssistantDrawer } from "@/features/assistant/assistant-drawer-context";

export function SiteHeader() {
  const mobileMenuRef = useRef<HTMLDetailsElement>(null);
  const { openDrawer } = useAssistantDrawer();

  function closeMobileMenu() {
    if (mobileMenuRef.current) mobileMenuRef.current.open = false;
  }

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="wordmark" href="/" aria-label="Juniper Hotels home">
          <span className="wordmark-mark" aria-hidden="true">J</span>
          <span>Juniper <em>Hotels</em></span>
        </Link>
        <nav className="main-nav" aria-label="Main navigation">
          <Link href="/">Find a stay</Link>
          <Link href="/#offers">Offers</Link>
          <button type="button" onClick={openDrawer}>Help</button>
        </nav>
        <details className="mobile-nav" ref={mobileMenuRef}>
          <summary>Menu</summary>
          <nav className="mobile-nav-links" aria-label="Mobile main navigation">
            <Link href="/" onClick={closeMobileMenu}>Find a stay</Link>
            <Link href="/#offers" onClick={closeMobileMenu}>Offers</Link>
            <button type="button" onClick={() => { closeMobileMenu(); openDrawer(); }}>Help</button>
          </nav>
        </details>
        <span className="header-locale">USD · EN</span>
        <AssistantToggle />
        <DemoProfileSelector />
      </div>
    </header>
  );
}

import type { Metadata } from "next";
import { SiteHeader } from "@/components/organisms/site-header";
import { BookingFrame } from "@/components/templates/booking-frame";
import { ProfileProvider } from "@/features/profiles/profile-context";
import { AssistantDrawerProvider } from "@/features/assistant/assistant-drawer-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "dreRuss Hotels | Find your stay",
  description: "Explore a fictional hotel booking experience with dreRuss Concierge.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ProfileProvider>
          <AssistantDrawerProvider>
            <SiteHeader />
            <BookingFrame>{children}</BookingFrame>
          </AssistantDrawerProvider>
        </ProfileProvider>
        <footer className="site-footer">
          <span>dreRuss Hotels · Fictional booking experience</span>
          <span>Demo data only · No real reservation or payment</span>
        </footer>
      </body>
    </html>
  );
}

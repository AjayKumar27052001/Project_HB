"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { defaultDemoProfileId, demoProfiles } from "@/features/profiles/demo-profiles";
import type { DemoProfile } from "@/shared/types";

type ProfileContextValue = {
  profiles: DemoProfile[];
  selectedProfile: DemoProfile;
  selectProfile: (profileId: string) => void;
};

const storageKey = "juniper-demo-profile-id";
const ProfileContext = createContext<ProfileContextValue | null>(null);

function readSavedProfileId() {
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

function saveSelectedProfileId(profileId: string) {
  try {
    window.localStorage.setItem(storageKey, profileId);
  } catch {
    // Keep the current selection for this page session when storage is unavailable.
  }
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [selectedProfileId, setSelectedProfileId] = useState(defaultDemoProfileId);
  const [hasLoadedSavedProfile, setHasLoadedSavedProfile] = useState(false);

  useEffect(() => {
    const savedProfileId = readSavedProfileId();
    const savedProfileExists = demoProfiles.some((profile) => profile.id === savedProfileId);

    if (savedProfileId && savedProfileExists) {
      setSelectedProfileId(savedProfileId);
    }

    setHasLoadedSavedProfile(true);
  }, []);

  useEffect(() => {
    if (hasLoadedSavedProfile) {
      saveSelectedProfileId(selectedProfileId);
    }
  }, [hasLoadedSavedProfile, selectedProfileId]);

  const selectedProfile = demoProfiles.find((profile) => profile.id === selectedProfileId) ?? demoProfiles[0];

  function selectProfile(profileId: string) {
    const profileExists = demoProfiles.some((profile) => profile.id === profileId);

    if (profileExists) {
      setSelectedProfileId(profileId);
      saveSelectedProfileId(profileId);
    }
  }

  return (
    <ProfileContext.Provider value={{ profiles: demoProfiles, selectedProfile, selectProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useDemoProfile() {
  const context = useContext(ProfileContext);

  if (!context) {
    throw new Error("useDemoProfile must be used inside ProfileProvider.");
  }

  return context;
}

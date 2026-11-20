import profiles from "@/data/seed/demo-profiles.json";
import type { DemoProfile } from "@/shared/types";

type DemoProfileDocument = Omit<DemoProfile, "id"> & { _id: string };

const profileDocuments = profiles as DemoProfileDocument[];

export const guestProfile: DemoProfile = {
  id: "GUEST",
  displayName: "Guest (Not logged in)",
  email: "",
  preferences: [],
  rewards: {
    programName: "Juniper Rewards",
    tier: "Non-member",
    pointsBalance: 0,
    upgradeAwardsAvailable: 0,
  },
  demo: true,
};

export const demoProfiles: DemoProfile[] = [
  ...profileDocuments.map(({ _id, ...profile }) => ({
    ...profile,
    id: _id,
  })),
  guestProfile,
];

export const defaultDemoProfileId = demoProfiles[0].id;

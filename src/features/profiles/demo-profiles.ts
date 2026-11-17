import profiles from "@/data/seed/demo-profiles.json";
import type { DemoProfile } from "@/shared/types";

type DemoProfileDocument = Omit<DemoProfile, "id"> & { _id: string };

const profileDocuments = profiles as DemoProfileDocument[];

export const demoProfiles: DemoProfile[] = profileDocuments.map(
  ({ _id, ...profile }) => ({
    ...profile,
    id: _id,
  }),
);

export const defaultDemoProfileId = demoProfiles[0].id;

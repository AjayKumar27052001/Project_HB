"use client";

import { useDemoProfile } from "@/features/profiles/profile-context";

export function DemoProfileSelector() {
  const { profiles, selectedProfile, selectProfile } = useDemoProfile();

  return (
    <div className="profile-control">
      <label htmlFor="demo-profile">Demo profile</label>
      <select
        id="demo-profile"
        value={selectedProfile.id}
        onChange={(event) => selectProfile(event.target.value)}
      >
        {profiles.map((profile) => (
          <option key={profile.id} value={profile.id}>
            {profile.displayName}
          </option>
        ))}
      </select>
      <span className="profile-rewards">
        {selectedProfile.rewards.tier} · {selectedProfile.rewards.pointsBalance.toLocaleString("en-US")} demo points
      </span>
    </div>
  );
}

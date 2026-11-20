"use client";

import { useDemoProfile } from "@/features/profiles/profile-context";

export function DemoProfileSelector() {
  const { profiles, selectedProfile, selectProfile } = useDemoProfile();
  const isGuest = selectedProfile.id === "GUEST";

  return (
    <div className="profile-control">
      <label htmlFor="demo-profile">Member Profile</label>
      <select
        id="demo-profile"
        value={selectedProfile.id}
        onChange={(event) => selectProfile(event.target.value)}
      >
        <optgroup label="Members">
          {profiles
            .filter((p) => p.id !== "GUEST")
            .map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.displayName} ({profile.rewards.tier})
              </option>
            ))}
        </optgroup>
        <optgroup label="Account Actions">
          <option value="GUEST">🚪 Log out / Guest mode</option>
        </optgroup>
      </select>
      <span className="profile-rewards">
        {isGuest
          ? "Guest · Logged out (Sign in to unlock perks)"
          : `${selectedProfile.rewards.tier} · ${selectedProfile.rewards.pointsBalance.toLocaleString("en-US")} pts`}
      </span>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { api } from "./api";
import { usePrefs } from "./prefs";
import type { PublicProfile } from "./types";

/** The person's own profile, for the You screens (includes medications; never sent to the agent). */
export interface MyProfile extends PublicProfile {
  sex: "female" | "male" | "other" | null;
  medications: string[];
  preferred_language: string;
}

export function useProfile() {
  const { userId } = usePrefs();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<MyProfile>(`/api/profile/${userId}`)
      .then((p) => {
        setProfile(p);
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
  }, [userId]);
  return { profile, error };
}

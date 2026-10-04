"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Prefs {
  largeText: boolean;
  userId: string;
  devMode: boolean;
  agentMode: "local_agent" | "workbuddy";
  setLargeText: (v: boolean) => void;
  setUserId: (v: string) => void;
  setDevMode: (v: boolean) => void;
  setAgentMode: (v: "local_agent" | "workbuddy") => void;
}

export const usePrefs = create<Prefs>()(
  persist(
    (set) => ({
      largeText: false,
      userId: "mdm_tan",
      devMode: false,
      agentMode: "local_agent",
      setLargeText: (largeText) => set({ largeText }),
      setUserId: (userId) => set({ userId }),
      setDevMode: (devMode) => set({ devMode }),
      setAgentMode: (agentMode) => set({ agentMode }),
    }),
    { name: "wisp-prefs" },
  ),
);

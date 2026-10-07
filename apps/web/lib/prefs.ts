"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Lang = "en" | "zh" | "ms" | "ta";

interface Prefs {
  largeText: boolean;
  reduceMotion: boolean;
  userId: string;
  devMode: boolean;
  agentMode: "local_agent" | "workbuddy";
  language: Lang;
  setLargeText: (v: boolean) => void;
  setReduceMotion: (v: boolean) => void;
  setUserId: (v: string) => void;
  setDevMode: (v: boolean) => void;
  setAgentMode: (v: "local_agent" | "workbuddy") => void;
  setLanguage: (v: Lang) => void;
}

export const usePrefs = create<Prefs>()(
  persist(
    (set) => ({
      largeText: false,
      reduceMotion: false,
      userId: "mdm_tan",
      devMode: false,
      agentMode: "local_agent",
      language: "en",
      setLargeText: (largeText) => set({ largeText }),
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
      setUserId: (userId) => set({ userId }),
      setDevMode: (devMode) => set({ devMode }),
      setAgentMode: (agentMode) => set({ agentMode }),
      setLanguage: (language) => set({ language }),
    }),
    { name: "wisp-prefs" },
  ),
);

export const LANGUAGE_NAMES: Record<Lang, string> = { en: "English", zh: "中文", ms: "Melayu", ta: "தமிழ்" };

/** True once saved preferences have loaded from storage (false during server render). */
export function usePrefsHydrated() {
  return useSyncExternalStore(
    (cb) => usePrefs.persist.onFinishHydration(cb),
    () => usePrefs.persist.hasHydrated(),
    () => false,
  );
}

/**
 * The selected person, or null until saved preferences have loaded. Before that the store
 * holds its default persona, so fetching (or starting a check) earlier would act for the
 * wrong person.
 */
export function useUserId(): string | null {
  const { userId } = usePrefs();
  return usePrefsHydrated() ? userId : null;
}

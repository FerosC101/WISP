"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Lang = "en" | "zh" | "ms" | "ta";

interface Prefs {
  largeText: boolean;
  userId: string;
  devMode: boolean;
  agentMode: "local_agent" | "workbuddy";
  language: Lang;
  setLargeText: (v: boolean) => void;
  setUserId: (v: string) => void;
  setDevMode: (v: boolean) => void;
  setAgentMode: (v: "local_agent" | "workbuddy") => void;
  setLanguage: (v: Lang) => void;
}

export const usePrefs = create<Prefs>()(
  persist(
    (set) => ({
      largeText: false,
      userId: "mdm_tan",
      devMode: false,
      agentMode: "local_agent",
      language: "en",
      setLargeText: (largeText) => set({ largeText }),
      setUserId: (userId) => set({ userId }),
      setDevMode: (devMode) => set({ devMode }),
      setAgentMode: (agentMode) => set({ agentMode }),
      setLanguage: (language) => set({ language }),
    }),
    { name: "wisp-prefs" },
  ),
);

export const LANGUAGE_NAMES: Record<Lang, string> = { en: "English", zh: "中文", ms: "Melayu", ta: "தமிழ்" };

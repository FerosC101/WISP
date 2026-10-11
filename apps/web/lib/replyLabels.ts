import type { QuickReply } from "./types";
import type { Lang } from "./prefs";

/**
 * Patient-facing wording for a few agent replies on the Check screens. Keyed by the
 * agent's language-independent value; other languages keep the agent's own label.
 */
const EN: Record<string, Record<string, string>> = {
  confirm: { confirm: "Yes, continue" },
  steady: { ready: "Yes, I feel steady", no: "Not right now" },
};
const EN_QUESTION: Record<string, string> = {
  steady: "Do you feel steady enough to stand?",
};

export const replyLabel = (question: string, r: QuickReply, lang: Lang) => (lang === "en" ? (EN[question]?.[r.value] ?? r.label) : r.label);
export const questionText = (question: string, text: string, lang: Lang) => (lang === "en" ? (EN_QUESTION[question] ?? text) : text);

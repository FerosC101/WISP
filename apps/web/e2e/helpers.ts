import { type APIRequestContext, type Page, expect } from "@playwright/test";

export const API = "http://127.0.0.1:8788";

/** Fresh demo state for every test: personas, baselines and no sessions; replay defaults. */
export async function resetApi(request: APIRequestContext) {
  expect((await request.post(`${API}/api/dev/reset`)).ok()).toBeTruthy();
  expect((await request.post(`${API}/api/dev/sensor`, { data: { next_override: null, speed: 8, live_counts: false } })).ok()).toBeTruthy();
}

/** Choose the demo persona (and other prefs) before the app loads. Only sets them once per test. */
export async function asPersona(page: Page, userId: string, prefs: Record<string, unknown> = {}) {
  await page.addInitScript(
    ([u, p]) => {
      if (localStorage.getItem("wisp-prefs")) return;
      const state = { largeText: false, reduceMotion: false, userId: u, devMode: false, agentMode: "local_agent", language: "en", ...p };
      localStorage.setItem("wisp-prefs", JSON.stringify({ state, version: 0 }));
    },
    [userId, prefs] as const,
  );
}

export const heading = (page: Page) => page.locator("main h1").first();
export const button = (page: Page, name: string | RegExp) => page.getByRole("button", { name, exact: typeof name === "string" });

/** Start a check by typing the complaint on /check/start. */
export async function startCheck(page: Page, text: string) {
  await page.goto("/check/start");
  await page.getByLabel("Tell WISP how you feel").fill(text);
  await button(page, "Continue").click();
  // The flow lands on /check/concern first and redirects to the session's real stage.
  await expect(page).toHaveURL(/\/check\/(safety|complete|summary)/);
}

type Answerer = (question: string) => string;
export const SAFE: Answerer = (q) =>
  /start(ed)? suddenly|suddenly, or gradually/i.test(q)
    ? "Gradually"
    : /how long/i.test(q)
      ? "2–3 days"
      : /eating and drinking/i.test(q)
        ? "Yes"
        : /keep it down/i.test(q)
          ? "Yes"
          : "No";

/** Answer safety questions one screen at a time until the flow leaves /check/safety. */
export async function answerSafety(page: Page, answer: Answerer = SAFE, max = 16) {
  for (let i = 0; i < max; i++) {
    if (!/\/check\/safety/.test(page.url())) return;
    const h = heading(page);
    await expect(h).toBeVisible();
    const q = (await h.innerText()).trim();
    await button(page, answer(q)).click();
    // Wait for the next question (or another screen).
    await expect.poll(async () => (/\/check\/safety/.test(page.url()) ? (await heading(page).innerText()).trim() : "left")).not.toBe(q);
  }
  throw new Error("Safety questions did not finish");
}

/** Tick every checkbox on a checklist screen, once all `n` have rendered. */
export async function tickAll(page: Page, n: number) {
  const boxes = page.locator("main input[type=checkbox]");
  await expect(boxes).toHaveCount(n);
  for (const box of await boxes.all()) await box.check();
}

/** Summary → decision → do the check → room ready → movement (replay) → result screen. */
export async function doMovementCheck(page: Page) {
  await expect(page).toHaveURL(/\/check\/summary/);
  await button(page, "That's right — continue").click();
  await expect(page).toHaveURL(/\/check\/decision/);
  await button(page, "Do the check").click();
  await expect(page).toHaveURL(/\/check\/room-ready/);
  await tickAll(page, 3);
  await button(page, "My space is ready").click();
  await button(page, "Yes, I'm ready").click();
  await button(page, "No, I'm alone").click();
  await expect(page).toHaveURL(/\/check\/movement/);
  await button(page, "I'm seated — start").click();
  await expect(page).toHaveURL(/\/check\/movement-result/, { timeout: 60_000 });
}

/** A finished check created through the API (no UI), for tests that need one as a starting point. */
export async function apiCheck(request: APIRequestContext, userId: string, values: string[], text = "I feel weak") {
  const start = await (await request.post(`${API}/api/sessions`, { data: { user_id: userId, text, confirm_summary: true } })).json();
  const sid: string = start.session_id;
  for (const v of values) await request.post(`${API}/api/sessions/${sid}/messages`, { data: { text: v, value: v } });
  return sid;
}

/** Answers for a check that ends at T3 without a movement check (declined). */
export const DECLINED = ["gradual", "d_days", "no", "no", "no", "no", "no", "no", "no", "no", "yes", "confirm", "skip"];

/** The session id in the current URL (`?s=`). */
export const sessionFromUrl = (page: Page) => new URL(page.url()).searchParams.get("s")!;

/** A home-monitoring (T4) check for Mdm Siti, with a recorded movement check, built through the API. */
export async function apiT4(request: APIRequestContext) {
  const sid = await apiCheck(request, "mdm_siti", ["gradual", "d_yesterday", "no", "no", "no", "no", "no", "no", "no", "no", "yes", "confirm", "do_check", "ready", "alone"]);
  await request.post(`${API}/api/sessions/${sid}/check/ready`);
  await expect
    .poll(async () => (await (await request.get(`${API}/api/sessions/${sid}`)).json()).case.functional_status, { timeout: 30_000 })
    .toBe("measured");
  await request.post(`${API}/api/sessions/${sid}/messages`, { data: { text: "no", value: "no" } }); // arms
  return sid;
}

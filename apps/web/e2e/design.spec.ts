import { expect, test } from "@playwright/test";
import { API, DECLINED, SAFE, answerSafety, apiCheck, apiT4, asPersona, button, heading, resetApi, sessionFromUrl, startCheck, tickAll } from "./helpers";

// v4 design: tile-based check start, the Care home, History and You hubs, desktop navigation.

test.beforeEach(async ({ request }) => resetApi(request));

test("check start: what feels different, when it started, anything else, then the safety check", async ({ page, request }) => {
  await asPersona(page, "mdm_tan");
  await page.goto("/check/start");
  await expect(heading(page)).toHaveText("What feels different today?");
  const weak = page.getByRole("checkbox", { name: "Weakness" });
  await weak.click();
  await expect(weak).toHaveAttribute("aria-checked", "true");
  await button(page, "Next: when it started").click();

  await expect(heading(page)).toHaveText("When did this start?");
  await expect(button(page, "Next: anything else")).toBeDisabled();
  await page.getByRole("radio", { name: "Yesterday" }).click();
  await button(page, "Next: anything else").click();

  await expect(heading(page)).toHaveText("Has anything else changed?");
  await expect(button(page, "Start the safety check")).toBeDisabled();
  await page.getByRole("checkbox", { name: "Eating less" }).click();
  await button(page, "Start the safety check").click();
  await expect(page).toHaveURL(/\/check\/safety/);
  await expect(page.getByRole("progressbar", { name: "Safety questions" })).toBeVisible();

  // The tiles became the person's own words, which the agent read as usual.
  const snap = await (await request.get(`${API}/api/sessions/${sessionFromUrl(page)}`)).json();
  expect(snap.case.complaint_text).toBe("I feel weak, since yesterday. I am eating less than usual.");
  expect(snap.case.modifiers.reduced_intake).toBe(true);
});

test("Today: a quick tile starts a check in the person's own words", async ({ page }) => {
  await asPersona(page, "mdm_tan");
  await page.goto("/today");
  await expect(heading(page)).toHaveText("How are you feeling today?");
  await page.getByRole("button", { name: /I feel dizzy/ }).click();
  await expect(page).toHaveURL(/\/check\/(safety|summary|complete)/);
});

test("Care home: current plan, what to do now, before you go, if things change; ticks carry over", async ({ page, request }) => {
  const sid = await apiCheck(request, "mdm_tan", DECLINED);
  await asPersona(page, "mdm_tan");
  await page.goto(`/care?s=${sid}`);
  const plan = page.getByRole("region", { name: "Your current plan" });
  await expect(plan).toContainText("Book your doctor in the next few days");
  await expect(plan).toContainText("Not done yet");
  for (const name of ["What to do now", "Before you go", "If things change"]) await expect(page.getByRole("region", { name })).toBeVisible();

  await page.goto(`/care/plan?s=${sid}`);
  await page.getByRole("checkbox", { name: /Done: Book an appointment/ }).check();
  await page.goto(`/care?s=${sid}`);
  await expect(page.getByRole("region", { name: "Your current plan" })).toContainText("Done");
  await expect(page.getByRole("region", { name: "Your current plan" })).not.toContainText("Not done yet");
});

test("History and You: new headings, sections and a friendly empty state", async ({ page }) => {
  await asPersona(page, "mr_lim");
  await page.goto("/history");
  await expect(heading(page)).toHaveText("Your check-ins");
  await page.getByRole("radio", { name: "Checks" }).click();
  await expect(page.getByText("No check-ins yet")).toBeVisible();
  await expect(page.getByRole("link", { name: "Start a check-in" })).toBeVisible();

  await page.goto("/you");
  for (const name of ["Your health", "My usual", "People you trust", "Preferences", "Your data", "About WISP"]) {
    await expect(page.getByRole("region", { name, exact: true })).toBeVisible();
  }
  await page.getByRole("link", { name: /Privacy and your data/ }).click();
  await expect(page).toHaveURL(/\/you\/privacy$/);
});

test("desktop: the header navigation marks the current section", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await asPersona(page, "mdm_tan");
  await page.goto("/today");
  const nav = page.locator("header").getByRole("navigation", { name: "Main" });
  await expect(nav.getByRole("link", { name: "Today" })).toHaveAttribute("aria-current", "page");
  await nav.getByRole("link", { name: "History" }).click();
  await expect(page).toHaveURL(/\/history$/);
  await expect(nav.getByRole("link", { name: "History" })).toHaveAttribute("aria-current", "page");
});

test("not steady enough to stand: no movement check, and WISP moves straight to care", async ({ page, request }) => {
  await asPersona(page, "mdm_tan");
  await startCheck(page, "I feel weak");
  await answerSafety(page);
  await button(page, "Yes, continue").click();
  await expect(page.getByRole("heading", { name: "A quick movement check could help." })).toBeVisible();
  await page.getByText("Why this check?").click();
  await button(page, "Do the check").click();
  await tickAll(page, 3);
  await button(page, "My space is ready").click();
  await expect(heading(page)).toHaveText("Do you feel steady enough to stand?");
  await button(page, "Not right now").click();
  await expect(page.getByRole("heading", { name: "Please be seen today" })).toBeVisible({ timeout: 15_000 });
  const snap = await (await request.get(`${API}/api/sessions/${sessionFromUrl(page)}`)).json();
  expect(snap.case.measurement_id).toBeNull();
});

test("summary: “Change something” opens the answers to edit", async ({ page }) => {
  await asPersona(page, "mdm_tan");
  await startCheck(page, "I feel weak");
  await answerSafety(page, SAFE);
  await expect(heading(page)).toHaveText("Here’s what I understand.");
  await button(page, "Change something").click();
  await expect(page.getByText("See or change your answers")).toBeVisible();
  await expect(page.getByRole("button", { name: "Change" }).first()).toBeVisible();
});

test("home monitoring: a Set check-in reminder made on the device", async ({ page, request }) => {
  const sid = await apiT4(request);
  await asPersona(page, "mdm_siti");
  await page.goto(`/check/complete?s=${sid}`);
  await expect(page.getByRole("heading", { name: "You can continue monitoring at home for now" })).toBeVisible();
  const reminder = page.getByRole("link", { name: "Set check-in" });
  await expect(reminder).toHaveAttribute("download", "wisp-check-in.ics");
  await expect(reminder).toHaveAttribute("href", /^data:text\/calendar/);
});

test("follow-up: “Something new happened” → Confusion tile → the safety engine re-runs → emergency", async ({ page, request }) => {
  const sid = await apiT4(request);
  await asPersona(page, "mdm_siti");
  await page.goto(`/follow-up?prev=${sid}`);
  await expect(heading(page)).toHaveText("How are you feeling now?");
  await page.getByRole("button", { name: /Something new happened/ }).click();
  await expect(heading(page)).toHaveText("What changed?");
  await expect(button(page, "Continue")).toBeDisabled();
  await page.getByRole("checkbox", { name: "Confusion" }).click();
  await button(page, "Continue").click();
  await expect(page).toHaveURL(/\/check\/complete/);
  await expect(page.getByRole("heading", { name: "This needs help now" })).toBeVisible();
  await expect(page.getByText("Why WISP is recommending this")).toBeVisible();
  await expect(page.getByRole("button", { name: /Do the check/ })).toHaveCount(0);
});

test("spec routes: /check/details, /you/profile and /follow-up/result land on their homes", async ({ page, request }) => {
  const sid = await apiCheck(request, "mdm_tan", DECLINED);
  await asPersona(page, "mdm_tan");
  for (const [from, to] of [
    ["/check/details", /\/check\/start$/],
    ["/you/profile", /\/you\/health$/],
    [`/follow-up/result?s=${sid}`, new RegExp(`/check/complete\\?s=${sid}$`)],
  ] as const) {
    await page.goto(from);
    await expect(page).toHaveURL(to);
  }
});

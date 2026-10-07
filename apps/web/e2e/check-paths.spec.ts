import { expect, test } from "@playwright/test";
import { SAFE, answerSafety, asPersona, button, heading, resetApi, startCheck, tickAll } from "./helpers";

// Every branch of the Check flow that changes the outcome.

test.beforeEach(async ({ request, page }) => {
  await resetApi(request);
  await asPersona(page, "mdm_tan");
});

test("a warning sign part-way through the safety questions goes straight to emergency", async ({ page }) => {
  await startCheck(page, "I feel weak");
  await expect(page.getByRole("progressbar", { name: "Safety questions" })).toHaveText("Question 1 of 11");
  await answerSafety(page, (q) => (/chest pain/i.test(q) ? "Yes" : SAFE(q)));
  await expect(page).toHaveURL(/\/check\/complete/);
  await expect(page.getByRole("heading", { name: "This needs help now" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Call 995" })).toBeInViewport();
});

test("“not sure” about a warning sign → can't judge safely, and it can be corrected", async ({ page }) => {
  await startCheck(page, "I feel weak");
  await answerSafety(page, (q) => (/confused/i.test(q) ? "Not sure" : SAFE(q)));
  await expect(page).toHaveURL(/\/check\/summary/);
  await expect(page.getByText(/1 “not sure”/)).toBeVisible();

  // Correct it to "No" on the summary screen; the warning disappears.
  const row = page.locator("main div.py-3").filter({ hasText: /confused/i });
  await row.getByRole("button", { name: "Change" }).click();
  await row.getByRole("button", { name: "No", exact: true }).click();
  await expect(page.getByText(/“not sure”/)).toHaveCount(0);
  await expect(page.getByText("No warning signs reported")).toBeVisible();
});

test("“not sure” left unresolved → can't safely judge (never self-care)", async ({ page }) => {
  await startCheck(page, "I feel weak");
  await answerSafety(page, (q) => (/fainted/i.test(q) ? "Not sure" : SAFE(q)));
  await button(page, "That's right — continue").click();
  await expect(page).toHaveURL(/\/check\/decision/);
  await expect(page.getByText(/couldn.t be ruled out/)).toBeVisible();
  await button(page, "See my next step").click();
  await expect(page.getByRole("heading", { name: "I can't safely judge this from here" })).toBeVisible();
});

test("correcting an answer to a warning sign on the summary escalates to emergency", async ({ page }) => {
  await startCheck(page, "I feel dizzy");
  await answerSafety(page);
  await page.getByText("See or change your answers").click();
  const row = page.locator("main div.py-3").filter({ hasText: /one side/i });
  await row.getByRole("button", { name: "Change" }).click();
  await row.getByRole("button", { name: "Yes", exact: true }).click();
  await expect(page).toHaveURL(/\/check\/complete/);
  await expect(page.getByRole("heading", { name: "This needs help now" })).toBeVisible();
});

test("eating less, changed on the summary, asks the fluids question and comes back", async ({ page }) => {
  await startCheck(page, "I feel weak");
  await answerSafety(page);
  const row = page.locator("main div.py-3").filter({ hasText: "Eating and drinking" });
  await row.getByRole("button", { name: "Change" }).click();
  await row.getByRole("button", { name: "Less than usual" }).click();
  await expect(page).toHaveURL(/\/check\/safety/);
  await expect(heading(page)).toHaveText("Can you drink water and keep it down?");
  await expect(page.getByRole("progressbar", { name: "Safety questions" })).toHaveText("Question 11 of 11");
  await button(page, "Yes").click();
  await expect(page).toHaveURL(/\/check\/summary/);
  await expect(page.getByText("Less than usual")).toBeVisible();
  await expect(page.getByText("Keeping fluids down")).toBeVisible();
});

test("declining the movement check → book your doctor (no self-care without a measurement)", async ({ page }) => {
  await startCheck(page, "I feel weak");
  await answerSafety(page);
  await button(page, "That's right — continue").click();
  await expect(page.getByRole("heading", { name: "A short movement check could help" })).toBeVisible();
  await expect(button(page, "Do the check")).toBeInViewport();
  await button(page, "Continue without it").click();
  await expect(page.getByRole("heading", { name: "Book your doctor in the next few days" })).toBeVisible();
});

test("not feeling steady at Room Ready → be seen today", async ({ page }) => {
  await startCheck(page, "I feel weak");
  await answerSafety(page);
  await button(page, "That's right — continue").click();
  await button(page, "Do the check").click();
  await expect(page).toHaveURL(/\/check\/room-ready/);
  await expect(page.getByText(/Sensing is off/)).toBeVisible();
  await expect(button(page, "Tick each item to continue")).toBeDisabled();
  await tickAll(page, 3);
  await button(page, "My space is ready").click();
  await button(page, "No").click();
  await expect(page.getByRole("heading", { name: "Please be seen today" })).toBeVisible();
});

test("someone else in the room: wait until it's clear, then the check starts", async ({ page }) => {
  await startCheck(page, "I feel weak");
  await answerSafety(page);
  await button(page, "That's right — continue").click();
  await button(page, "Do the check").click();
  await tickAll(page, 3);
  await button(page, "My space is ready").click();
  await button(page, "Yes, I'm ready").click();
  await button(page, "Yes, someone is here").click();
  await expect(heading(page)).toHaveText("Please wait until the area around your chair is clear.");
  await button(page, "It's clear now").click();
  await expect(page).toHaveURL(/\/check\/movement/);
  await expect(page.getByRole("dialog")).toBeVisible(); // full-screen movement check
  await expect(button(page, "I'm seated — start")).toBeInViewport();
  await expect(button(page, "Skip the check")).toBeInViewport();
});

async function stopPartWay(page: import("@playwright/test").Page, request: import("@playwright/test").APIRequestContext) {
  await request.post("http://127.0.0.1:8788/api/dev/sensor", { data: { speed: 1 } }); // slow enough to stop
  await startCheck(page, "I feel weak");
  await answerSafety(page);
  await button(page, "That's right — continue").click();
  await button(page, "Do the check").click();
  await tickAll(page, 3);
  await button(page, "My space is ready").click();
  await button(page, "Yes, I'm ready").click();
  await button(page, "No, I'm alone").click();
  await button(page, "I'm seated — start").click();
  await expect(page.getByRole("dialog").getByText("Stand up and sit down five times")).toBeVisible();
  await expect(button(page, "Stop")).toBeInViewport();
  await button(page, "Stop").click();
  await expect(page).toHaveURL(/\/check\/movement-result/);
  await expect(heading(page)).toContainText("Did you stop because you felt unwell?");
}

test("stopped part-way for a non-medical reason → no measurement, book your doctor", async ({ page, request }) => {
  await stopPartWay(page, request);
  await button(page, "No").click();
  await expect(page).toHaveURL(/\/check\/complete/);
  await expect(page.getByRole("heading", { name: "Book your doctor in the next few days" })).toBeVisible();
});

test("stopped part-way because unwell (no chest pain or breathlessness) → be seen today", async ({ page, request }) => {
  await stopPartWay(page, request);
  await button(page, "Yes").click();
  await expect(heading(page)).toHaveText("Do you have chest pain right now?");
  await button(page, "No").click();
  await expect(heading(page)).toHaveText("Are you very short of breath right now?");
  await button(page, "No").click();
  await expect(heading(page)).toHaveText("You stopped before finishing");
  await button(page, "See my next step").click();
  await expect(page.getByRole("heading", { name: "Please be seen today" })).toBeVisible();
});

test("stopped part-way with chest pain → emergency", async ({ page, request }) => {
  await stopPartWay(page, request);
  await button(page, "Yes").click();
  await button(page, "Yes").click(); // chest pain right now
  await expect(page).toHaveURL(/\/check\/complete/);
  await expect(page.getByRole("heading", { name: "This needs help now" })).toBeVisible();
});

test("no baseline (Mr Lim) → WISP explains why there's no movement check and moves on", async ({ page, context }) => {
  await context.clearCookies();
  await page.addInitScript(() => localStorage.removeItem("wisp-prefs"));
  await asPersona(page, "mr_lim");
  await startCheck(page, "I feel weak");
  await answerSafety(page);
  await button(page, "That's right — continue").click();
  await expect(page.getByText(/doesn.t have your usual movement on record/)).toBeVisible();
  // Auto-continues to the recommendation.
  await expect(page.getByRole("heading", { name: "Book your doctor in the next few days" })).toBeVisible({ timeout: 15_000 });
});

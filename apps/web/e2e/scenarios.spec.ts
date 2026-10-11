import { expect, test } from "@playwright/test";
import { API, SAFE, answerSafety, asPersona, button, doMovementCheck, heading, resetApi, startCheck } from "./helpers";

// The four required demo scenarios (docs/demo.md), driven through the v3 patient app.

test.beforeEach(async ({ request }) => resetApi(request));

test("Scenario 1 — Mdm Tan: WISP chooses a movement check, slower than usual → be seen today", async ({ page }) => {
  await asPersona(page, "mdm_tan");
  await startCheck(page, "I've felt weak for two days.");
  await answerSafety(page, (q) => (/eating and drinking/i.test(q) ? "No" : SAFE(q)));

  // What WISP understood reflects her answers.
  await expect(page).toHaveURL(/\/check\/summary/);
  await expect(page.getByText("Less than usual")).toBeVisible();
  await expect(page.getByText("No warning signs reported")).toBeVisible();

  await doMovementCheck(page);
  await expect(heading(page)).toHaveText("Did you need to push up with your arms to stand?");
  await button(page, "Yes").click();

  await expect(heading(page)).toHaveText("Slower than your usual pattern");
  await expect(page.getByText(/doesn.t tell us what is causing/)).toBeVisible();
  await expect(page.getByText(/\d+(\.\d+)?\s?s\b/)).toHaveCount(0); // no timings on patient screens
  await button(page, "See my next step").click();

  await expect(page).toHaveURL(/\/check\/complete/);
  await expect(page.getByRole("heading", { name: "Please be seen today" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Find care" })).toBeInViewport();
  await expect(page.getByRole("link", { name: "Preview and share" })).toBeVisible(); // Daniel is her trusted person
});

test("Scenario 2 — Mr Lim: red flag → emergency, no movement check", async ({ page, request }) => {
  await asPersona(page, "mr_lim");
  await startCheck(page, "This morning I suddenly felt dizzy and my left hand feels clumsy.");
  await expect(page).toHaveURL(/\/check\/complete/);
  await expect(page.getByRole("heading", { name: "This needs help now" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Call 995" })).toBeInViewport();
  await expect(page.getByRole("link", { name: "Call 995" })).toHaveAttribute("href", "tel:995");
  await expect(page.getByText("Would you like to share")).toHaveCount(0);

  const sid = new URL(page.url()).searchParams.get("s");
  const snap = await (await request.get(`${API}/api/sessions/${sid}`)).json();
  expect(snap.case.sensing_locked).toBe(true);
  expect(snap.trace.functional_result).toBeNull();
});

test("Scenario 3 — Mdm Siti: home monitoring, then a follow-up with a new red flag → emergency", async ({ page }) => {
  await asPersona(page, "mdm_siti");
  await startCheck(page, "I'm tired and don't feel like myself.");
  await answerSafety(page, (q) => (/how long/i.test(q) ? "Since yesterday" : SAFE(q)));
  await doMovementCheck(page);
  await expect(heading(page)).toHaveText("Did you need to push up with your arms to stand?");
  await button(page, "No").click(); // arms not needed
  await expect(heading(page)).toHaveText("Within your usual range");
  await button(page, "See my next step").click();
  await expect(page.getByRole("heading", { name: "You can continue monitoring at home for now" })).toBeVisible();

  // Next day: the scheduled check-in on Today.
  await page.goto("/today");
  await expect(page.getByText("Next check")).toBeVisible();
  await button(page, "Start early").click();
  await expect(page).toHaveURL(/\/follow-up\?prev=/);
  await expect(page.getByText("Home monitoring")).toBeVisible();
  await page.getByRole("button", { name: /Something new/ }).click();
  await expect(page).toHaveURL(/\/follow-up\/changes/);
  await expect(button(page, "Continue")).toBeDisabled();
  await page.getByLabel("What has changed").fill("My daughter said I seemed confused last night.");
  await button(page, "Continue").click();

  await expect(page).toHaveURL(/\/check\/complete/);
  await expect(page.getByRole("heading", { name: "This needs help now" })).toBeVisible();
  await expect(page.getByText("Compared with your last check")).toBeVisible();
  await expect(page.getByText(/Last time's result is only background/)).toBeVisible();
});

test("Scenario 4 — someone walks through: the reading is rejected → can't judge safely", async ({ page, request }) => {
  await request.post(`${API}/api/dev/sensor`, { data: { next_override: "tan_interference" } });
  await asPersona(page, "mdm_tan");
  await startCheck(page, "I've felt weak for two days.");
  await answerSafety(page, (q) => (/eating and drinking/i.test(q) ? "No" : SAFE(q)));
  await doMovementCheck(page);

  await expect(heading(page)).toHaveText("The reading wasn't reliable");
  await expect(page.getByText("It looked like someone else was moving nearby.")).toBeVisible();
  await button(page, "See my next step").click();
  await expect(page.getByRole("heading", { name: "I can't safely judge this from here" })).toBeVisible();
});

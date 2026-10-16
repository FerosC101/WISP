import { expect, test } from "@playwright/test";
import { DECLINED, answerSafety, apiCheck, asPersona, button, heading, resetApi, startCheck } from "./helpers";

// v5: first-time Today, answers that survive navigation, clear history statuses, assessment modules.

test.beforeEach(async ({ request }) => resetApi(request));

test("Today: first-time guide until there is a recommendation", async ({ page, request }) => {
  await asPersona(page, "mdm_tan");
  await page.goto("/today");
  const guide = page.getByRole("region", { name: "How a check-in works" });
  await expect(guide).toBeVisible();
  await expect(guide).toContainText("checks for emergency warning signs first");

  await apiCheck(request, "mdm_tan", DECLINED);
  await page.reload();
  await expect(page.getByText(/Most recent/)).toBeVisible();
  await expect(guide).toHaveCount(0);
});

test("check start: answers survive leaving the screen, and are cleared once the check starts", async ({ page }) => {
  await asPersona(page, "mdm_tan");
  await page.goto("/check/start");
  await page.getByRole("checkbox", { name: "Weakness" }).click();
  await button(page, "Next: when it started").click();
  await page.getByRole("radio", { name: "Yesterday" }).click();

  await page.goto("/history"); // e.g. a tab tapped by accident
  await page.goto("/check/start");
  await expect(heading(page)).toHaveText("When did this start?");
  await expect(page.getByRole("radio", { name: "Yesterday" })).toHaveAttribute("aria-checked", "true");

  await button(page, "Next: anything else").click();
  await page.getByRole("checkbox", { name: "Nothing else" }).click();
  await button(page, "Start the safety check").click();
  await expect(page).toHaveURL(/\/check\/safety/);
  await page.goto("/check/start");
  await expect(heading(page)).toHaveText("What feels different today?");
  await expect(page.getByRole("checkbox", { name: "Weakness" })).toHaveAttribute("aria-checked", "false");
});

test("History: completed and unfinished checks are labelled differently", async ({ page, request }) => {
  await apiCheck(request, "mdm_tan", DECLINED);
  await asPersona(page, "mdm_tan");
  await startCheck(page, "I feel weak"); // left unfinished
  await page.goto("/history");
  await expect(page.getByText("Completed", { exact: true })).toBeVisible();
  await expect(page.getByText("Not finished", { exact: true })).toBeVisible();
  await expect(page.getByText("→ No recommendation yet")).toBeVisible();
});

test("room ready: WISP is clear that it can't check the room for hazards", async ({ page }) => {
  await asPersona(page, "mdm_tan");
  await startCheck(page, "I feel weak");
  await answerSafety(page);
  await button(page, "Yes, continue").click();
  await button(page, "Do the check").click();
  await expect(page).toHaveURL(/\/check\/room-ready/);
  await expect(page.getByText(/WISP can.t see your room or check it for hazards/)).toBeVisible();
  await expect(button(page, "I can't set this up — skip the check")).toBeVisible();
});

test("Engineering view: only implemented assessment modules, with limits and validation status", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await asPersona(page, "mdm_tan");
  await page.goto("/dev");
  await expect(page.getByRole("heading", { name: "Assessment modules" })).toBeVisible();
  await expect(page.getByText("Five-times sit-to-stand (5xSTS)")).toBeVisible();
  await expect(page.getByText(/not clinically validated/).first()).toBeVisible();
});

test("service unavailable: History and Care say so instead of showing an empty record", async ({ page, request }) => {
  await apiCheck(request, "mdm_tan", DECLINED);
  await asPersona(page, "mdm_tan");
  await page.route("http://127.0.0.1:8788/api/history**", (r) => r.abort());
  await page.goto("/history");
  await expect(page.locator("main").getByRole("alert")).toContainText("can't reach its local service");
  await expect(page.getByText("No check-ins yet")).toHaveCount(0);
  await page.goto("/care");
  await expect(page.getByText("No recommendation yet")).toHaveCount(0);
  await expect(page.locator("main").getByRole("alert").first()).toContainText("can't reach its local service");
});

test("unknown pages get a friendly 404 with a way home and 995", async ({ page }) => {
  await asPersona(page, "mdm_tan");
  const res = await page.goto("/no-such-page");
  expect(res?.status()).toBe(404);
  await expect(heading(page)).toHaveText("We couldn't find that page");
  await expect(page.getByRole("link", { name: "995" })).toHaveAttribute("href", "tel:995");
  await page.getByRole("link", { name: "Go to Today" }).click();
  await expect(page).toHaveURL(/\/today$/);
});

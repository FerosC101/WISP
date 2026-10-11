import { expect, test } from "@playwright/test";
import { API, DECLINED, SAFE, answerSafety, apiCheck, apiT4, asPersona, button, resetApi, startCheck } from "./helpers";

// Navigation, old URLs, layout at 390 px, the Technical and Engineering views, WorkBuddy mode.

test.beforeEach(async ({ request }) => resetApi(request));

test("bottom navigation: five tabs, the right one highlighted", async ({ page }) => {
  await asPersona(page, "mdm_tan");
  await page.goto("/");
  await expect(page).toHaveURL(/\/today$/);
  const nav = page.locator("#sticky-actions + nav");
  for (const [tab, url] of [
    ["Check", /\/check\/start/],
    ["Care", /\/care$/],
    ["History", /\/history$/],
    ["You", /\/you$/],
    ["Today", /\/today$/],
  ] as const) {
    await nav.getByRole("link", { name: tab }).click();
    await expect(page).toHaveURL(url);
    await expect(nav.getByRole("link", { name: tab })).toHaveAttribute("aria-current", "page");
  }
  await page.goto("/you/baseline");
  await expect(nav.getByRole("link", { name: "You" })).toHaveAttribute("aria-current", "page");
});

test("old v2 URLs redirect to their v3 homes", async ({ page, request }) => {
  const sid = await apiCheck(request, "mdm_tan", DECLINED);
  await asPersona(page, "mdm_tan");
  for (const [from, to] of [
    ["/check", /\/check\/start$/],
    ["/baseline", /\/you\/baseline$/],
    ["/privacy", /\/you\/privacy$/],
    [`/caregiver/${sid}`, new RegExp(`/care/share\\?s=${sid}$`)],
  ] as const) {
    await page.goto(from);
    await expect(page).toHaveURL(to);
  }
});

test("no page scrolls sideways at 390 px", async ({ page, request }) => {
  const sid = await apiT4(request);
  await asPersona(page, "mdm_siti");
  for (const path of [
    "/today",
    "/check/start",
    "/care",
    `/care/plan?s=${sid}`,
    `/care/find?s=${sid}`,
    `/care/visit-summary?s=${sid}`,
    `/care/share?s=${sid}`,
    "/history",
    `/history/${sid}`,
    "/you",
    "/you/health",
    "/you/baseline",
    "/you/privacy",
    `/follow-up?prev=${sid}`,
    `/check/complete?s=${sid}`,
  ]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBeLessThanOrEqual(1);
  }
});

test("Larger text: the summary's main button is still on screen", async ({ page }) => {
  await asPersona(page, "mdm_tan", { largeText: true });
  await startCheck(page, "I feel weak");
  await answerSafety(page, (q) => (/eating and drinking/i.test(q) ? "No" : SAFE(q)));
  await expect(page.locator("html")).toHaveAttribute("data-large", "true");
  await expect(button(page, "Yes, continue")).toBeInViewport();
  await page.goto("/today");
  await expect(page.getByRole("link", { name: "Start a new check-in" })).toBeInViewport();
});

test("Technical view: structured decision record, links to and from the patient screens", async ({ page, request }) => {
  const sid = await apiT4(request);
  await asPersona(page, "mdm_siti", { devMode: true });
  await page.goto(`/care/plan?s=${sid}`);
  await page.getByRole("link", { name: "Technical view (this check)" }).click();
  await expect(page).toHaveURL(new RegExp(`/explain/${sid}`));
  await expect(page.getByText("not model chain-of-thought")).toBeVisible();
  for (const step of ["Safety screen", "Possible care range", "Options considered", "Sensor result", "Baseline result", "Final disposition"]) {
    await expect(page.getByRole("heading", { name: step })).toBeVisible();
  }
  await expect(page.getByText("run_functional_assessment(\"5xSTS\")")).toBeVisible();
  await page.getByRole("link", { name: "Patient view" }).click();
  await expect(page).toHaveURL(new RegExp(`/history/${sid}`));
});

test("Engineering view: real-vs-recorded badges, validated ground truth, WorkBuddy tool-call filter", async ({ page, request }) => {
  await apiT4(request);
  // One WorkBuddy tool call through the token-protected tools API.
  await request.post(`${API}/api/sessions`, { data: { user_id: "mr_lim", agent: "workbuddy" } });
  const H = { "X-WISP-Token": "wisp-local-dev-token" };
  const { session_id } = await (await request.post(`${API}/api/tools/get_active_session`, { headers: H, data: { user_id: "mr_lim" } })).json();
  expect((await request.post(`${API}/api/tools/screen_red_flags`, { headers: H, data: { session_id } })).ok()).toBeTruthy();

  await page.setViewportSize({ width: 1280, height: 900 }); // engineering view is a desktop tool
  await page.goto("/dev");
  await expect(page.getByText("SYNTHETIC").first()).toBeVisible();
  await page.locator("main tbody tr").first().click();
  await expect(page.getByText("Not real-world evidence")).toBeVisible();
  const gt = page.getByLabel("Ground truth seconds");
  await gt.fill("abc");
  await expect(button(page, "Save")).toBeDisabled();
  await expect(page.getByText("Enter seconds between 2 and 120.")).toBeVisible();
  await gt.fill("12.4");
  await expect(button(page, "Save")).toBeEnabled();

  await page.getByRole("radio", { name: "WorkBuddy tool calls" }).click();
  await expect(page.getByText("1 event", { exact: true })).toBeVisible();
  await expect(page.getByText(/screen_red_flags/)).toBeVisible();
});

test("WorkBuddy mode: a new check opens the conversation view and waits for WorkBuddy", async ({ page }) => {
  await asPersona(page, "mdm_tan", { agentMode: "workbuddy" });
  await page.goto("/check/start");
  await page.getByLabel("Tell WISP how you feel").fill("I feel weak");
  await button(page, "Start check-in").click();
  await expect(page).toHaveURL(/\/session\/s_/);
  await expect(page.getByText("Waiting for WorkBuddy to join this assessment…")).toBeVisible();
});

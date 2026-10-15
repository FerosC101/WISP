// Captures real WISP patient-app screens for the demo film.
// Run from apps/web (uses its isolated e2e stack: seeded API :8788 + prod build :3100):
//   cp ../../video/wisp-demo/capture/capture.spec.ts e2e/_capture.spec.ts && npx playwright test e2e/_capture.spec.ts; rm e2e/_capture.spec.ts
import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { API, SAFE, answerSafety, asPersona, button, doMovementCheck, heading, resetApi, startCheck, tickAll } from "./helpers";

const OUT = path.join(__dirname, "..", "..", "..", "video", "wisp-demo", "public", "screens");
test.use({ deviceScaleFactor: 3 });
test.setTimeout(240_000);

async function snap(page: Page, name: string, full = false) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(900);
  if (!full) { await page.evaluate(() => { (document.activeElement as HTMLElement | null)?.blur(); window.scrollTo(0, 0); }); await page.waitForTimeout(300); }
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: full, animations: "disabled" });
}

/** Viewport shot with `target` scrolled into view (full-page shots would paint the fixed nav mid-page). */
async function snapAt(page: Page, name: string, target: ReturnType<Page["getByText"]>) {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await target.first().evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), animations: "disabled" });
}

test.beforeEach(async ({ request }) => resetApi(request));

test("mdm tan — T2 journey", async ({ page, request }) => {
  await request.post(`${API}/api/dev/sensor`, { data: { speed: 1 } });
  await page.clock.install({ time: new Date("2026-10-14T09:30:00+08:00") }); // "Good morning" greeting
  await asPersona(page, "mdm_tan");
  await page.goto("/today");
  await snap(page, "tan_01_today");
  await page.goto("/check/start");
  await page.getByLabel("Tell WISP how you feel").fill("I've been feeling weak for two days.");
  await snap(page, "tan_02_start");
  await snapAt(page, "tan_02_start_typed", page.getByRole("button", { name: "Start check-in" }));
  await button(page, "Start check-in").click();
  await expect(page).toHaveURL(/\/check\/(safety|complete|summary)/);
  let i = 0;
  for (let k = 0; k < 16 && /\/check\/safety/.test(page.url()); k++) {
    const q = (await heading(page).innerText()).trim();
    if (i === 0) await snapAt(page, "tan_03_safety_0_msg", page.getByText("You said you"));
    if (i < 6) await snap(page, `tan_03_safety_${i++}`);
    const a = /eating and drinking/i.test(q) ? "No" : SAFE(q);
    await button(page, a).click();
    await expect.poll(async () => (/\/check\/safety/.test(page.url()) ? (await heading(page).innerText()).trim() : "left")).not.toBe(q);
  }
  await expect(page).toHaveURL(/\/check\/summary/);
  await snap(page, "tan_04_summary");
  await snap(page, "tan_04_summary_full", true);
  await button(page, "Yes, continue").click();
  await expect(page).toHaveURL(/\/check\/decision/);
  await expect(button(page, "Do the check")).toBeVisible({ timeout: 30_000 });
  await snap(page, "tan_05_decision");
  const why = page.getByRole("button", { name: /Why this check/i });
  if (await why.count()) { await why.first().click(); await snap(page, "tan_05_decision_why"); }
  await snap(page, "tan_05_decision_full", true);
  await button(page, "Do the check").click();
  await expect(page).toHaveURL(/\/check\/room-ready/);
  await snap(page, "tan_06_room");
  await tickAll(page, 3);
  await button(page, "My space is ready").click();
  await snap(page, "tan_06b_steady");
  await button(page, "Yes, I feel steady").click();
  await snap(page, "tan_06c_alone");
  await button(page, "No, I'm alone").click();
  await expect(page).toHaveURL(/\/check\/movement/);
  await snap(page, "tan_07_movement_ready");
  await button(page, "I'm ready").click();
  for (let s = 0; s < 8; s++) {
    if (/movement-result/.test(page.url())) break;
    await page.waitForTimeout(1600);
    await page.screenshot({ path: path.join(OUT, `tan_07_movement_${s}.png`) });
  }
  await expect(page).toHaveURL(/\/check\/movement-result/, { timeout: 90_000 });
  await snap(page, "tan_08_arms");
  await button(page, "Yes").click();
  await expect(heading(page)).toHaveText("Slower than your usual pattern");
  await snap(page, "tan_09_result");
  await snap(page, "tan_09_result_full", true);
  await button(page, "See my next step").click();
  await expect(page.getByRole("heading", { name: "Please be seen today" })).toBeVisible();
  await snap(page, "tan_10_complete");
  await snap(page, "tan_10_complete_full", true);
  await snapAt(page, "tan_10_complete_why", page.getByText("Why this advice"));
  await snapAt(page, "tan_10_complete_watch", page.getByText("Watch for"));
  const sid = new URL(page.url()).searchParams.get("s");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/explain/${sid}`);
  await snap(page, "tan_11_explain", false);
  await snap(page, "tan_11_explain_full", true);
  await page.goto(`/dev`);
  await snap(page, "dev_01", false);
  await snap(page, "dev_01_full", true);
});

test("mr lim — red flag", async ({ page }) => {
  await asPersona(page, "mr_lim");
  await page.goto("/check/start");
  await page.getByLabel("Tell WISP how you feel").fill("This morning I suddenly felt dizzy and my left hand feels clumsy.");
  await snap(page, "lim_01_start");
  await button(page, "Start check-in").click();
  await expect(page.getByRole("heading", { name: "This needs help now" })).toBeVisible();
  await snap(page, "lim_02_complete");
  await snap(page, "lim_02_complete_full", true);
  const sid = new URL(page.url()).searchParams.get("s");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/explain/${sid}`);
  await snap(page, "lim_03_explain_full", true);
});

test("mdm siti — follow-up", async ({ page }) => {
  await asPersona(page, "mdm_siti");
  await startCheck(page, "I'm tired and don't feel like myself.");
  await answerSafety(page, (q) => (/how long/i.test(q) ? "Since yesterday" : SAFE(q)));
  await doMovementCheck(page);
  await button(page, "No").click();
  await expect(heading(page)).toHaveText("Within your usual range");
  await snap(page, "siti_01_result");
  await button(page, "See my next step").click();
  await snap(page, "siti_02_home");
  await page.goto("/today");
  await button(page, "Start early").click();
  await page.getByRole("button", { name: /Something new/ }).click();
  await page.getByLabel("What has changed").fill("My daughter said I seemed confused last night.");
  await snap(page, "siti_03_change");
  await button(page, "Continue").click();
  await expect(page.getByRole("heading", { name: "This needs help now" })).toBeVisible();
  await snap(page, "siti_04_complete");
  await snap(page, "siti_04_complete_full", true);
});

test("interference — abstain", async ({ page, request }) => {
  await request.post(`${API}/api/dev/sensor`, { data: { next_override: "tan_interference" } });
  await asPersona(page, "mdm_tan");
  await startCheck(page, "I've felt weak for two days.");
  await answerSafety(page, (q) => (/eating and drinking/i.test(q) ? "No" : SAFE(q)));
  await doMovementCheck(page);
  await expect(heading(page)).toHaveText("The reading wasn't reliable");
  await snap(page, "int_01_unreliable");
  await button(page, "See my next step").click();
  await expect(page.getByRole("heading", { name: "I can't safely judge this from here" })).toBeVisible();
  await snap(page, "int_02_abstain");
  await snap(page, "int_02_abstain_full", true);
});

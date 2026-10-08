import { expect, test } from "@playwright/test";
import { API, apiCheck, apiT4, asPersona, button, heading, resetApi, startCheck, tickAll } from "./helpers";

// History, My usual and the You section.

test.beforeEach(async ({ request }) => resetApi(request));

test("History: timeline with movement result, follow-up link, healthy days and check details", async ({ page, request }) => {
  const prev = await apiT4(request);
  await request.post(`${API}/api/sessions/${prev}/followup`, {
    data: { trend: "new", text: "My daughter said I seemed confused last night.", confirm_summary: true },
  });
  await asPersona(page, "mdm_siti");
  await page.goto("/history");

  await expect(page.getByText("Movement within your usual")).toBeVisible();
  await expect(page.getByText("Followed up: emergency help")).toBeVisible();
  await expect(page.getByText(/Follow-up of /)).toBeVisible();
  await expect(page.getByText("No movement check")).toBeVisible();

  await page.getByRole("radio", { name: "Healthy days" }).click();
  await expect(page.locator('main a[href="/you/baseline"]')).toHaveCount(3); // the three healthy-day entries
  await expect(page.getByText("Movement within your usual")).toHaveCount(0);
  await page.getByRole("radio", { name: "Everything" }).click();

  await page.getByRole("link", { name: /Home monitoring/ }).click();
  await expect(page).toHaveURL(new RegExp(`/history/${prev}`));
  await expect(page.getByRole("region", { name: "What WISP checked" })).toContainText("Movement within your usual");
  await expect(page.getByRole("region", { name: "Follow-ups" })).toContainText("Emergency help");
  await expect(page.getByText(/fixed safety rules, not by the AI/)).toBeVisible(); // How WISP decided
  await page.getByRole("link", { name: "Visit summary" }).click();
  await expect(page).toHaveURL(new RegExp(`/care/visit-summary\\?s=${prev}`));
});

test("an unfinished check can be continued from History", async ({ page }) => {
  await asPersona(page, "mdm_tan");
  await startCheck(page, "I feel weak");
  await page.goto("/history");
  await expect(page.getByText("Not finished")).toBeVisible();
  await page.getByText("Continue this check").click();
  await expect(page).toHaveURL(/\/check\/safety/);
  await expect(heading(page)).toHaveText("Did it start suddenly, or gradually?");
});

test("My usual: progress, status and seconds only behind View details", async ({ page }) => {
  await asPersona(page, "mdm_tan");
  await page.goto("/baseline"); // old URL redirects
  await expect(page).toHaveURL(/\/you\/baseline$/);
  await expect(page.getByText("3 of 3 done")).toBeVisible();
  await expect(page.getByText("Stable", { exact: true })).toBeVisible();
  await expect(page.getByText(/seconds/)).not.toBeVisible();
  await page.getByText("View details").click();
  await expect(page.getByText(/usually take you about \d+\.\d seconds/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Record another healthy-day check" })).toBeInViewport();
});

test("healthy-day check journey: not today, a stopped check is discarded, a full one is added", async ({ page, request }) => {
  await asPersona(page, "mr_lim");
  await page.goto("/you/baseline");
  await expect(page.getByText("0 of 3 done")).toBeVisible();

  // Not feeling like yourself → do it another day.
  await page.getByRole("link", { name: "Record my first healthy-day check" }).click();
  await expect(heading(page)).toHaveText("Build your usual");
  await button(page, "Let's start").click();
  await button(page, "Not today").click();
  await expect(heading(page)).toHaveText("Let's do this another day");

  // Stopped part-way → nothing saved.
  await request.post(`${API}/api/dev/sensor`, { data: { speed: 1 } });
  await page.goto("/you/baseline/enroll");
  await button(page, "Let's start").click();
  await button(page, "Yes, I feel like myself").click();
  await expect(button(page, "Tick each item to continue")).toBeDisabled();
  await tickAll(page, 4);
  await button(page, "I'm ready").click();
  await button(page, "No, I stand up without my arms").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.waitForTimeout(1500);
  await page.getByRole("dialog").getByRole("button", { name: "Stop" }).click();
  await expect(heading(page)).toHaveText("You stopped the check");
  expect((await (await request.get(`${API}/api/baselines/mr_lim`)).json()).baseline).toBeNull();

  // A full check is added.
  await request.post(`${API}/api/dev/sensor`, { data: { speed: 8 } });
  await page.goto("/you/baseline/enroll");
  await button(page, "Let's start").click();
  await button(page, "Yes, I feel like myself").click();
  await tickAll(page, 4);
  await button(page, "I'm ready").click();
  await button(page, "No, I stand up without my arms").click();
  await expect(heading(page)).toHaveText("Healthy-day check saved.", { timeout: 30_000 });
  await expect(page.getByText("1 of 3 healthy-day checks")).toBeVisible();

  // Inline delete.
  await page.getByRole("link", { name: "Back to My usual" }).click();
  await expect(page.getByText("1 of 3 done")).toBeVisible();
  await button(page, "Delete my usual pattern").click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("0 of 3 done")).toBeVisible();
});

test("You: hub, health profile, language changes the safety questions, accessibility", async ({ page }) => {
  await asPersona(page, "mdm_tan");
  await page.goto("/you");
  await expect(page.getByRole("link", { name: /Trusted people.*Daniel \(son\)/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /My usual.*Stable/ })).toBeVisible();

  await page.getByRole("link", { name: /Health profile/ }).click();
  await expect(page.getByText("Amlodipine")).toBeVisible();
  await expect(page.getByText(/isn.t sent to WISP.s assistant/)).toBeVisible();

  await page.goto("/you/accessibility");
  await page.getByRole("switch", { name: /Larger text/ }).check();
  await expect(page.locator("html")).toHaveAttribute("data-large", "true");
  await page.getByRole("switch", { name: /Less motion/ }).check();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await page.getByRole("switch", { name: /Larger text/ }).uncheck();

  await page.goto("/you/language");
  await page.getByRole("radio", { name: "Melayu" }).click();
  await expect(page.getByText(/still being checked by native speakers/)).toBeVisible();
  await startCheck(page, "I feel weak");
  await expect(heading(page)).toHaveText("Adakah ia bermula secara tiba-tiba atau beransur-ansur?");
});

test("removing the trusted person stops sharing", async ({ page, request }) => {
  const sid = await apiCheck(request, "mdm_tan", ["gradual", "d_days", "no", "no", "no", "no", "no", "no", "no", "no", "yes", "confirm", "skip"]);
  await asPersona(page, "mdm_tan");
  await page.goto("/you/caregivers");
  await button(page, "Remove Daniel").click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Remove" }).click();
  await expect(page.getByText("Daniel has been removed.")).toBeVisible();
  await expect(page.getByText("No one added")).toBeVisible();
  await page.goto(`/care/share?s=${sid}`);
  await expect(page.getByText(/haven.t added a trusted person/)).toBeVisible();
});

test("privacy: deleting all data empties History and My usual", async ({ page, request }) => {
  await apiCheck(request, "mdm_tan", ["gradual", "d_days", "no", "no", "no", "no", "no", "no", "no", "no", "yes", "confirm", "skip"]);
  await asPersona(page, "mdm_tan");
  await page.goto("/privacy"); // old URL redirects
  await expect(page).toHaveURL(/\/you\/privacy$/);
  await button(page, "Delete all my WISP data").click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Keep my data" }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await button(page, "Delete all my WISP data").click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete everything" }).click();
  await expect(page.getByText("Your WISP data on this device has been deleted.")).toBeVisible();
  await page.goto("/history");
  await page.getByRole("radio", { name: "Checks" }).click();
  await expect(page.getByText("No check-ins yet")).toBeVisible();
  await page.goto("/you/baseline");
  await expect(page.getByText("0 of 3 done")).toBeVisible();
});

import { expect, test } from "@playwright/test";
import { API, DECLINED, apiCheck, apiT4, asPersona, button, resetApi } from "./helpers";

// The Care section: hub, care plan, Find care, provider detail, visit summary, sharing.

const T1 = ["gradual", "d_days", "yes"]; // chest pain → emergency

test.beforeEach(async ({ request }) => resetApi(request));

test("Care is empty before any check", async ({ page }) => {
  await asPersona(page, "mr_lim");
  await page.goto("/care");
  await expect(page.getByText("No recommendation yet")).toBeVisible();
  await page.getByRole("link", { name: "Start a check" }).click();
  await expect(page).toHaveURL(/\/check\/start/);
});

test("Care hub shows the latest recommendation and every section", async ({ page, request }) => {
  await apiCheck(request, "mdm_tan", DECLINED);
  await asPersona(page, "mdm_tan");
  await page.goto("/care");
  await expect(page.getByText("Book your doctor in the next few days")).toBeVisible();
  const sections = page.getByRole("navigation", { name: "Your care" });
  for (const name of ["Care plan", "Find care", "Visit summary", "Share with family"]) await expect(sections.getByRole("link", { name: new RegExp(name) })).toBeVisible();
  await expect(page.getByText(/No check-in is scheduled/)).toBeVisible();
  await page.getByRole("link", { name: /Care plan/ }).click();
  await expect(page).toHaveURL(/\/care\/plan\?s=/);
});

test("care plan: Now / Today / Next / If worse, and ticks survive a reload", async ({ page, request }) => {
  const sid = await apiCheck(request, "mdm_tan", DECLINED);
  await asPersona(page, "mdm_tan");
  await page.goto(`/care/plan?s=${sid}`);
  for (const phase of ["Now", "Today", "Next", "If symptoms get worse"]) await expect(page.getByRole("region", { name: phase })).toBeVisible();
  await expect(page.getByText("Book an appointment with Demo Family Clinic (Toa Payoh) or a polyclinic")).toBeVisible();
  const tick = page.getByRole("checkbox", { name: /Done: Book an appointment/ });
  await tick.check();
  await page.reload();
  await expect(page.getByRole("checkbox", { name: /Done: Book an appointment/ })).toBeChecked();
  await expect(page.getByRole("region", { name: "If symptoms get worse" }).getByRole("link", { name: "Call 995" })).toHaveAttribute("href", "tel:995");
});

test("home-monitoring plan offers the scheduled check-in", async ({ page, request }) => {
  const sid = await apiT4(request);
  await asPersona(page, "mdm_siti");
  await page.goto(`/care/plan?s=${sid}`);
  await expect(page.getByText(/WISP will check in with you tomorrow/)).toBeVisible();
  await button(page, "Check in now").click();
  await expect(page).toHaveURL(new RegExp(`/follow-up\\?prev=${sid}`));
});

test("Find care: best option first, A&E kept for emergencies, distance only with location", async ({ page, request, context }) => {
  const sid = await apiCheck(request, "mdm_tan", DECLINED);
  await asPersona(page, "mdm_tan");
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 1.351, longitude: 103.8485 }); // near Bishan
  await page.goto(`/care/find?s=${sid}`);
  await expect(page.getByRole("region", { name: "Best for you now" })).toContainText("Demo Family Clinic (Toa Payoh)");
  await expect(page.getByRole("region", { name: "In an emergency" })).toContainText("Only if warning signs appear");
  await expect(page.getByText(/km away/)).toHaveCount(0);
  await button(page, "Show how far away your clinic is").click();
  await expect(page.getByText(/About \d+\.\d km away/)).toBeVisible();
  await expect(page.getByText(/can.t see opening hours, waiting times or appointment slots/)).toBeVisible();
  await page.getByRole("link", { name: "Details" }).first().click();
  await expect(page).toHaveURL(/\/care\/provider\/usual-gp/);
  await expect(page.getByText(/WISP can.t see these/)).toBeVisible();
});

test("Find care for an emergency: Call 995 and A&E only", async ({ page, request }) => {
  const sid = await apiCheck(request, "mdm_tan", T1);
  await asPersona(page, "mdm_tan");
  await page.goto(`/care/find?s=${sid}`);
  await expect(page.getByRole("link", { name: "Call 995" })).toBeInViewport();
  await expect(page.getByText("Emergency department (A&E)")).toBeVisible();
  await expect(page.getByText("Polyclinic", { exact: true })).toHaveCount(0);
  // The hub doesn't offer family sharing for emergencies.
  await page.goto(`/care?s=${sid}`);
  await expect(page.getByRole("link", { name: /Share with family/ })).toHaveCount(0);
});

test("visit summary: clinician details, synthetic-data notice, doctor view and copy fallback", async ({ page, request, context }) => {
  const sid = await apiT4(request);
  await asPersona(page, "mdm_siti");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.addInitScript(() => Object.defineProperty(navigator, "share", { value: undefined, configurable: true }));
  await page.goto(`/care/visit-summary?s=${sid}`);
  const doc = page.getByRole("article", { name: "Visit summary" });
  await expect(doc).toContainText("recorded SYNTHETIC sensor session");
  await expect(doc).toContainText(/Five-times sit-to-stand: \d+\.\d s for 5 rises/);
  await expect(doc).toContainText(/Usual range .* from 3 healthy-day checks/);
  await expect(doc).toContainText("not a diagnosis");

  await button(page, "Show full screen").click();
  await expect(page.getByRole("dialog", { name: "Visit summary for your doctor" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await button(page, "Share").click();
  await expect(page.getByText("Copied. You can paste it into a message.")).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("NOTE: Movement data is from a recorded SYNTHETIC sensor session");
});

test("sharing: minimal preview by default, explicit agreement, exact text recorded", async ({ page, request }) => {
  const sid = await apiCheck(request, "mdm_tan", DECLINED);
  await asPersona(page, "mdm_tan");
  await page.goto(`/care/share?s=${sid}`);
  const preview = page.getByRole("region", { name: /Exactly what Daniel will receive/ });
  await expect(preview).toContainText("WISP's advice");
  await expect(preview).not.toContainText("weaker");

  const send = button(page, "Send to Daniel");
  await expect(send).toBeInViewport();
  await expect(send).toBeDisabled();
  await page.getByRole("switch", { name: /Include the reasons/ }).check();
  await expect(preview).toContainText("What WISP told Mdm Tan");
  await page.getByRole("checkbox", { name: /I agree to send this message to Daniel/ }).check();
  await send.click();
  await expect(page.getByText("Sent to Daniel. (Prototype: delivery is simulated.)")).toBeVisible();
  await expect(page.getByRole("region", { name: "Already shared" })).toContainText("With Daniel");

  const shared = (await (await request.get(`${API}/api/sessions/${sid}/caregiver-summary?include_reasons=true`)).json()).shared;
  expect(shared).toHaveLength(1);
});

test("the end-of-check share prompt goes through the preview", async ({ page, request }) => {
  const sid = await apiCheck(request, "mdm_tan", DECLINED);
  await asPersona(page, "mdm_tan");
  await page.goto(`/check/complete?s=${sid}`);
  await expect(page.getByText("Would you like to share a short summary with Daniel?")).toBeVisible();
  await page.getByRole("link", { name: "Preview and share" }).click();
  await expect(page).toHaveURL(new RegExp(`/care/share\\?s=${sid}`));
});

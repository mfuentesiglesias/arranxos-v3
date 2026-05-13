import { expect, test, type Page } from "@playwright/test";

function byTestId(page: Page, testId: string) {
  return page.getByTestId(testId).first();
}

async function expectVisibleByTestId(page: Page, testId: string) {
  await expect(byTestId(page, testId)).toBeVisible();
}

async function clickByTestId(page: Page, testId: string) {
  await byTestId(page, testId).click();
}

async function loginWithDemoAccess(page: Page, testId: string) {
  await setDemoSession(page, testId);
  await page.goto(getDemoTargetPath(testId));
  await expect(page).toHaveURL(getDemoTargetUrl(testId));
  await waitForDemoLanding(page, testId);
}

function getDemoTargetPath(testId: string) {
  return testId === "demo-client"
    ? "/cliente/inicio"
    : testId === "demo-pro-pending"
      ? "/profesional/pendiente"
      : testId === "demo-pro-approved"
        ? "/profesional/inicio"
        : "/admin";
}

function getDemoTargetUrl(testId: string) {
  return testId === "demo-client"
    ? /\/cliente\/inicio/
    : testId === "demo-pro-pending"
      ? /\/profesional\/pendiente/
      : testId === "demo-pro-approved"
        ? /\/profesional\/inicio/
        : /\/admin/;
}

async function waitForDemoLanding(page: Page, testId: string) {
  if (testId === "demo-admin") {
    await page.waitForLoadState("load");
    return;
  }

  if (testId === "demo-pro-approved") {
    await expect(page.getByText("Trabajos cerca de ti").first()).toBeVisible();
    return;
  }

  if (testId === "demo-pro-pending") {
    await expect(page.getByText("Cuenta en revisión").first()).toBeVisible();
    return;
  }

  await expect(page.getByText("¿Qué necesitas hoy?").first()).toBeVisible();
}

async function setDemoSession(page: Page, testId: string) {
  await page.evaluate((recipientTestId) => {
    const raw = window.localStorage.getItem("arranxos-session");
    const parsed = raw ? JSON.parse(raw) : {};
    const persistedState = parsed?.state && typeof parsed.state === "object" ? parsed.state : {};
    const role = recipientTestId === "demo-admin"
      ? "admin"
      : recipientTestId === "demo-client"
        ? "client"
        : "professional";
    const proStatus = recipientTestId === "demo-pro-pending" ? "pending" : "approved";
    const currentProfessionalId = recipientTestId === "demo-pro-pending" ? "p4" : "p1";

    window.localStorage.setItem(
      "arranxos-session",
      JSON.stringify({
        state: {
          ...persistedState,
          role,
          proStatus,
          currentClientId: "u1",
          currentProfessionalId,
          currentAdminId: "a1",
        },
        version: parsed?.version ?? 0,
      }),
    );
  }, testId);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
});

test("oportunidades profesional aplican radio/distancia mock", async ({ page }) => {
  await loginWithDemoAccess(page, "demo-pro-approved");
  await page.goto("/profesional/trabajos");

  await expectVisibleByTestId(page, "view-lista");
  await expectVisibleByTestId(page, "professional-jobs-radius-filter");
  await expectVisibleByTestId(page, "professional-jobs-within-radius");
  await expectVisibleByTestId(page, "professional-jobs-outside-radius");
  await expect(page.locator('[data-testid^="professional-jobs-distance-badge-"]').first()).toBeVisible();

  await clickByTestId(page, "view-mapa");
  await expectVisibleByTestId(page, "map-radius-slider");
  await byTestId(page, "map-radius-slider").evaluate((element) => {
    const input = element as HTMLInputElement;
    input.value = "5";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(byTestId(page, "map-radius-slider")).toHaveValue("5");

  await clickByTestId(page, "view-lista");
  await expect(page.locator('[data-testid^="professional-jobs-distance-badge-"]').first()).toBeVisible();
});

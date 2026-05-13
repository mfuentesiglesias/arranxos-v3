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
  await page.goto("/login");
  await expectVisibleByTestId(page, testId);

  if (testId === "demo-admin") {
    await setAdminDemoSession(page);
    await page.goto("/admin");
    return;
  }

  await clickByTestId(page, testId);
  await expect(page).toHaveURL(getDemoTargetUrl(testId));
  await waitForDemoLanding(page, testId);
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

async function setAdminDemoSession(page: Page) {
  await page.evaluate(() => {
    window.localStorage.setItem(
      "arranxos-session",
      JSON.stringify({
        state: {
          role: "admin",
          proStatus: "approved",
          currentClientId: "u1",
          currentProfessionalId: "p1",
          currentAdminId: "a1",
        },
        version: 0,
      }),
    );
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
});

test("cliente j30 carga detalle estable", async ({ page }) => {
  await loginWithDemoAccess(page, "demo-client");
  await page.goto("/cliente/trabajos/j30");
  await expect(page.getByText("Trabajo j30").first()).toBeVisible();
  await expect(page.getByText("Ticket de búsqueda creado").first()).toBeVisible();
});

test("cliente no puede valorar antes de completed", async ({ page }) => {
  await loginWithDemoAccess(page, "demo-client");
  await page.goto("/cliente/trabajos/j30/valorar");
  await expect(page.getByText("Solo puedes valorar al profesional cuando el trabajo ya esté completado.").first()).toBeVisible();
  await expect(byTestId(page, "submit-job-review")).toBeDisabled();
});

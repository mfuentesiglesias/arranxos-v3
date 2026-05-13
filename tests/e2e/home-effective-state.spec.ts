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
      : "/profesional/inicio";
}

function getDemoTargetUrl(testId: string) {
  return testId === "demo-client"
    ? /\/cliente\/inicio/
    : testId === "demo-pro-pending"
      ? /\/profesional\/pendiente/
      : /\/profesional\/inicio/;
}

async function waitForDemoLanding(page: Page, testId: string) {
  if (testId === "demo-pro-pending") {
    await expect(page.getByText("Cuenta en revisión").first()).toBeVisible();
    return;
  }

  if (testId === "demo-pro-approved") {
    await expect(page.getByTestId("professional-home-page").first()).toBeVisible();
    return;
  }

  await expect(page.getByTestId("client-home-page").first()).toBeVisible();
}

async function setDemoSession(page: Page, testId: string) {
  await page.evaluate((recipientTestId) => {
    const raw = window.localStorage.getItem("arranxos-session");
    const parsed = raw ? JSON.parse(raw) : {};
    const persistedState = parsed?.state && typeof parsed.state === "object" ? parsed.state : {};
    const role = recipientTestId === "demo-client" ? "client" : "professional";
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

test("cliente inicio refleja trabajos efectivos de la demo", async ({ page }) => {
  const jobTitle = "Trabajo demo home cliente efectivo";

  await loginWithDemoAccess(page, "demo-client");
  await page.goto("/cliente/publicar");
  await byTestId(page, "client-publish-category-search").fill("Carpintería");
  await clickByTestId(page, "client-category-carpinteria-y-madera");
  await expectVisibleByTestId(page, "client-service-muebles-a-medida");
  await clickByTestId(page, "client-service-muebles-a-medida");
  await page.getByRole("button", { name: "Continuar" }).first().click();
  await page.getByPlaceholder("Ej. Reparar cuadro eléctrico en piso").first().fill(jobTitle);
  await page
    .getByPlaceholder("Describe qué necesitas. Cuanto más detalle, mejor.")
    .first()
    .fill("Necesito comprobar que la home cliente refleja el estado efectivo.");
  await page.locator("select").nth(1).selectOption("100–300€");
  await page.getByRole("button", { name: "Revisar y publicar" }).first().click();
  await expectVisibleByTestId(page, "client-publish-review-summary");
  await page.getByRole("button", { name: "Publicar trabajo" }).first().click();
  await expect(page).toHaveURL(/\/cliente\/trabajos\/demo-job-/);

  await page
    .locator('.app-bottom-nav a[href="/cliente/inicio"]:visible')
    .evaluate((element) => (element as HTMLAnchorElement).click());
  await expect(page).toHaveURL(/\/cliente\/inicio/);
  await expectVisibleByTestId(page, "client-home-page");
  await expectVisibleByTestId(page, "client-home-pending-actions");
  await expectVisibleByTestId(page, "client-home-active-jobs");
  await expect(page.getByText(jobTitle).first()).toBeVisible();
});

test("profesional inicio muestra resumen efectivo y trabajos activos", async ({ page }) => {
  await loginWithDemoAccess(page, "demo-pro-approved");
  await page.goto("/profesional/inicio");

  await expectVisibleByTestId(page, "professional-home-page");
  await expectVisibleByTestId(page, "professional-home-pending-actions");
  await expectVisibleByTestId(page, "professional-home-active-jobs");
  await expect(page.getByText("Tus trabajos activos").first()).toBeVisible();
});

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
    const raw = window.localStorage.getItem("arranxos-session");
    const parsed = raw ? JSON.parse(raw) : {};
    const persistedState = parsed?.state && typeof parsed.state === "object" ? parsed.state : {};

    window.localStorage.setItem(
      "arranxos-session",
      JSON.stringify({
        state: {
          ...persistedState,
          role: "admin",
          proStatus: "approved",
          currentClientId: "u1",
          currentProfessionalId: "p1",
          currentAdminId: "a1",
        },
        version: parsed?.version ?? 0,
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

test("admin dashboard carga y admin trabajos refleja trabajos efectivos creados en demo", async ({ page }) => {
  const jobTitle = "Trabajo demo admin estado efectivo";

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
    .fill("Necesito un trabajo visible en admin desde el estado efectivo de la demo.");
  await page.locator("select").nth(1).selectOption("100–300€");
  await page.getByRole("button", { name: "Revisar y publicar" }).first().click();
  await expectVisibleByTestId(page, "client-publish-review-summary");
  await page.getByRole("button", { name: "Publicar trabajo" }).first().click();
  await expect(page).toHaveURL(/\/cliente\/trabajos\/demo-job-/);

  await setAdminDemoSession(page);
  await page.goto("/admin");
  await expect(page.getByText("Panel de control").first()).toBeVisible();
  await expect(page.getByText("Trabajos").first()).toBeVisible();

  await page.waitForTimeout(300);
  await page.goto("/admin/trabajos");
  await expect(page.getByText(jobTitle).first()).toBeVisible();
});

test("oportunidades profesional muestran copy alineado con filtrado mock real", async ({ page }) => {
  await loginWithDemoAccess(page, "demo-pro-approved");
  await page.goto("/profesional/trabajos");
  await expectVisibleByTestId(page, "open-filters");
  await clickByTestId(page, "open-filters");

  await expect(
    page.getByText("El radio ya aplica filtrado mock/demo sobre la lista usando distancia aproximada.").first(),
  ).toBeVisible();
  await expect(
    page.getByText("todavía no aplica filtrado real por distancia").first(),
  ).toHaveCount(0);
});

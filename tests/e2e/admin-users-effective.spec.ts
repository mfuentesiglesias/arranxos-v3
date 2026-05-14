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

async function setDemoSession(page: Page, testId: "demo-client" | "demo-admin") {
  await page.evaluate((recipientTestId) => {
    const raw = window.localStorage.getItem("arranxos-session");
    const parsed = raw ? JSON.parse(raw) : {};
    const persistedState = parsed?.state && typeof parsed.state === "object" ? parsed.state : {};

    window.localStorage.setItem(
      "arranxos-session",
      JSON.stringify({
        state: {
          ...persistedState,
          role: recipientTestId === "demo-admin" ? "admin" : "client",
          proStatus: "approved",
          currentClientId: "u1",
          currentProfessionalId: "p1",
          currentAdminId: "a1",
        },
        version: parsed?.version ?? 0,
      }),
    );
  }, testId);
}

async function loginWithDemoAccess(page: Page, testId: "demo-client" | "demo-admin") {
  await setDemoSession(page, testId);
  await page.goto(testId === "demo-admin" ? "/admin" : "/cliente/inicio");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
});

test("admin usuarios muestra clientes efectivos y actividad derivada de la demo", async ({ page }) => {
  const jobTitle = "Trabajo demo admin usuarios efectivo";

  await loginWithDemoAccess(page, "demo-client");
  await page.goto("/cliente/publicar");
  await expectVisibleByTestId(page, "client-publish-category-search");
  await byTestId(page, "client-publish-category-search").fill("Carpintería");
  await clickByTestId(page, "client-category-carpinteria-y-madera");
  await expectVisibleByTestId(page, "client-service-muebles-a-medida");
  await clickByTestId(page, "client-service-muebles-a-medida");
  await page.getByRole("button", { name: "Continuar" }).first().click();
  await page.getByPlaceholder("Ej. Reparar cuadro eléctrico en piso").first().fill(jobTitle);
  await page
    .getByPlaceholder("Describe qué necesitas. Cuanto más detalle, mejor.")
    .first()
    .fill("Necesito comprobar que admin usuarios refleja clientes efectivos.");
  await page.locator("select").nth(1).selectOption("100–300€");
  await page.getByRole("button", { name: "Revisar y publicar" }).first().click();
  await expectVisibleByTestId(page, "client-publish-review-summary");
  await page.getByRole("button", { name: "Publicar trabajo" }).first().click();
  await expect(page).toHaveURL(/\/cliente\/trabajos\/demo-job-/);

  await loginWithDemoAccess(page, "demo-admin");
  await page.goto("/admin/usuarios");
  await expectVisibleByTestId(page, "admin-users-page");
  await expectVisibleByTestId(page, "admin-users-search");
  await expectVisibleByTestId(page, "admin-user-row-u1");
  await expect(byTestId(page, "admin-user-jobs-u1")).toContainText("trabajos");
  await expect(byTestId(page, "admin-user-activity-u1")).toContainText(jobTitle);
});

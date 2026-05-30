import { expect, test, type Page } from "@playwright/test";

async function clickDemoButton(page: Page, testId: string) {
  await byTestId(page, testId).evaluate((element) => {
    (element as HTMLButtonElement).click();
  });
}

function byTestId(page: Page, testId: string) {
  return page.getByTestId(testId).first();
}

async function expectVisibleByTestId(page: Page, testId: string) {
  await expect(byTestId(page, testId)).toBeVisible();
}

async function loginAsDemoClient(page: Page) {
  await page.goto("/login");
  await expectVisibleByTestId(page, "demo-client");
  await clickDemoButton(page, "demo-client");
}

async function loginAsDemoAdmin(page: Page) {
  await page.goto("/login");
  await expectVisibleByTestId(page, "demo-admin");
  await clickDemoButton(page, "demo-admin");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
});

test("QA Baseline — login demo accesos visibles", async ({ page }) => {
  await page.goto("/login");

  await expectVisibleByTestId(page, "demo-client");
  await expectVisibleByTestId(page, "demo-pro-pending");
  await expectVisibleByTestId(page, "demo-pro-approved");
  await expectVisibleByTestId(page, "demo-admin");
});

test("QA Baseline — cliente inicia sesión demo y llega a inicio", async ({ page }) => {
  await loginAsDemoClient(page);
  await expect(page).toHaveURL(/\/cliente\/inicio/);
  await expect(page.getByText("¿Qué necesitas hoy?").first()).toBeVisible();
});

test("QA Baseline — admin inicia sesión demo y carga dashboard", async ({ page }) => {
  await loginAsDemoAdmin(page);
  await expect(page).toHaveURL(/\/admin/);
  await page.waitForLoadState("load");
});

test("QA Baseline — rutas críticas admin cargan tras login demo", async ({ page }) => {
  await loginAsDemoAdmin(page);

  await page.goto("/admin/catalogo");
  await expectVisibleByTestId(page, "admin-catalog-page");

  await page.goto("/admin/solicitudes-catalogo");
  await expectVisibleByTestId(page, "admin-catalog-requests");

  await page.goto("/admin/tickets-busqueda");
  await expect(page.locator('[data-testid="admin-search-tickets"]').first()).toHaveCount(1);
  await expect(page.locator('[data-testid^="search-ticket-"]').first()).toBeVisible();
});

test("QA Baseline — admin tickets mock no exponen datos privados", async ({ page }) => {
  await loginAsDemoAdmin(page);
  await page.goto("/admin/tickets-busqueda");
  await expect(page.locator('[data-testid^="search-ticket-"]').first()).toBeVisible();

  const ticketCard = page.locator('[data-testid^="search-ticket-"]').first();
  const cardText = await ticketCard.textContent();

  expect(cardText).not.toMatch(/@[a-zA-Z0-9]/);
  expect(cardText).not.toMatch(/\b\d{9}\b/);
  expect(cardText).not.toContain("tel");
});

test("QA Baseline — cliente j30 carga detalle estable", async ({ page }) => {
  await loginAsDemoClient(page);
  await page.goto("/cliente/trabajos/j30");
  await expect(page.getByText("Trabajo j30").first()).toBeVisible();
});

test("QA Baseline — cliente trabajos lista carga", async ({ page }) => {
  await loginAsDemoClient(page);
  await page.goto("/cliente/trabajos");
  await expect(page.getByText("Mis trabajos").first()).toBeVisible();
});

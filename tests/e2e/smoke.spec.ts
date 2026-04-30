import { expect, test, type Page } from "@playwright/test";

function byTestId(page: Page, testId: string) {
  return page.getByTestId(testId).first();
}

function byTestIdPrefix(page: Page, prefix: string) {
  return page.locator(`[data-testid^="${prefix}"]`).first();
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
  await clickByTestId(page, testId);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
});

test("login demo accesos visibles y pro approved navega", async ({ page }) => {
  await page.goto("/login");

  await expectVisibleByTestId(page, "demo-client");
  await expectVisibleByTestId(page, "demo-pro-pending");
  await expectVisibleByTestId(page, "demo-pro-approved");
  await expectVisibleByTestId(page, "demo-admin");

  await clickByTestId(page, "demo-pro-approved");
  await expect(page).toHaveURL(/\/profesional\/inicio/);
});

test("oportunidades profesional: filtros, mapa, slider y pins", async ({ page }) => {
  await loginWithDemoAccess(page, "demo-pro-approved");
  await expect(page).toHaveURL(/\/profesional\/inicio/);

  await page.goto("/profesional/trabajos");

  await expectVisibleByTestId(page, "view-lista");
  await expectVisibleByTestId(page, "view-mapa");
  await expectVisibleByTestId(page, "open-filters");

  await clickByTestId(page, "open-filters");
  await expectVisibleByTestId(page, "filters-panel");
  await page.getByLabel("Cerrar panel").first().click();

  await clickByTestId(page, "view-mapa");
  await expectVisibleByTestId(page, "map-radius-slider");

  const firstPin = byTestIdPrefix(page, "map-pin-");
  if ((await firstPin.count()) > 0) {
    await firstPin.click();
  }

  await expect(byTestIdPrefix(page, "job-card-")).toBeVisible();
});

test("cliente j36: crear ticket de búsqueda", async ({ page }) => {
  await loginWithDemoAccess(page, "demo-client");
  await expect(page).toHaveURL(/\/cliente\/inicio/);

  await page.goto("/cliente/trabajos/j36");
  const cta = byTestId(page, "create-search-ticket");
  await expect(cta).toBeVisible();
  await cta.click();

  await expect(page.getByText("Ticket de búsqueda creado").first()).toBeVisible();
});

test("admin tickets búsqueda carga listado", async ({ page }) => {
  await loginWithDemoAccess(page, "demo-admin");
  await expect(page).toHaveURL(/\/admin/);

  await page.goto("/admin/tickets-busqueda");
  await expectVisibleByTestId(page, "admin-search-tickets");

  await expect(byTestIdPrefix(page, "search-ticket-")).toBeVisible();
});

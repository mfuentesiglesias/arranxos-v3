import { expect, test, type Page } from "@playwright/test";

function byTestId(page: Page, testId: string) {
  return page.getByTestId(testId).first();
}

async function expectVisibleByTestId(page: Page, testId: string) {
  await expect(byTestId(page, testId)).toBeVisible();
}

async function clickDemoButton(page: Page, testId: string) {
  await byTestId(page, testId).evaluate((element) => {
    (element as HTMLButtonElement).click();
  });
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

async function loginAsDemoProPending(page: Page) {
  await page.goto("/login");
  await expectVisibleByTestId(page, "demo-pro-pending");
  await clickDemoButton(page, "demo-pro-pending");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
});

test("QA Extended Mock — admin usuarios mock no muestra emails", async ({ page }) => {
  await loginAsDemoAdmin(page);
  await page.goto("/admin/usuarios");

  await expectVisibleByTestId(page, "admin-users-page");

  const adminUsersText = await byTestId(page, "admin-users-page").innerText();

  expect(adminUsersText).not.toContain("@gmail.com");
  expect(adminUsersText).not.toContain("@dersux.gal");
  expect(adminUsersText).not.toContain("antia.bouzas");
  expect(adminUsersText).not.toContain("manuel.garcia");
});

test("QA Extended Mock — branding cliente usa Profesional Dersux", async ({ page }) => {
  await loginAsDemoClient(page);
  await page.goto("/cliente/trabajos/j36");

  await expect(page.getByText("¿Necesitas ayuda para encontrar un profesional Dersux?").first()).toBeVisible();
  await expectVisibleByTestId(page, "create-search-ticket");
});

test("QA Extended Mock — pantalla aceptar cliente usa profesional Dersux", async ({ page }) => {
  await loginAsDemoClient(page);
  await page.goto("/cliente/trabajos/j30/aceptar");

  await expect(page.getByText("Aceptar profesional Dersux").first()).toBeVisible();
  await expect(page.getByText("Al aceptar, el profesional Dersux verá tu dirección exacta y se abrirá el chat.").first()).toBeVisible();
});

test("QA Extended Mock — profesional pendiente muestra Dersux Pro", async ({ page }) => {
  await loginAsDemoProPending(page);
  await page.goto("/profesional/pendiente");

  await expect(page.getByText("Estado Dersux Pro pendiente").first()).toBeVisible();
});

test("QA Extended Mock — perfil profesional público usa Profesional Dersux", async ({ page }) => {
  await page.goto("/profesional/perfil?id=p1");

  await expect(page.getByText("Perfil de profesional Dersux").first()).toBeVisible();
});

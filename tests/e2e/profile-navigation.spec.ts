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

async function loginClient(page: Page) {
  await page.evaluate(() => {
    window.localStorage.setItem(
      "arranxos-session",
      JSON.stringify({
        state: {
          role: "client",
          proStatus: "approved",
          currentClientId: "u1",
          currentProfessionalId: "p1",
          currentAdminId: "a1",
        },
        version: 0,
      }),
    );
  });
  await page.goto("/cliente/perfil");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
});

test("perfil cliente abre paneles demo en lugar de enlaces muertos", async ({ page }) => {
  await loginClient(page);

  await expect(page.locator('a[href="#"]')).toHaveCount(0);

  await expectVisibleByTestId(page, "client-profile-payment-methods");
  await clickByTestId(page, "client-profile-payment-methods");
  await expect(page.getByText("Métodos de pago").first()).toBeVisible();
  await expect(page.getByText("Pagos en la versión real").first()).toBeVisible();
  await page.getByRole("button", { name: "Cerrar" }).first().click();

  await expectVisibleByTestId(page, "client-profile-saved-addresses");
  await clickByTestId(page, "client-profile-saved-addresses");
  await expect(page.getByText("Direcciones guardadas").first()).toBeVisible();
  await expect(page.getByText("Direcciones guardadas", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Cerrar" }).first().click();

  await expectVisibleByTestId(page, "client-profile-help");
  await clickByTestId(page, "client-profile-help");
  await expect(page.getByText("Centro de ayuda").first()).toBeVisible();
  await expect(page.getByText("Ayuda demo").first()).toBeVisible();
});

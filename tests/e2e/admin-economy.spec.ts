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
  await clickByTestId(page, testId);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
});

test("admin economia carga y muestra estados económicos mock", async ({ page }) => {
  await loginWithDemoAccess(page, "demo-admin");
  await page.goto("/admin/economia");

  await expectVisibleByTestId(page, "admin-economy-page");
  await expectVisibleByTestId(page, "admin-economy-summary");
  await expectVisibleByTestId(page, "admin-economy-search");
  await expectVisibleByTestId(page, "admin-economy-disputes-link");
  await expectVisibleByTestId(page, "admin-economy-jobs-link");
  await expectVisibleByTestId(page, "admin-economy-row-j3");
  await expect(page.getByText("Pago protegido").first()).toBeVisible();
});

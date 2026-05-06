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

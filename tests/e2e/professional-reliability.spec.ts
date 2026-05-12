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

async function expectReliabilityScoreInRange(page: Page, testId: string) {
  const scoreText = (await byTestId(page, testId).textContent()) ?? "";
  const score = Number(scoreText.match(/\d+/)?.[0]);

  expect(Number.isFinite(score)).toBeTruthy();
  expect(score).toBeGreaterThanOrEqual(0);
  expect(score).toBeLessThanOrEqual(100);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
});

test("profesional ve score mock de fiabilidad en perfil privado y publico", async ({ page }) => {
  await loginWithDemoAccess(page, "demo-pro-approved");

  await page.goto("/profesional/mi-perfil");
  await expectVisibleByTestId(page, "professional-reliability-score");
  await expectVisibleByTestId(page, "professional-reliability-label");
  await expectVisibleByTestId(page, "professional-reliability-summary");
  await expectReliabilityScoreInRange(page, "professional-reliability-score");
  await expect(byTestId(page, "professional-reliability-label")).toContainText(
    /Alta|Media|Baja/,
  );
  await expect(byTestId(page, "professional-reliability-summary")).toContainText(/mock|demo/i);

  await page.goto("/profesional/perfil?id=p1");
  await expectVisibleByTestId(page, "public-professional-reliability-score");
  await expectVisibleByTestId(page, "public-professional-reliability-label");
  await expectReliabilityScoreInRange(page, "public-professional-reliability-score");
  await expect(byTestId(page, "public-professional-reliability-label")).toContainText(
    /Alta|Media|Baja/,
  );
});

test("admin ve score mock de fiabilidad en listado de profesionales", async ({ page }) => {
  await loginWithDemoAccess(page, "demo-admin");

  await page.goto("/admin/profesionales");
  await page.getByRole("button", { name: /Aprobados/i }).first().click();

  await expectVisibleByTestId(page, "admin-professional-reliability-score-p1");
  await expectVisibleByTestId(page, "admin-professional-reliability-label-p1");
  await expectReliabilityScoreInRange(page, "admin-professional-reliability-score-p1");
  await expect(byTestId(page, "admin-professional-reliability-label-p1")).toContainText(
    /Alta|Media|Baja/,
  );
});

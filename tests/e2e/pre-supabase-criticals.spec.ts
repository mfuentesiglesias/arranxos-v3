import { expect, test, type Page } from "@playwright/test";

async function setDemoSession(page: Page, preset: "admin" | "professional_approved") {
  await page.evaluate((recipientPreset) => {
    const raw = window.localStorage.getItem("arranxos-session");
    const parsed = raw ? JSON.parse(raw) : {};
    const persistedState =
      parsed?.state && typeof parsed.state === "object" ? parsed.state : {};

    window.localStorage.setItem(
      "arranxos-session",
      JSON.stringify({
        state: {
          ...persistedState,
          role: recipientPreset === "admin" ? "admin" : "professional",
          proStatus: recipientPreset === "admin" ? "approved" : "approved",
          currentClientId: "u1",
          currentProfessionalId: "p1",
          currentAdminId: "a1",
        },
        version: parsed?.version ?? 0,
      }),
    );
  }, preset);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
});

test("admin valoraciones aplica acciones demo", async ({ page }) => {
  await setDemoSession(page, "admin");
  await page.goto("/admin/valoraciones");

  const firstReviewCard = page.locator('[data-testid^="admin-review-card-"]').first();
  await expect(firstReviewCard).toBeVisible();

  await firstReviewCard.getByRole("button", { name: "Marcar revisada" }).click();
  await expect(firstReviewCard.getByText("Revisada (demo)")).toBeVisible();

  await firstReviewCard.getByRole("button", { name: "Ocultar reseña" }).click();
  await expect(firstReviewCard.getByText("Oculta demo", { exact: true })).toBeVisible();
  await expect(firstReviewCard.getByText("Acción demo local")).toBeVisible();
});

test("register abre paneles demo de términos y privacidad", async ({ page }) => {
  await page.goto("/register");

  await page.getByTestId("register-open-terms").first().click();
  await expect(page.getByTestId("register-legal-panel").first()).toBeVisible();
  await expect(page.getByText("Términos demo").first()).toBeVisible();
  await expect(page.getByText("no sustituye documentación legal definitiva").first()).toBeVisible();
  await page.getByTestId("register-legal-close").first().click();
  await expect(page.getByTestId("register-legal-panel")).toHaveCount(0);

  await page.getByTestId("register-open-privacy").first().click();
  await expect(page.getByTestId("register-legal-panel").first()).toBeVisible();
  await expect(page.getByText("Privacidad demo").first()).toBeVisible();
});

test("profesional pagos deja claro el estado mock", async ({ page }) => {
  await setDemoSession(page, "professional_approved");
  await page.goto("/profesional/pagos");

  await expect(page.getByText("En custodia mock").first()).toBeVisible();
  await expect(page.getByText("Cobros mock").first()).toBeVisible();
});

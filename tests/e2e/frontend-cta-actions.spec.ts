import { expect, test, type Page } from "@playwright/test";

async function setProfessionalBlockedSession(page: Page) {
  await page.evaluate(() => {
    const raw = window.localStorage.getItem("arranxos-session");
    const parsed = raw ? JSON.parse(raw) : {};
    const persistedState =
      parsed?.state && typeof parsed.state === "object" ? parsed.state : {};

    window.localStorage.setItem(
      "arranxos-session",
      JSON.stringify({
        state: {
          ...persistedState,
          role: "professional",
          proStatus: "blocked",
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

test("login muestra y cierra recuperación demo", async ({ page }) => {
  await page.goto("/login");
  await page.getByTestId("forgot-password-trigger").first().click();
  await expect(page.getByTestId("forgot-password-demo-panel").first()).toBeVisible();
  await expect(page.getByText("Recuperación demo").first()).toBeVisible();
  await expect(page.getByText("En esta demo no se envían emails reales.").first()).toBeVisible();

  await page.getByTestId("forgot-password-demo-close").first().click();
  await expect(page.getByTestId("forgot-password-demo-panel")).toHaveCount(0);
});

test("profesional bloqueado tiene contacto soporte funcional", async ({ page }) => {
  await setProfessionalBlockedSession(page);
  await page.goto("/profesional/bloqueado");

  const supportLink = page.getByTestId("blocked-support-contact").first();
  await expect(supportLink).toBeVisible();
  await expect(supportLink).toHaveAttribute("href", /mailto:soporte@arranxos\.gal/);
  await expect(page.getByText("No crea tickets reales en esta versión.").first()).toBeVisible();
});

test("perfil profesional permite ver todas las reseñas demo", async ({ page }) => {
  await page.goto("/profesional/perfil?id=p1");

  await page.getByTestId("public-profile-toggle-reviews").first().click();
  await expect(page.getByTestId("public-profile-all-reviews-note").first()).toBeVisible();
  await expect(page.getByText("Mostrando todas las reseñas demo.").first()).toBeVisible();
});

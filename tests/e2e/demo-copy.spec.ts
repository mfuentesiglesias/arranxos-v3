import { expect, test, type Page } from "@playwright/test";

async function setDemoSession(page: Page, role: "client" | "admin") {
  await page.evaluate((recipientRole) => {
    const raw = window.localStorage.getItem("arranxos-session");
    const parsed = raw ? JSON.parse(raw) : {};
    const persistedState =
      parsed?.state && typeof parsed.state === "object" ? parsed.state : {};

    window.localStorage.setItem(
      "arranxos-session",
      JSON.stringify({
        state: {
          ...persistedState,
          role: recipientRole,
          proStatus: "approved",
          currentClientId: "u1",
          currentProfessionalId: "p1",
          currentAdminId: "a1",
        },
        version: parsed?.version ?? 0,
      }),
    );
  }, role);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
});

test("welcome muestra aviso demo y evita claim de reseñas reales", async ({ page }) => {
  await page.goto("/welcome");

  await expect(page.getByText("Demo PWA · flujo simulado").first()).toBeVisible();
  await expect(page.getByText("Reseñas demo").first()).toBeVisible();
  await expect(page.getByText("Reseñas reales")).toHaveCount(0);
});

test("pagar trabajo deja claro que es simulación sin cobro real", async ({ page }) => {
  await setDemoSession(page, "client");
  await page.goto("/cliente/trabajos/j1/pagar");

  await expect(page.getByText("Demo · Simulación de pago protegido").first()).toBeVisible();
  await expect(page.getByText("no se procesa ningún cobro real").first()).toBeVisible();
});

test("disputa cliente matiza revisión como producción y no real en demo", async ({ page }) => {
  await setDemoSession(page, "client");
  await page.goto("/cliente/trabajos/j1/disputa");

  await expect(page.getByText("En producción habría revisión operativa en 48-72 h").first()).toBeVisible();
  await expect(page.getByText("no interviene ningún equipo real ni se mueve dinero real").first()).toBeVisible();
});

test("admin economia muestra aviso de panel demo", async ({ page }) => {
  await setDemoSession(page, "admin");
  await page.goto("/admin/economia");

  await expect(page.getByText("Panel económico demo: no hay Stripe, transferencias ni pagos reales.").first()).toBeVisible();
});

test("pendiente profesional no promete emails reales", async ({ page }) => {
  await page.goto("/profesional/pendiente");

  await expect(page.getByText("En esta demo no se envían emails ni se aprueban cuentas reales.").first()).toBeVisible();
});

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

async function setDemoSession(
  page: Page,
  testId: "demo-client" | "demo-pro-approved" | "demo-admin",
) {
  await page.evaluate((recipientTestId) => {
    const raw = window.localStorage.getItem("arranxos-session");
    const parsed = raw ? JSON.parse(raw) : {};
    const persistedState = parsed?.state && typeof parsed.state === "object" ? parsed.state : {};
    const role = recipientTestId === "demo-admin"
      ? "admin"
      : recipientTestId === "demo-client"
        ? "client"
        : "professional";

    window.localStorage.setItem(
      "arranxos-session",
      JSON.stringify({
        state: {
          ...persistedState,
          role,
          proStatus: recipientTestId === "demo-pro-approved" ? "approved" : "approved",
          currentClientId: "u1",
          currentProfessionalId: "p1",
          currentAdminId: "a1",
        },
        version: parsed?.version ?? 0,
      }),
    );
  }, testId);
}

async function loginWithDemoAccess(
  page: Page,
  testId: "demo-client" | "demo-pro-approved" | "demo-admin",
) {
  await setDemoSession(page, testId);
  await page.goto(
    testId === "demo-client"
      ? "/cliente/inicio"
      : testId === "demo-pro-approved"
        ? "/profesional/inicio"
        : "/admin",
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
});

test("admin chats muestra flags reales y aplicar strike persiste para profesional", async ({ page }) => {
  const jobTitle = "Trabajo demo moderacion chats";
  const requestMessage = "Puedo coger este trabajo esta misma semana.";
  const leakMessage = "Escribeme en 600123123 y lo vemos fuera.";

  await loginWithDemoAccess(page, "demo-client");
  await page.goto("/cliente/publicar");
  await expectVisibleByTestId(page, "client-publish-category-search");
  await byTestId(page, "client-publish-category-search").fill("Carpintería");
  await clickByTestId(page, "client-category-carpinteria-y-madera");
  await expectVisibleByTestId(page, "client-service-muebles-a-medida");
  await clickByTestId(page, "client-service-muebles-a-medida");
  await page.getByRole("button", { name: "Continuar" }).first().click();
  await page.getByPlaceholder("Ej. Reparar cuadro eléctrico en piso").first().fill(jobTitle);
  await page
    .getByPlaceholder("Describe qué necesitas. Cuanto más detalle, mejor.")
    .first()
    .fill("Necesito un trabajo para probar la moderación efectiva de chats.");
  await page.locator("select").nth(1).selectOption("100–300€");
  await page.getByRole("button", { name: "Revisar y publicar" }).first().click();
  await expectVisibleByTestId(page, "client-publish-review-summary");
  await page.getByRole("button", { name: "Publicar trabajo" }).first().click();
  await expect(page).toHaveURL(/\/cliente\/trabajos\/demo-job-/);
  const createdJobId = page.url().match(/demo-job-[^/?]+/)?.[0];
  expect(createdJobId).toBeTruthy();

  await loginWithDemoAccess(page, "demo-pro-approved");
  await page.goto(`/profesional/trabajos/${createdJobId}`);
  await page.getByRole("link", { name: "Solicitar este trabajo" }).first().click();
  await page
    .getByPlaceholder(
      "Preséntate brevemente y explica qué harás, qué incluye el precio y si necesitas más información.",
    )
    .first()
    .fill(requestMessage);
  await page.getByRole("button", { name: "Enviar solicitud" }).first().click();
  await expect(page.getByText("Solicitud enviada ✓").first()).toBeVisible();

  await loginWithDemoAccess(page, "demo-client");
  await page.goto(`/cliente/trabajos/${createdJobId}/solicitudes`);
  await page.getByRole("link", { name: "Aceptar" }).first().click();
  await page.getByRole("button", { name: "Aceptar solicitud" }).first().click();
  await expectVisibleByTestId(page, "client-job-status-in_progress");

  await loginWithDemoAccess(page, "demo-pro-approved");
  await page.goto(`/chat/${createdJobId}`);
  await page.getByPlaceholder("Escribe un mensaje…").first().fill(leakMessage);
  await clickByTestId(page, "chat-send-message");
  await expectVisibleByTestId(page, "chat-leak-blocked-message");

  await loginWithDemoAccess(page, "demo-admin");
  await page.goto("/admin/chats");
  await expectVisibleByTestId(page, "admin-chats-page");
  const moderationCard = page.locator('[data-testid^="admin-chat-flag-"]').filter({
    hasText: jobTitle,
  }).first();
  await expect(moderationCard).toBeVisible();
  await expect(moderationCard.getByText("Pendiente").first()).toBeVisible();
  await moderationCard.getByRole("button", { name: "Aplicar strike" }).first().click();
  await expect(moderationCard.getByText("Strike aplicado").first()).toBeVisible();

  await page.goto("/admin");
  await page.goto("/admin/chats");
  const persistedCard = page.locator('[data-testid^="admin-chat-flag-"]').filter({
    hasText: jobTitle,
  }).first();
  await expect(persistedCard.getByText("Strike aplicado").first()).toBeVisible();

  await page.goto("/admin/profesionales");
  await page.getByRole("button", { name: /Aprobados/i }).first().click();
  await expectVisibleByTestId(page, "admin-professional-card-p1");
  await expect(byTestId(page, "admin-professional-card-p1")).toContainText("1 strike");
});

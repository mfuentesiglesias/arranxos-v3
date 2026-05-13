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

  if (testId === "demo-admin") {
    await setAdminDemoSession(page);
    await page.goto("/admin");
    return;
  }

  await clickByTestId(page, testId);
  await expect(page).toHaveURL(getDemoTargetUrl(testId));
  await waitForDemoLanding(page, testId);
}

function getDemoTargetUrl(testId: string) {
  return testId === "demo-client"
    ? /\/cliente\/inicio/
    : testId === "demo-pro-pending"
      ? /\/profesional\/pendiente/
      : testId === "demo-pro-approved"
        ? /\/profesional\/inicio/
        : /\/admin/;
}

async function waitForDemoLanding(page: Page, testId: string) {
  if (testId === "demo-admin") {
    await page.waitForLoadState("load");
    return;
  }

  if (testId === "demo-pro-approved") {
    await expect(page.getByText("Trabajos cerca de ti").first()).toBeVisible();
    return;
  }

  if (testId === "demo-pro-pending") {
    await expect(page.getByText("Cuenta en revisión").first()).toBeVisible();
    return;
  }

  await expect(page.getByText("¿Qué necesitas hoy?").first()).toBeVisible();
}

async function setAdminDemoSession(page: Page) {
  await page.evaluate(() => {
    const raw = window.localStorage.getItem("arranxos-session");
    const parsed = raw ? JSON.parse(raw) : {};
    const persistedState = parsed?.state && typeof parsed.state === "object" ? parsed.state : {};

    window.localStorage.setItem(
      "arranxos-session",
      JSON.stringify({
        state: {
          ...persistedState,
          role: "admin",
          proStatus: "approved",
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

test("cliente abre disputa y admin la resuelve a favor del cliente", async ({ page }) => {
  const jobTitle = "Librería empotrada demo disputa";
  const requestMessage = "Puedo fabricar la librería y dejarla montada esta misma semana.";

  await loginWithDemoAccess(page, "demo-client");
  await page.goto("/cliente/publicar");
  await byTestId(page, "client-publish-category-search").fill("Carpintería");
  await clickByTestId(page, "client-category-carpinteria-y-madera");
  await expectVisibleByTestId(page, "client-service-muebles-a-medida");
  await clickByTestId(page, "client-service-muebles-a-medida");
  await page.getByRole("button", { name: "Continuar" }).first().click();
  await page.getByPlaceholder("Ej. Reparar cuadro eléctrico en piso").first().fill(jobTitle);
  await page
    .getByPlaceholder("Describe qué necesitas. Cuanto más detalle, mejor.")
    .first()
    .fill("Necesito una librería empotrada para el salón.");
  await page.locator("select").nth(1).selectOption("700–1.500€");
  await page.getByRole("button", { name: "Revisar y publicar" }).first().click();
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
  await page.goto(`/cliente/trabajos/${createdJobId}`);
  await expect(page.getByText(requestMessage).first()).toBeVisible();
  await page.goto(`/cliente/trabajos/${createdJobId}/solicitudes`);
  await page.getByRole("link", { name: "Aceptar" }).first().click();
  await page.getByRole("button", { name: "Aceptar solicitud" }).first().click();
  await expectVisibleByTestId(page, "client-job-status-in_progress");

  await loginWithDemoAccess(page, "demo-pro-approved");
  await page.goto(`/profesional/trabajos/${createdJobId}`);
  await byTestId(page, "pro-offer-amount").fill("980");
  await clickByTestId(page, "pro-send-offer");
  await expectVisibleByTestId(page, "pro-job-status-agreement_pending");

  await loginWithDemoAccess(page, "demo-client");
  await page.goto(`/cliente/trabajos/${createdJobId}`);
  await expectVisibleByTestId(page, "client-offer-panel");
  await clickByTestId(page, "client-accept-offer");
  await expectVisibleByTestId(page, "client-job-status-agreed");
  await expectVisibleByTestId(page, "client-pay-cta-card");
  await clickByTestId(page, "client-pay-protected");
  await expect(page).toHaveURL(new RegExp(`/cliente/trabajos/${createdJobId}/pagar`));
  await clickByTestId(page, "confirm-mock-payment");
  await expect(page).toHaveURL(new RegExp(`/cliente/trabajos/${createdJobId}`));
  await expectVisibleByTestId(page, "client-protected-payment-state");

  await loginWithDemoAccess(page, "demo-pro-approved");
  await page.goto(`/profesional/trabajos/${createdJobId}`);
  await expectVisibleByTestId(page, "pro-payment-protected-state");
  await clickByTestId(page, "pro-mark-completed-cta");
  await expect(page).toHaveURL(new RegExp(`/profesional/trabajos/${createdJobId}/finalizar`));
  await page.getByRole("button", { name: "Marcar terminado y avisar al cliente" }).first().click();
  await expect(page).toHaveURL(new RegExp(`/profesional/trabajos/${createdJobId}/seguimiento`));
  await expectVisibleByTestId(page, "pro-awaiting-client-confirmation");

  await loginWithDemoAccess(page, "demo-client");
  await page.goto(`/cliente/trabajos/${createdJobId}`);
  await expectVisibleByTestId(page, "client-confirm-completion-card");
  await clickByTestId(page, "client-open-dispute");
  await expect(page).toHaveURL(new RegExp(`/cliente/trabajos/${createdJobId}/disputa`));
  await byTestId(page, "dispute-reason-select").selectOption("Trabajo incompleto o mal hecho");
  await byTestId(page, "dispute-description").fill("El mueble quedó sin rematar en dos baldas y faltan acabados en los laterales.");
  await expect(byTestId(page, "submit-dispute")).toBeEnabled();
  await clickByTestId(page, "submit-dispute");
  await expect(page).toHaveURL(new RegExp(`/cliente/trabajos/${createdJobId}`));
  await expectVisibleByTestId(page, "client-dispute-open-state");

  await setAdminDemoSession(page);
  await page.goto("/admin/disputas");
  const adminDisputeCard = byTestId(page, `admin-dispute-${createdJobId}`);
  await expect(adminDisputeCard).toBeVisible();
  await adminDisputeCard.getByRole("button", { name: "A favor cliente" }).first().click();
  await expect(adminDisputeCard.getByText("trabajo cancelado en la demo").first()).toBeVisible();

  await loginWithDemoAccess(page, "demo-client");
  await page.goto(`/cliente/trabajos/${createdJobId}`);
  await expectVisibleByTestId(page, "client-dispute-resolved-client-state");

  await loginWithDemoAccess(page, "demo-pro-approved");
  await page.goto(`/profesional/trabajos/${createdJobId}`);
  await expect(page.getByText(jobTitle).first()).toBeVisible();
  await expectVisibleByTestId(page, "pro-dispute-cancelled-state");
});

test("profesional abre disputa y admin la resuelve a favor del profesional", async ({ page }) => {
  const jobTitle = "Puerta empotrada demo disputa pro";
  const requestMessage = "Puedo dejar la puerta ajustada y rematada esta misma semana.";

  await loginWithDemoAccess(page, "demo-client");
  await page.goto("/cliente/publicar");
  await byTestId(page, "client-publish-category-search").fill("Carpintería");
  await clickByTestId(page, "client-category-carpinteria-y-madera");
  await expectVisibleByTestId(page, "client-service-muebles-a-medida");
  await clickByTestId(page, "client-service-muebles-a-medida");
  await page.getByRole("button", { name: "Continuar" }).first().click();
  await page.getByPlaceholder("Ej. Reparar cuadro eléctrico en piso").first().fill(jobTitle);
  await page
    .getByPlaceholder("Describe qué necesitas. Cuanto más detalle, mejor.")
    .first()
    .fill("Necesito instalar una puerta empotrada en el dormitorio principal.");
  await page.locator("select").nth(1).selectOption("700–1.500€");
  await page.getByRole("button", { name: "Revisar y publicar" }).first().click();
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
  await page.goto(`/cliente/trabajos/${createdJobId}`);
  await expect(page.getByText(requestMessage).first()).toBeVisible();
  await page.goto(`/cliente/trabajos/${createdJobId}/solicitudes`);
  await page.getByRole("link", { name: "Aceptar" }).first().click();
  await page.getByRole("button", { name: "Aceptar solicitud" }).first().click();

  await loginWithDemoAccess(page, "demo-pro-approved");
  await page.goto(`/profesional/trabajos/${createdJobId}`);
  await byTestId(page, "pro-offer-amount").fill("980");
  await clickByTestId(page, "pro-send-offer");

  await loginWithDemoAccess(page, "demo-client");
  await page.goto(`/cliente/trabajos/${createdJobId}`);
  await clickByTestId(page, "client-accept-offer");
  await expectVisibleByTestId(page, "client-job-status-agreed");
  await clickByTestId(page, "client-pay-protected");
  await expect(page).toHaveURL(new RegExp(`/cliente/trabajos/${createdJobId}/pagar`));
  await clickByTestId(page, "confirm-mock-payment");
  await expect(page).toHaveURL(new RegExp(`/cliente/trabajos/${createdJobId}`));
  await expectVisibleByTestId(page, "client-protected-payment-state");

  await loginWithDemoAccess(page, "demo-pro-approved");
  await page.goto(`/profesional/trabajos/${createdJobId}`);
  await expectVisibleByTestId(page, "pro-payment-protected-state");
  await clickByTestId(page, "pro-mark-completed-cta");
  await expect(page).toHaveURL(new RegExp(`/profesional/trabajos/${createdJobId}/finalizar`));
  await page.getByRole("button", { name: "Marcar terminado y avisar al cliente" }).first().click();
  await expect(page).toHaveURL(new RegExp(`/profesional/trabajos/${createdJobId}/seguimiento`));
  await expectVisibleByTestId(page, "pro-awaiting-client-confirmation");
  await page.goto(`/profesional/trabajos/${createdJobId}`);
  await expectVisibleByTestId(page, "pro-completion-pending-state");
  await clickByTestId(page, "pro-open-dispute");
  await expect(page).toHaveURL(new RegExp(`/profesional/trabajos/${createdJobId}/disputa`));
  await byTestId(page, "pro-dispute-reason-select").selectOption("Cliente no responde tras terminar");
  await byTestId(page, "pro-dispute-description").fill("He terminado el trabajo y necesito que admin revise la incidencia porque el cliente no responde al cierre pactado.");
  await expect(byTestId(page, "pro-submit-dispute")).toBeEnabled();
  await clickByTestId(page, "pro-submit-dispute");
  await expect(page).toHaveURL(new RegExp(`/profesional/trabajos/${createdJobId}`));
  await expectVisibleByTestId(page, "pro-dispute-open-state");

  await page.goto(`/chat/${createdJobId}`);
  await expect(page.getByText(`trabajo ${createdJobId}`).first()).toBeVisible();

  await setAdminDemoSession(page);
  await page.goto("/admin/disputas");
  const adminDisputeCard = byTestId(page, `admin-dispute-${createdJobId}`);
  await expect(adminDisputeCard).toBeVisible();
  await expect(adminDisputeCard.getByText("abre por profesional").first()).toBeVisible();
  await adminDisputeCard.getByRole("button", { name: "A favor pro" }).first().click();
  await expect(adminDisputeCard.getByText("trabajo completado en la demo").first()).toBeVisible();

  await loginWithDemoAccess(page, "demo-client");
  await page.goto(`/cliente/trabajos/${createdJobId}`);
  await expectVisibleByTestId(page, "client-dispute-resolved-completed-state");

  await loginWithDemoAccess(page, "demo-pro-approved");
  await page.goto(`/profesional/trabajos/${createdJobId}`);
  await expectVisibleByTestId(page, "pro-dispute-resolved-completed-state");
});

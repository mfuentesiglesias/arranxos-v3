import { expect, test, type Page } from "@playwright/test";

function byTestId(page: Page, testId: string) {
  return page.getByTestId(testId).first();
}

function byTestIdPrefix(page: Page, prefix: string) {
  return page.locator(`[data-testid^="${prefix}"]`).first();
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

test("login demo accesos visibles y pro approved navega", async ({ page }) => {
  await page.goto("/login");

  await expectVisibleByTestId(page, "demo-client");
  await expectVisibleByTestId(page, "demo-pro-pending");
  await expectVisibleByTestId(page, "demo-pro-approved");
  await expectVisibleByTestId(page, "demo-admin");

  await clickByTestId(page, "demo-pro-approved");
  await expect(page).toHaveURL(/\/profesional\/inicio/);
});

test("oportunidades profesional: filtros, mapa, slider y pins", async ({ page }) => {
  await loginWithDemoAccess(page, "demo-pro-approved");
  await expect(page).toHaveURL(/\/profesional\/inicio/);

  await page.goto("/profesional/trabajos");

  await expectVisibleByTestId(page, "view-lista");
  await expectVisibleByTestId(page, "view-mapa");
  await expectVisibleByTestId(page, "open-filters");

  await clickByTestId(page, "open-filters");
  await expectVisibleByTestId(page, "filters-panel");
  await page.getByLabel("Cerrar panel").first().click();

  await clickByTestId(page, "view-mapa");
  await expectVisibleByTestId(page, "map-radius-slider");

  const firstPin = byTestIdPrefix(page, "map-pin-");
  if ((await firstPin.count()) > 0) {
    await firstPin.click();
  }

  await expect(byTestIdPrefix(page, "job-card-")).toBeVisible();
});

test("cliente j36: crear ticket de búsqueda", async ({ page }) => {
  await loginWithDemoAccess(page, "demo-client");
  await expect(page).toHaveURL(/\/cliente\/inicio/);

  await page.goto("/cliente/trabajos/j36");
  await expectVisibleByTestId(page, "create-search-ticket");
  await page.locator('[data-testid="create-search-ticket"]:visible').first().click();

  await expect(page.getByText("Ticket de búsqueda creado").first()).toBeVisible();
});

test("cliente publica trabajo y lo ve en detalle y listado", async ({ page }) => {
  const jobTitle = "Armario a medida demo entrada";
  const requestMessage = "Puedo fabricar este armario a medida y montarlo esta misma semana.";
  const offerAmount = "980";

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
    .fill("Necesito un armario a medida para la entrada de casa.");
  await page.locator("select").nth(1).selectOption("700–1.500€");
  await page.getByRole("button", { name: "Revisar y publicar" }).first().click();
  await expectVisibleByTestId(page, "client-publish-review-summary");
  await page.getByRole("button", { name: "Publicar trabajo" }).first().click();
  await expect(page).toHaveURL(/\/cliente\/trabajos\/demo-job-/);
  const createdJobUrl = page.url();
  const createdJobId = createdJobUrl.match(/demo-job-[^/?]+/)?.[0];
  expect(createdJobId).toBeTruthy();

  await page.goto("/cliente/trabajos");
  await expect(page.getByText(jobTitle).first()).toBeVisible();

  await loginWithDemoAccess(page, "demo-pro-approved");
  await page.goto("/profesional/trabajos");
  await expect(page.getByText(jobTitle).first()).toBeVisible();
  await page.goto(`/profesional/trabajos/${createdJobId}`);
  await expect(page.getByText(jobTitle).first()).toBeVisible();
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
  await expect(page.getByText("Profesional asignado").first()).toBeVisible();
  await expectVisibleByTestId(page, "client-job-status-in_progress");

  await loginWithDemoAccess(page, "demo-pro-approved");
  await page.goto(`/profesional/trabajos/${createdJobId}`);
  await byTestId(page, "pro-offer-amount").fill(offerAmount);
  await clickByTestId(page, "pro-send-offer");
  await expectVisibleByTestId(page, "pro-job-status-agreement_pending");

  await loginWithDemoAccess(page, "demo-client");
  await page.goto(`/cliente/trabajos/${createdJobId}`);
  await expectVisibleByTestId(page, "client-offer-panel");
  await clickByTestId(page, "client-accept-offer");
  await expectVisibleByTestId(page, "client-job-status-agreed");
  await expectVisibleByTestId(page, "agreement-summary-client");
  await expect(byTestId(page, "agreement-summary-client")).toContainText("980");
  await expectVisibleByTestId(page, "client-pay-cta-card");
  await clickByTestId(page, "client-pay-protected");
  await expect(page).toHaveURL(new RegExp(`/cliente/trabajos/${createdJobId}/pagar`));
  await expectVisibleByTestId(page, "mock-payment-summary");
  await clickByTestId(page, "confirm-mock-payment");
  await expect(page).toHaveURL(new RegExp(`/cliente/trabajos/${createdJobId}`));
  await expectVisibleByTestId(page, "client-protected-payment-state");

  await loginWithDemoAccess(page, "demo-pro-approved");
  await page.goto(`/profesional/trabajos/${createdJobId}`);
  await expectVisibleByTestId(page, "agreement-summary-pro");
  await expectVisibleByTestId(page, "pro-payment-protected-state");
  await clickByTestId(page, "pro-mark-completed-cta");
  await expect(page).toHaveURL(new RegExp(`/profesional/trabajos/${createdJobId}/finalizar`));
  await page.getByRole("button", { name: "Marcar terminado y avisar al cliente" }).first().click();
  await expect(page).toHaveURL(new RegExp(`/profesional/trabajos/${createdJobId}/seguimiento`));
  await expectVisibleByTestId(page, "pro-awaiting-client-confirmation");

  await loginWithDemoAccess(page, "demo-client");
  await page.goto(`/cliente/trabajos/${createdJobId}`);
  await expectVisibleByTestId(page, "client-confirm-completion-card");
  await clickByTestId(page, "client-confirm-completion");
  await expect(page).toHaveURL(new RegExp(`/cliente/trabajos/${createdJobId}/confirmar`));
  await page.getByRole("button", { name: "Confirmar y cerrar trabajo" }).first().click();
  await expect(page).toHaveURL(new RegExp(`/cliente/trabajos/${createdJobId}`));
  await expectVisibleByTestId(page, "client-job-completed-state");
  await expectVisibleByTestId(page, "client-review-cta-card");
  await clickByTestId(page, "client-review-cta");
  await expect(page).toHaveURL(new RegExp(`/cliente/trabajos/${createdJobId}/valorar`));
  await page.getByLabel("5 estrellas").first().click();
  await page.getByPlaceholder("Cuenta a otros clientes cómo fue tu experiencia con este profesional.").first().fill("Trabajo rematado con mucho cuidado y buena comunicación.");
  await clickByTestId(page, "submit-job-review");
  await expect(page).toHaveURL(new RegExp(`/cliente/trabajos/${createdJobId}`));
  await expectVisibleByTestId(page, "client-review-summary");

  await loginWithDemoAccess(page, "demo-pro-approved");
  await page.goto(`/profesional/trabajos/${createdJobId}`);
  await expectVisibleByTestId(page, "pro-job-completed-state");

  await loginWithDemoAccess(page, "demo-admin");
  await page.goto("/admin/valoraciones");
  await expect(page.getByText("Trabajo rematado con mucho cuidado y buena comunicación.").first()).toBeVisible();
});

test("admin tickets búsqueda carga listado", async ({ page }) => {
  await loginWithDemoAccess(page, "demo-admin");
  await expect(page).toHaveURL(/\/admin/);

  await page.goto("/admin/tickets-busqueda");
  await expectVisibleByTestId(page, "admin-search-tickets");

  await expect(byTestIdPrefix(page, "search-ticket-")).toBeVisible();
});

test("solicitud de catálogo: pro solicita, admin aprueba y pro la encuentra", async ({ page }) => {
  const specialtyName = "ebanista";
  const specialtySlug = "ebanista";
  const finalCatalogName = "Ebanistería artesanal a medida";
  const finalCatalogSlug = "ebanisteria-artesanal-a-medida";
  const categoryName = "Carpintería y madera";

  await loginWithDemoAccess(page, "demo-pro-approved");
  await page.goto("/profesional/mi-perfil");

  await clickByTestId(page, "profile-specialties");
  await expectVisibleByTestId(page, "profile-specialties-search");
  await byTestId(page, "profile-specialties-search").fill(specialtyName);
  await expectVisibleByTestId(page, "request-new-specialty");
  await clickByTestId(page, "request-new-specialty");
  await expectVisibleByTestId(page, "catalog-request-feedback");
  await expectVisibleByTestId(page, `catalog-request-${specialtySlug}`);

  await loginWithDemoAccess(page, "demo-admin");
  await page.goto("/admin/solicitudes-catalogo");
  await expectVisibleByTestId(page, "admin-catalog-requests");
  await expectVisibleByTestId(page, `admin-catalog-request-${specialtySlug}`);
  await byTestId(page, `catalog-request-final-name-${specialtySlug}`).fill(finalCatalogName);
  await byTestId(page, `catalog-request-category-search-${specialtySlug}`).fill("Carpintería");
  await clickByTestId(
    page,
    "catalog-request-category-result-carpinteria-y-madera",
  );
  await expectVisibleByTestId(page, `catalog-request-selected-category-${specialtySlug}`);
  await clickByTestId(page, `approve-catalog-request-${specialtySlug}`);
  await expect(byTestId(page, `catalog-request-status-${specialtySlug}`)).toContainText(
    "Aprobada",
  );

  await loginWithDemoAccess(page, "demo-pro-approved");
  await page.goto("/profesional/mi-perfil");
  await clickByTestId(page, "profile-specialties");
  await expectVisibleByTestId(page, "profile-specialties-search");
  await byTestId(page, "profile-specialties-search").fill(finalCatalogName);
  await expectVisibleByTestId(page, `profile-specialty-suggestion-${finalCatalogSlug}`);

  await loginWithDemoAccess(page, "demo-client");
  await page.goto("/cliente/publicar");
  await byTestId(page, "client-publish-category-search").fill("Carpintería");
  await expectVisibleByTestId(page, "client-category-carpinteria-y-madera");
  await clickByTestId(page, "client-category-carpinteria-y-madera");
  await expectVisibleByTestId(page, `client-service-${finalCatalogSlug}`);
  await clickByTestId(page, `client-service-${finalCatalogSlug}`);
  await page.getByRole("button", { name: "Continuar" }).first().click();
  await expect(page).toHaveURL(/\/cliente\/publicar\/detalle/);
  await page.getByPlaceholder("Ej. Reparar cuadro eléctrico en piso").first().fill("Mueble a medida en madera");
  await page
    .getByPlaceholder("Describe qué necesitas. Cuanto más detalle, mejor.")
    .first()
    .fill("Necesito valorar un trabajo de ebanistería para un armario empotrado.");
  await page.locator("select").nth(1).selectOption("100–300€");
  await page.getByRole("button", { name: "Revisar y publicar" }).first().click();
  await expectVisibleByTestId(page, "client-publish-review-summary");
  await expect(byTestId(page, "client-publish-review-summary")).toContainText(categoryName);
  await expect(byTestId(page, "client-publish-review-summary")).toContainText(finalCatalogName);
});

import { expect, test, type Page } from "@playwright/test";

import { requireSupabaseE2EEnv } from "./helpers/supabase-e2e-env";

async function expectNoGlobalError(page: Page) {
  await expect(page.locator("body")).not.toContainText("Application error");
  await expect(page.locator("body")).not.toContainText("Unhandled Runtime Error");
}

function getLoginEmailInput(page: Page) {
  return page
    .locator("div", {
      has: page.locator("label", { hasText: "Correo electrónico" }),
    })
    .locator('input[type="email"]')
    .or(page.locator('input[type="email"]'))
    .or(page.getByPlaceholder("tu@correo.com"))
    .first();
}

function getLoginPasswordInput(page: Page) {
  return page
    .locator("div", {
      has: page.locator("label", { hasText: "Contraseña" }),
    })
    .locator('input[type="password"]')
    .or(page.locator('input[type="password"]'))
    .or(page.getByPlaceholder("Tu contraseña"))
    .first();
}

async function loginWithRealCredentials(
  page: Page,
  email: string,
  password: string,
  expectedUrl: RegExp,
) {
  const emailInput = getLoginEmailInput(page);
  const passwordInput = getLoginPasswordInput(page);
  const submitButton = page.getByRole("button", { name: "Iniciar sesión" }).first();

  await page.goto("/login");
  await expect(emailInput).toBeVisible();
  await expect(passwordInput).toBeVisible();
  await expect(submitButton).toBeVisible();

  await emailInput.fill(email);
  await passwordInput.fill(password);
  await submitButton.click();

  await expect(page).toHaveURL(expectedUrl);
  await expectNoGlobalError(page);
}

test("Supabase smoke real — cliente y profesional pueden iniciar sesión y cargar vistas base", async ({
  browser,
  page,
}) => {
  const env = requireSupabaseE2EEnv();

  await loginWithRealCredentials(
    page,
    env.clientEmail,
    env.clientPassword,
    /\/cliente\/(inicio|trabajos)/,
  );

  await page.goto("/cliente/trabajos");
  await expect(page.getByText("Mis trabajos").first()).toBeVisible();
  await expectNoGlobalError(page);

  const professionalContext = await browser.newContext();

  try {
    const professionalPage = await professionalContext.newPage();

    await loginWithRealCredentials(
      professionalPage,
      env.professionalEmail,
      env.professionalPassword,
      /\/profesional\/(inicio|trabajos)/,
    );

    await professionalPage.goto("/profesional/trabajos");
    await expect(professionalPage.getByText("Oportunidades").first()).toBeVisible();
    await expectNoGlobalError(professionalPage);
  } finally {
    await professionalContext.close();
  }
});

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

async function setDemoSession(page: Page, preset: "admin" | "professional_approved") {
  await page.evaluate((rolePreset) => {
    const raw = window.localStorage.getItem("arranxos-session");
    const parsed = raw ? JSON.parse(raw) : {};
    const persistedState = parsed?.state && typeof parsed.state === "object" ? parsed.state : {};
    const professionalStatusOverrides =
      persistedState.professionalStatusOverrides &&
      typeof persistedState.professionalStatusOverrides === "object"
        ? persistedState.professionalStatusOverrides
        : {};
    const nextProfessionalStatus = professionalStatusOverrides.p1 ?? "approved";

    window.localStorage.setItem(
      "arranxos-session",
      JSON.stringify({
        state: {
          ...persistedState,
          role: rolePreset === "admin" ? "admin" : "professional",
          proStatus: rolePreset === "admin" ? "approved" : nextProfessionalStatus,
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

test("admin bloquea profesional y el cambio persiste y afecta al guard", async ({ page }) => {
  await setDemoSession(page, "admin");
  await page.goto("/admin/profesionales");
  await page.getByRole("button", { name: /Aprobados/i }).first().click();

  await expectVisibleByTestId(page, "admin-professional-card-p1");
  await expectVisibleByTestId(page, "admin-professional-status-p1");
  await expect(byTestId(page, "admin-professional-status-p1")).toContainText("Aprobado");

  await clickByTestId(page, "admin-professional-block-p1");
  await page.getByRole("button", { name: /Bloqueados/i }).first().click();
  await expect(byTestId(page, "admin-professional-status-p1")).toContainText("Bloqueado");

  await page.goto("/admin");
  await page.goto("/admin/profesionales");
  await page.getByRole("button", { name: /Bloqueados/i }).first().click();
  await expectVisibleByTestId(page, "admin-professional-card-p1");
  await expect(byTestId(page, "admin-professional-status-p1")).toContainText("Bloqueado");

  await setDemoSession(page, "professional_approved");
  await page.goto("/profesional/inicio");
  await expect(page).toHaveURL(/\/profesional\/bloqueado/);
  await expect(page.getByText("Cuenta bloqueada").first()).toBeVisible();
});

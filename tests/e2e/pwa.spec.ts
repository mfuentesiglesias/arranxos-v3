import { expect, test, type Page } from "@playwright/test";

function byTestId(page: Page, testId: string) {
  return page.getByTestId(testId).first();
}

async function expectVisibleByTestId(page: Page, testId: string) {
  await expect(byTestId(page, testId)).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
});

test("manifest y service worker responden", async ({ request }) => {
  const manifestResponse = await request.get("/manifest.json");
  expect(manifestResponse.ok()).toBeTruthy();

  const manifest = await manifestResponse.json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.start_url).toBe("/");
  expect(Array.isArray(manifest.icons)).toBeTruthy();
  expect(manifest.icons.some((icon: { src: string }) => icon.src === "/icons/icon-192.png")).toBeTruthy();
  expect(manifest.icons.some((icon: { src: string }) => icon.src === "/icons/icon-512.png")).toBeTruthy();

  const serviceWorkerResponse = await request.get("/sw.js");
  expect(serviceWorkerResponse.ok()).toBeTruthy();

  const serviceWorkerSource = await serviceWorkerResponse.text();
  expect(serviceWorkerSource).toContain('self.addEventListener("install"');
  expect(serviceWorkerSource).toContain('self.addEventListener("fetch"');

  const icon192Response = await request.get("/icons/icon-192.png");
  expect(icon192Response.ok()).toBeTruthy();

  const icon512Response = await request.get("/icons/icon-512.png");
  expect(icon512Response.ok()).toBeTruthy();

  const appleTouchIconResponse = await request.get("/icons/apple-touch-icon.png");
  expect(appleTouchIconResponse.ok()).toBeTruthy();
});

test("login muestra reset demo y permite limpiar sesion mock", async ({ page }) => {
  await page.goto("/login");
  await expectVisibleByTestId(page, "demo-reset-button");

  await page.evaluate(() => {
    window.localStorage.setItem(
      "arranxos-session",
      JSON.stringify({
        state: {
          role: "professional",
          proStatus: "approved",
          currentClientId: "u1",
          currentProfessionalId: "p1",
          currentAdminId: "a1",
        },
        version: 0,
      }),
    );
  });
  await page.goto("/profesional/inicio");
  await expect(page).toHaveURL(/\/profesional\/inicio/);

  await page.goto("/login");
  await page.getByTestId("demo-reset-button").first().click();
  await expectVisibleByTestId(page, "demo-reset-confirm");
  await page.getByTestId("demo-reset-confirm").first().click();

  await expect(page).toHaveURL(/\/welcome/);

  const persistedKeys = await page.evaluate(() =>
    Object.keys(window.localStorage).filter((key) => key.startsWith("arranxos-")),
  );
  expect(persistedKeys).toHaveLength(0);
});

import { expect, test } from "@playwright/test";

async function readCommissionValue(page: import("@playwright/test").Page) {
  const text = (await page.getByTestId("admin-dashboard-kpi-commission").first().textContent()) ?? "";
  const rawAmount = text.match(/(\d[\d\s.]*(?:[.,]\d+)?)\s*€/u)?.[1] ?? "0";
  const normalized = rawAmount
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
});

test("dashboard admin calcula la comisión desde agreement/finalPrice", async ({ page }) => {
  await page.evaluate(() => {
    window.localStorage.setItem(
      "arranxos-session",
      JSON.stringify({
        state: {
          role: "admin",
          proStatus: "approved",
          currentClientId: "u1",
          currentProfessionalId: "p1",
          currentAdminId: "a1",
        },
        version: 0,
      }),
    );
  });
  await page.goto("/admin");
  const baselineCommission = await readCommissionValue(page);

  await page.evaluate(() => {
    window.localStorage.setItem(
      "arranxos-session",
      JSON.stringify({
        state: {
          role: "admin",
          proStatus: "approved",
          currentClientId: "u1",
          currentProfessionalId: "p1",
          currentAdminId: "a1",
          adminConfig: {
            commissionPct: 10,
            autoReleaseDays: 5,
            invitationLimitPerJob: 10,
            searchTicketNoResponseDays: 5,
            strikeAutoBlockThreshold: 3,
            antiLeakEnabled: true,
            antiLeakRules: {
              phones: true,
              emails: true,
              urls: true,
              whatsapp: true,
            },
          },
          createdJobs: [
            {
              id: "demo-job-dashboard-commission",
              title: "Trabajo demo comisión dashboard",
              categoryId: "carpinteria-y-madera",
              category: "Carpintería",
              service: "Muebles a medida",
              location: "Vigo",
              locationApprox: "Vigo (aprox.)",
              lat: 42.23,
              lng: -8.72,
              status: "agreed",
              priceMin: 0,
              priceMax: 3000,
              requests: 1,
              posted: "ahora",
              postedAt: new Date().toISOString(),
              clientId: "u1",
              clientName: "Antía Bouzas",
              clientAvatar: "AB",
              clientRating: 4.9,
              description: "Trabajo de prueba para la comisión del dashboard.",
              assignedProId: "p1",
              finalPrice: 1000,
              commissionPct: 10,
            },
          ],
          agreements: {
            "demo-job-dashboard-commission": {
              jobId: "demo-job-dashboard-commission",
              finalPrice: 1000,
              commissionPct: 10,
              createdAt: new Date().toISOString(),
              acceptedByClient: true,
              acceptedByPro: true,
              paymentStatus: "pending",
            },
          },
        },
        version: 0,
      }),
    );
  });

  await page.reload();
  await expect(page).toHaveURL(/\/admin/);
  await expect(page.getByText("Panel de control").first()).toBeVisible();
  await expect(page.getByTestId("admin-dashboard-kpi-commission").first()).toContainText(
    "Comisión generada mock",
  );
  await expect
    .poll(
      async () => {
        const nextCommission = await readCommissionValue(page);
        return nextCommission - baselineCommission;
      },
      { timeout: 5000 },
    )
    .toBe(100);
});

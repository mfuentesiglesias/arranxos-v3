import { defineConfig, devices } from "@playwright/test";

import { requireSupabasePublicE2EEnv } from "./tests/e2e/helpers/supabase-e2e-env";

const { supabaseUrl, supabaseAnonKey } = requireSupabasePublicE2EEnv();

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: ["**/supabase-*.spec.ts"],
  timeout: 60_000,
  workers: 1,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Pixel 5"],
        browserName: "chromium",
      },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      NEXT_PUBLIC_DATA_MODE: "supabase",
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey,
    },
  },
});

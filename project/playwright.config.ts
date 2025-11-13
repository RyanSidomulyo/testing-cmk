import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./project/tests",
  timeout: 60000,
  retries: 0,
  use: {
    headless: true,
    viewport: { width: 1280, height: 800 },
    baseURL: "https://staging-dms.intra.cmk.co.id",
    screenshot: "only-on-failure",
    video: "off",

    permissions: ["clipboard-read", "clipboard-write"],

    launchOptions: {
      args: [
        "--enable-features=ClipboardReadWrite",
        "--disable-blink-features=AutomationControlled",
        "--unsafely-treat-insecure-origin-as-secure=https://staging-dms.intra.cmk.co.id",
        "--disable-features=IsolateOrigins,site-per-process",
        "--no-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
      ],
    },
  },

  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});

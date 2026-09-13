import { defineConfig, devices } from '@playwright/test';

const port = 3100;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } }],
  webServer: {
    // next.config.ts uses output: 'standalone'. Start the generated server
    // directly so local and CI smoke tests exercise the same production shape.
    command: `PORT=${port} HOSTNAME=127.0.0.1 node scripts/start-standalone.mjs`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});

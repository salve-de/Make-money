import { resolve } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

// 3100番が他で使われている手元では E2E_PORT=3110 のように変える（自動テストは既定の3100番）
const port = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://127.0.0.1:${port}`;
// The standalone server runs from .next/standalone; point the media routes at the repository's staging
// ledger (data/media-staging, gitignored) so that images approved with scripts/media/review-assets.ts show up.
// Without that directory nothing is shown and e2e/media-gallery.spec.ts skips itself.
const mediaStagingDir = resolve(process.cwd(), 'data/media-staging');

// 公開目録の成果物（pnpm catalog:prepare -- --artifacts-only が書く）。standalone の cwd は別なので絶対パスで渡す
const catalogReleaseDir = resolve(process.cwd(), '.catalog-release');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  reporter: [['list'], ['./verification/ci-reporter.ts'], ['html', { open: 'never' }]],
  use: { baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } }],
  webServer: {
    command: `PORT=${port} HOSTNAME=127.0.0.1 CATALOG_RELEASE_DIR="${catalogReleaseDir}" MEDIA_SOURCE=local_staging MEDIA_STAGING_DIR="${mediaStagingDir}" node scripts/start-standalone.mjs`,
    url: baseURL, reuseExistingServer: false, timeout: 60000,
  },
});

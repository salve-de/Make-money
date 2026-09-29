import { resolve } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const port = 3100;
const baseURL = `http://127.0.0.1:${port}`;
// The standalone server runs from .next/standalone; point the media routes at the repository's staging
// ledger (data/media-staging, gitignored) so that images approved with scripts/media/review-assets.ts show up.
// Without that directory nothing is shown and e2e/media-gallery.spec.ts skips itself.
const mediaStagingDir = resolve(process.cwd(), 'data/media-staging');

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
    command: `PORT=${port} HOSTNAME=127.0.0.1 MEDIA_SOURCE=local_staging MEDIA_STAGING_DIR="${mediaStagingDir}" node scripts/start-standalone.mjs`,
    url: baseURL, reuseExistingServer: false, timeout: 60000,
  },
});

import { defineConfig } from '@playwright/test';
import path from 'node:path';

const artifacts = process.env.VISUAL_ARTIFACT_DIR;
if (!artifacts || !process.env.VISUAL_TARGET_URL) throw new Error('Use scripts/verify-refactor-ui.ts with explicit BASE and HEAD URLs');
export default defineConfig({
  testDir: '.',
  testMatch: 'refactor.spec.ts',
  forbidOnly: true,
  retries: 0,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 15000, toHaveScreenshot: { maxDiffPixels: 0, threshold: 0, animations: 'disabled', caret: 'hide' } },
  snapshotPathTemplate: path.join(artifacts, 'baseline', '{projectName}', '{testFilePath}', '{arg}{ext}'),
  outputDir: path.join(artifacts, process.env.VISUAL_PHASE || 'unknown', 'results'),
  reporter: [['list'], ['json', { outputFile: path.join(artifacts, `${process.env.VISUAL_PHASE}.json`) }]],
  use: {
    baseURL: process.env.VISUAL_TARGET_URL,
    locale: 'ja-JP', timezoneId: 'Asia/Tokyo', colorScheme: 'dark', reducedMotion: 'reduce',
    serviceWorkers: 'block', trace: 'retain-on-failure', screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { browserName: 'chromium', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 } },
    { name: 'mobile', use: { browserName: 'chromium', viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true } },
  ],
});

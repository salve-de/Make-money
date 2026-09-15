import type { Page, TestInfo } from '@playwright/test';

const failures = new WeakMap<Page, string[]>();
export function recordRuntimeErrors(page: Page): void {
  const errors: string[] = [];
  failures.set(page, errors);
  page.on('pageerror', (error) => {
    errors.push(error.stack || error.message);
    console.log('VISUAL_RUNTIME_ERROR', process.env.VISUAL_PHASE, error.stack || error.message);
  });
  page.on('console', (message) => {
    if (message.type() === 'error') console.log('VISUAL_CONSOLE_ERROR', process.env.VISUAL_PHASE, message.text(), JSON.stringify(message.location()));
  });
}

export async function reportRuntimeFailure(page: Page, info: TestInfo): Promise<void> {
  if (info.status === info.expectedStatus) return;
  console.log('VISUAL_FAILURE_PAGE', process.env.VISUAL_PHASE, page.url(), JSON.stringify(await page.locator('h1,h2,h3').allTextContents()));
  for (const error of failures.get(page) || []) {
    const match = error.match(/(http:\/\/127\.0\.0\.1:\d+\/[^\s)]+\.js):(\d+):(\d+)/);
    if (!match || new URL(match[1]).origin !== new URL(page.url()).origin) continue;
    const response = await page.request.get(match[1]);
    const line = (await response.text()).split('\n')[Number(match[2]) - 1] || '';
    const column = Number(match[3]) - 1;
    console.log('VISUAL_FAILING_EXPRESSION', line.slice(Math.max(0, column - 600), column + 600));
  }
}

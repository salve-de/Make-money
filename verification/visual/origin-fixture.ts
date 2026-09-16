import type { Page } from '@playwright/test';

/** Both revisions see one browser origin; all bytes still come from local isolated servers. */
export const visualOrigin = 'https://makemoney-app.pages.dev';

export function localVisualUrl(requestUrl: string): string {
  const local = process.env.VISUAL_TARGET_URL;
  if (!local || !['localhost', '127.0.0.1', '[::1]'].includes(new URL(local).hostname)) {
    throw new Error('An explicit loopback visual backend is required');
  }
  const requested = new URL(requestUrl);
  if (requested.origin !== visualOrigin) throw new Error('Unexpected external visual request');
  return new URL(requested.pathname + requested.search, local).toString();
}

export async function installOriginFixture(page: Page): Promise<void> {
  await page.route('**/*', async (route) => {
    const requested = new URL(route.request().url());
    if (requested.origin !== visualOrigin) { await route.abort('blockedbyclient'); return; }
    const response = await route.fetch({ url: localVisualUrl(requested.toString()), maxRedirects: 0 });
    await route.fulfill({ response });
  });
  await page.addInitScript(() => localStorage.setItem('makemoney_partner_id', 'p_pr20test'));
}

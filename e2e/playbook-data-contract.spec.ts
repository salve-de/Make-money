import { expect, test } from '@playwright/test';

test('server-provided category data survives hydration and every tool category remains usable', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.stack || error.message));
  try {
    const response = await page.goto('/playbook', { waitUntil: 'networkidle' });
    expect(response?.ok()).toBe(true);
    await expect(page.getByRole('heading', { name: 'ツール構成と乗り換えの参考例', exact: true })).toBeVisible();
    for (const category of ['AI・推論エンジン', 'データベース・基盤', '決済・サブスク課金', '集客・CRM・配信', 'フロント・ノーコード', 'デプロイ・ホスティング']) {
      await page.getByRole('button', { name: new RegExp(category) }).click();
      await expect(page.getByRole('heading', { name: new RegExp(`${category} における採用シェア推移`) })).toBeVisible();
    }
    expect(errors).toEqual([]);
  } finally {
    if (errors.length) {
      console.log('PLAYBOOK_RUNTIME_STACKS', JSON.stringify(errors));
      await info.attach('playbook-runtime-errors', { body: errors.join('\n'), contentType: 'text/plain' });
      // Print only the immediate failing expression from same-origin bundles.
      // This makes a production-only regression diagnosable without changing the app.
      for (const error of errors) {
        const match = error.match(/(http:\/\/127\.0\.0\.1:3100\/[^\s)]+\.js):(\d+):(\d+)/);
        if (!match) continue;
        const source = await (await page.request.get(match[1])).text();
        const line = source.split('\n')[Number(match[2]) - 1] || '';
        const column = Number(match[3]) - 1;
        console.log('PLAYBOOK_FAILING_EXPRESSION', line.slice(Math.max(0, column - 500), column + 500));
      }
    }
  }
});

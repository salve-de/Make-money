import { chromium } from '@playwright/test';
import path from 'path';

const artifactsDir = '/Users/satoushinya/.gemini/antigravity/brain/4c5c2e06-e0e2-4558-a4ac-e6a0de483b87';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();

  const targets = [
    { id: 'ent_keyence', name: 'keyence' },
    { id: 'ent_photoai', name: 'photo_ai' },
    { id: 'ent_ebizfacts_kevinhardin3dprintedebikepart550month_83a1a437ae33', name: 'kevin_hardin' },
    { id: 'ent_ebizfacts_thomashammondretailarbitrage40kmonthamazon_710304c85d0e', name: 'thomas_hammond' },
    { id: 'ent_wework_A7K2P9QX', name: 'wework_postmortem' }
  ];

  for (const t of targets) {
    console.log(`Navigating to ${t.name} (${t.id})...`);
    await page.goto(`http://localhost:3000/?entity=${t.id}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const fullPath = path.join(artifactsDir, `deep_cured_${t.name}_full.png`);
    await page.screenshot({ path: fullPath, fullPage: true });
    console.log(`Saved screenshot: ${fullPath}`);
  }

  await browser.close();
  console.log('All screenshots captured successfully.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

import { chromium } from '@playwright/test';
import path from 'path';

const TARGETS = [
  { id: 'ent_ebizfacts_stevehanovmultiplesaas10kmonthcheapstack_5425bcdb3286', query: 'Steve Hanov', label: 'ebiz_steve_hanov' },
  { id: 'ent_ebizfacts_erikaronestyonwardtravel10kmonthexpireddomai_25841c10b27a', query: 'Erik Aronesty', label: 'ebiz_erik_aronesty' },
  { id: 'ent_blueoceanconsultancy_789697beafdf', query: 'Blue Ocean Consultancy', label: 'solo_t_blue_ocean' },
  { id: 'ent_paralives_351f0ab95085', query: 'paralives', label: 'solo_w_paralives' },
  { id: 'ent_zededit_8b129f10', query: 'Zed Editor', label: 'clean_zed_editor' },
  { id: 'ent_deepl_be6b54', query: 'DeepL', label: 'analyst_deepl' },
  { id: 'ent_submagic_c66b29', query: 'Submagic', label: 'golden_submagic' }
];

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1550, height: 1000 } });
  const page = await context.newPage();
  const artifactDir = '/Users/satoushinya/.gemini/antigravity/brain/4c5c2e06-e0e2-4558-a4ac-e6a0de483b87';

  console.log('Navigating to base page...');
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  for (const t of TARGETS) {
    console.log(`Auditing target: ${t.query} (${t.label}, id: ${t.id})...`);
    const url = `http://localhost:3000/?entity=${encodeURIComponent(t.id)}`;
    
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(1500); // 描画安定待ち

      // 1. 全体画面キャプチャ
      const fullPath = path.join(artifactDir, `verified_full_${t.label}.png`);
      await page.screenshot({ path: fullPath });
      console.log(`Saved full view: ${fullPath}`);

      // 2. 右側インスペクターキャプチャ
      const inspector = page.locator('aside').last();
      if (await inspector.isVisible()) {
        const inspectorPath = path.join(artifactDir, `verified_inspector_${t.label}.png`);
        await inspector.screenshot({ path: inspectorPath });
        console.log(`Saved inspector view: ${inspectorPath}`);
      } else {
        console.warn(`WARNING: Inspector not visible for ${t.query} (${t.id})`);
      }
    } catch (err) {
      console.error(`ERROR auditing ${t.query}:`, err.message);
    }
  }

  await browser.close();
  console.log('Finished capturing all inspector screenshots!');
}

run();

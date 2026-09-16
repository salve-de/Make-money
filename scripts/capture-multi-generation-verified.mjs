// scripts/capture-multi-generation-verified.mjs
import { chromium } from '@playwright/test';
import path from 'path';

const TARGET_ENTITIES = [
  // 1. eBizFacts
  { id: 'ent_ebizfacts_erikaronestyonwardtravel10kmonthexpireddomai_25841c10b27a', name: 'Erik Aronesty (eBiz)' },
  { id: 'ent_ebizfacts_stevehanovmultiplesaas10kmonthcheapstack_5425bcdb3286', name: 'Steve Hanov (Primary/eBiz)' },
  { id: 'ent_ebizfacts_sarahmichelleboesnurseexamcourse1million7mon_de330c845230', name: 'Sarah Michelle Boes (eBiz)' },

  // 2. 新着ソロ T〜W
  { id: 'ent_blueoceanconsultancy_789697beafdf', name: 'Blue Ocean Consultancy (新着ソロ T)' },
  { id: 'ent_howeverai_ca663efd16ad', name: 'However Ai (新着ソロ U)' },
  { id: 'ent_snapcontract_5ae8e9064c18', name: 'Snapcontract (新着ソロ V)' },
  { id: 'ent_paralives_351f0ab95085', name: 'paralives (新着ソロ W)' },

  // 3. クリーン勝者 & アナリスト特選 & ソロ勝者特選
  { id: 'ent_zededit_8b129f10', name: 'Zed Editor (クリーン勝者)' },
  { id: 'ent_deepl_be6b54', name: 'DeepL (アナリスト特選)' },
  { id: 'ent_scrapingdog_4a1b8c', name: 'Scrapingdog (ソロ勝者特選)' },

  // 4. ゴールデンスタンダード（第4期・第6期）
  { id: 'ent_submagic_c66b29', name: 'Submagic (第4期)' },
  { id: 'ent_boltai_8d72e9', name: 'BoltAI (第6期)' }
];

async function run() {
  console.log('[Capture] Launching Playwright Chromium...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await context.newPage();

  const artifactDir = '/Users/satoushinya/.gemini/antigravity/brain/4c5c2e06-e0e2-4558-a4ac-e6a0de483b87';

  for (const item of TARGET_ENTITIES) {
    console.log(`[Capture] Navigating to ${item.name} (${item.id})...`);
    const url = `http://localhost:3000/?entity=${encodeURIComponent(item.id)}`;
    
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(1000); // レンダリング安定待ち

      const filename = `verified_gen_${item.id.replace(/[^a-zA-Z0-9_]/g, '')}.png`;
      const screenshotPath = path.join(artifactDir, filename);

      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`[Capture] Saved screenshot: ${screenshotPath}`);
    } catch (err) {
      console.error(`[Capture] Error capturing ${item.name}:`, err.message);
    }
  }

  await browser.close();
  console.log('[Capture] All generations captured successfully!');
}

run();

import { test, expect } from '@playwright/test';

test('verify plain Japanese UI and lack of Savannah OS jargon across diverse entities', async ({ page }) => {
  // 1. トップ画面撮影
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'scratch/ui_plain_top.png' });

  // 2. 「収集事例」クイックフィルター（存在する場合のみ検証）
  const triageBtn = page.locator('button:has-text("収集事例")').first();
  if (await triageBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await triageBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'scratch/ui_plain_triage_filtered.png' });
  }


  // 監査対象の代表10社（物理店舗、SaaS、製造業、D2C、失敗企業、受託IT等）
  const testEntities = [
    { id: 'ent_lopia_9c', name: 'ロピア', isHazard: false, labelToCheck: '儲けのウラ側' },
    { id: 'ent_pdf_ai_65', name: 'PDF.ai', isHazard: false, labelToCheck: '儲けのウラ側' },
    { id: 'ent_disco_6146_jp', name: '株式会社ディスコ', isHazard: false, labelToCheck: '儲けのウラ側' },
    { id: 'ent_shift_3697', name: '株式会社SHIFT', isHazard: false, labelToCheck: '儲けのウラ側' },
    { id: 'ent_keyence', name: 'キーエンス (KEYENCE)', isHazard: false, labelToCheck: '儲けのウラ側' },
    { id: 'ent_case06_51de613ea122941bf718', name: 'Bombas', isHazard: false, labelToCheck: '儲けのウラ側' },
    { id: 'ent_theranos_postmortem_dead', name: 'Theranos', isHazard: true, labelToCheck: '失敗・撤退の事実ログ' },
    { id: 'ent_wework_landmine', name: 'WeWork Inc.', isHazard: true, labelToCheck: '失敗・撤退の事実ログ' },
    { id: 'ent_plausible', name: 'Plausible Analytics', isHazard: false, labelToCheck: '儲けのウラ側' },
    { id: 'ent_typingmind_3a81f902', name: 'TypingMind', isHazard: false, labelToCheck: '儲けのウラ側' },
  ];

  for (const ent of testEntities) {
    console.log(`Auditing UI for ${ent.name} (${ent.id})...`);
    await page.goto(`http://localhost:3000/?entity=${ent.id}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      (name) => document.body.innerText.includes(name),
      ent.name,
      { timeout: 10000 }
    );
    await page.waitForTimeout(800);

    const safeName = ent.name.replace(/[^a-zA-Z0-9\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf]/g, '_');
    await page.screenshot({ path: `scratch/audit_${safeName}.png` });

    const bodyText = await page.innerText('body');

    // 1. 禁止造語の完全不在検証
    expect(bodyText).not.toContain('サバンナOS');
    expect(bodyText).not.toContain('サバンナ OS');
    expect(bodyText).not.toContain('略奪転用方程式');
    expect(bodyText).not.toContain('身も蓋もない真実');
    expect(bodyText).not.toContain('カニバリズム障壁');
    expect(bodyText).not.toContain('特異物証');
    expect(bodyText).not.toContain('地雷検死');
    expect(bodyText).not.toContain('検死開示');
    expect(bodyText).not.toContain('裏帳簿');
    expect(bodyText).not.toContain('ホスティング関所');
    expect(bodyText).not.toContain('決済関所');

    // 2. 必須セクションラベルの存在検証
    expect(bodyText).toContain(ent.labelToCheck);

    // 3. #01 事業の正体 / 事業の罠（essence）が必ず描画されていること
    if (ent.isHazard) {
      expect(bodyText).toContain('事業の罠・錯覚の前提');
      expect(bodyText).toContain('錯覚した事業');
      expect(bodyText).toContain('見誤った顧客');
      expect(bodyText).toContain('消滅した需要');
    } else {
      expect(bodyText).toContain('この会社は何屋か（ビジネスの正体）');
      expect(bodyText).toContain('要するに何屋か');
      expect(bodyText).toContain('誰からお金をもらっているか');
      expect(bodyText).toContain('どんな悩みを解決しているか');
    }

    // 4. #02, #03 セクションの存在検証
    expect(bodyText).toContain('#02');
    expect(bodyText).toContain('#03');

    // 5. 証拠ファイルカードが存在すること（最低2件以上）
    const cards = page.locator('#section-evidence article');
    const cardCount = await cards.count();
    console.log(`Entity ${ent.name} has ${cardCount} evidence cards displayed.`);
    expect(cardCount).toBeGreaterThanOrEqual(2);

    // 6. #13 事実ログストリームの存在検証
    expect(bodyText).toContain('#13');
  }
});


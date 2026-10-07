import { describe, expect, it } from 'vitest';

import { screenText, cleanDisplayText, listRevenueText, reportedAnnualReport, formatDisplayDate, formatSourceNote, stripSourceParenthetical, entityIdentityLine, estimationLogicLabel, isResearchTimelineEvent, originTypeLabel, sourceKindLabel, timelineEventLabel, toolCategoryLabel, withYenApprox, yenText } from './display-text';

describe('formatSourceNote', () => {
  it('removes rights and facts-only, keeps URL and date', () => {
    expect(formatSourceNote('eBiz Facts https://e.com/a / 2026-09-29 取得 / rights: Tier 2 facts-only'))
      .toBe('eBiz Facts https://e.com/a / 2026-09-29 取得');
  });
  it('keeps Japanese remarks after the rights marker', () => {
    expect(formatSourceNote('eBiz Facts https://e.com/a / 2026-09-29 取得 / rights: Tier 2 facts-only（本文は要約のみ）'))
      .toBe('eBiz Facts https://e.com/a / 2026-09-29 取得 / （本文は要約のみ）');
  });
  it('translates known source kinds and drops unknown snake_case', () => {
    expect(formatSourceNote('Indie Hackers https://x.com / community_revenue_page / rights: Tier 2 facts-only'))
      .toBe('Indie Hackers https://x.com / Indie Hackers の収益ページ');
    expect(formatSourceNote('A https://x.com / some_unknown_kind / rights: Tier 1')).toBe('A https://x.com');
  });
  it('rewrites community listing and keeps Japanese segments', () => {
    expect(formatSourceNote('Indie Hackers https://x.com / community listing / rights: Tier 2 facts-only'))
      .toBe('Indie Hackers https://x.com / コミュニティの掲載ページ');
    expect(formatSourceNote('eBiz Facts https://x.com / 本人申告の二次要約 / rights: Tier 2 facts-only'))
      .toBe('eBiz Facts https://x.com / 本人申告の二次要約');
  });
  it('handles the observation-style note with tier tokens', () => {
    expect(formatSourceNote('2026-09-29 観測 / 2021-08-10 時点 / TIER2_FACTS_ONLY / https://x.com'))
      .toBe('2026-09-29 観測 / 2021-08-10 時点 / https://x.com');
    expect(formatSourceNote('2026-09-29 観測 / TIER1_OFFICIAL / https://x.com'))
      .toBe('2026-09-29 観測 / 公式情報 / https://x.com');
  });
  it('is empty for empty input', () => {
    expect(formatSourceNote(undefined)).toBe('');
    expect(formatSourceNote('rights: Tier 1')).toBe('');
  });
});

describe('cleanDisplayText', () => {
  it('cleans a provenance parenthesis inside prose', () => {
    expect(cleanDisplayText('本人申告。（2026-09-29 観測 / 2021-08-10 時点 / TIER2_FACTS_ONLY / https://x.com）'))
      .toBe('本人申告。（2026-09-29 観測 / 2021-08-10 時点 / https://x.com）');
  });
  it('replaces internal names in prose', () => {
    expect(cleanDisplayText('接続失敗 / TLS接続失敗 SSL_ERROR_SYSCALL（2回取得）')).toBe('接続失敗 / TLS接続失敗（2回取得）');
    expect(cleanDisplayText('HABIB_ALIは紹介')).toBe('Habib Aliは紹介');
    expect(cleanDisplayText('約$130,000 (CUMULATIVE_ROYALTIES)')).toBe('約$130,000 (累計ロイヤルティ)');
  });
  it('leaves plain prose alone', () => {
    expect(cleanDisplayText('売上は月$1,000（自己申告）')).toBe('売上は月$1,000（自己申告）');
  });
});

describe('labels', () => {
  it('maps tool categories and hides ambiguous ones', () => {
    expect(toolCategoryLabel('MARKETPLACE_APP')).toBe('マーケットプレイスアプリ');
    expect(toolCategoryLabel('OTHER')).toBeNull();
    expect(toolCategoryLabel('PLATFORM')).toBeNull();
    expect(toolCategoryLabel('NEVER_SEEN_LABEL')).toBeNull();
    expect(toolCategoryLabel('求人記載（本番利用は未確認）')).toBe('求人記載（本番利用は未確認）');
  });
  it('maps timeline events and drops research work', () => {
    expect(isResearchTimelineEvent('OFFICIAL_URL_CHECK')).toBe(true);
    expect(isResearchTimelineEvent('product_launch')).toBe(false);
    expect(timelineEventLabel('IH_FIRST_VISIBLE_POST')).toBe('Indie Hackers 最古の表示投稿');
    expect(timelineEventLabel('never_seen_before')).toBeNull();
  });
});

describe('7th audit display rules', () => {
  it('drops the non-public marker from source notes without leaving empty separators', () => {
    expect(formatSourceNote('eBiz Facts https://e.example/x / 2026-09-29 取得 / （原文は非公開のまま）')).toBe('eBiz Facts https://e.example/x / 2026-09-29 取得');
    expect(formatSourceNote('（原文は非公開のまま）')).toBe('');
  });
  it('rewrites the Indie Hackers listing prefix', () => {
    expect(cleanDisplayText('Indie Hackers listing: Quoting software')).toBe('Indie Hackers の掲載文: 「Quoting software」');
  });
  it('shortens ISO timestamps to dates', () => {
    expect(cleanDisplayText('取得 2026-09-14T01:27:30.171Z')).toBe('取得 2026-09-14');
    expect(formatDisplayDate('2026-09-14T01:27:30.171Z')).toBe('2026-09-14');
    expect(formatDisplayDate('2026-09-14')).toBe('2026-09-14');
  });
  it('maps origin labels and hides unknown ones', () => {
    expect(originTypeLabel('reported')).toBe('報告値');
    expect(originTypeLabel('observed')).toBe('観測');
    expect(originTypeLabel('unknown')).toBeNull();
  });
});

describe('listRevenueText', () => {
  it('shows a reported annual revenue as-is, without a 12-way yen conversion', () => {
    expect(listRevenueText({ revenueLabel: '月平均 約5.19兆円（FY2025 年間売上 $416.2B を12で割って円換算）', estimationLogic: 'SEC開示のFY2025売上416,161百万ドル、営業利益133,050百万ドル、純利益112,010百万ドルを12分割。', period: 'FY2025（2025年9月27日終了）' }))
      .toBe('年間売上 $416.2B（FY2025・SEC開示）');
    expect(listRevenueText({ revenueLabel: '月平均 約971億円（FY2025 年間売上 1.16兆円 を12で割った値）', estimationLogic: 'FY2025連結売上1,164,922百万円、営業利益282,553百万円を12分割。', period: 'FY2025（2025年3月期）' }))
      .toBe('年間売上 1.16兆円（FY2025・公表資料）');
    expect(listRevenueText({ revenueLabel: '月平均 約722億円（年間売上 8,660億円 を12で割った値）', period: '2025年3月期' }))
      .toBe('年間売上 8,660億円（2025年3月期・公表資料）');
  });
  it('uses the SEC row when the label is an English 10-K line', () => {
    expect(listRevenueText({
      revenueLabel: 'SEC 10-K FY2025: Revenue $23,769,000,000（USD, 期間 2024-11-30〜2025-11-28）',
      supported: ['SEC 10-K FY2025（期間末 2025-11-28、提出 2026-01-15）: 売上 $23,769,000,000（us-gaap:Revenues、2024-11-30〜2025-11-28）'],
    })).toBe('年間売上 $23.8B（FY2025・10-K）');
    expect(listRevenueText({ revenueLabel: 'SEC 10-K FY2025: Revenue $145,835,000（USD, 期間 2025-01-01〜2025-12-31）' }))
      .toBe('年間売上 $145.8M（FY2025・10-K）');
    expect(listRevenueText({ revenueLabel: 'SEC 20-F FY2025: 年間売上 17,186百万EUR' })).toBe('年間売上 €17.2B（FY2025・20-F）');
  });
  it('turns unsupported or period-less labels into 売上未確認', () => {
    expect(listRevenueText({ revenueLabel: 'この収益欄は裏付けが無いため、売上としては扱っていない' })).toBe('売上未確認');
    expect(listRevenueText({ revenueLabel: '売上期間未確認（年次根拠のみ。月次換算なし）' })).toBe('売上未確認');
    expect(listRevenueText({})).toBe('売上未確認');
  });
  it('shortens self-reported and article monthly revenue', () => {
    expect(listRevenueText({ revenueLabel: '本人申告 月次売上 $45,000（2019-10-11 最終更新・IH の収益ページ、創業者入力、独立検証なしと明記）。2020年の売却出品時は月約$15K / 現在の売上は未確認' }))
      .toBe('月次売上 $45,000（本人申告・IH 2019-10-11）');
    expect(listRevenueText({ revenueLabel: '本人申告 MRR $5,200（2021-06-11・MicroAngel、独立検証なし）／現在の売上は未確認' }))
      .toBe('MRR $5,200（本人申告・2021-06-11）');
    expect(listRevenueText({ revenueLabel: '本人申告 月次収益 $60,000（2018-02-23 時点・IH の収益ページに創業者が入力、独立検証なしと明記）/ 現在の売上は未確認' }))
      .toBe('月次収益 $60,000（本人申告・IH 2018-02-23）');
    expect(listRevenueText({ revenueLabel: '記事記載 $550（月次売上）/ eBiz Facts 2026-09-06掲載・独立確認なし' }))
      .toBe('月次売上 $550（記事記載・eBiz Facts 2026-09-06）');
    expect(listRevenueText({ revenueLabel: '本人申告 $14,000（TOTAL_OR_BEST_PERIOD）/ eBiz Facts 2025-10-24掲載・独立確認なし・月次換算なし' }))
      .toBe('売上 $14,000（本人申告・累計または最良期間・eBiz Facts 2025-10-24）');
    expect(listRevenueText({ revenueLabel: 'IH の収益ページ（Stripe 連携・IH が検証済みと表示）直近30日の売上 $42,011（2026-09-29 取得、Stripe 以外の入金は含まない）。創業者は…' }))
      .toBe('直近30日の売上 $42,011（IH収益ページ・2026-09-29取得）');
  });
});

describe('reportedAnnualReport', () => {
  it('reads revenue, operating income and net income from the filing rows', () => {
    const r = reportedAnnualReport({ supported: [
      'SEC 10-K FY2025（期間末 2025-11-28、提出 2026-01-15）: 売上 $23,769,000,000（us-gaap:Revenues、2024-11-30〜2025-11-28）',
      'SEC 10-K FY2025（期間末 2025-11-28、提出 2026-01-15）: 営業利益 $8,706,000,000（us-gaap:OperatingIncomeLoss、2024-11-30〜2025-11-28）',
      'SEC 10-K FY2025（期間末 2025-11-28、提出 2026-01-15）: 純利益 -$7,130,000,000（us-gaap:NetIncomeLoss）',
    ] });
    expect(r).toEqual({ fiscalYear: 'FY2025', periodEnd: '期間末 2025-11-28', doc: '10-K', revenue: '$23.8B', operatingIncome: '$8.7B', netIncome: '-$7.1B' });
  });
  it('falls back to the estimation text and keeps the original currency', () => {
    const r = reportedAnnualReport({ estimationLogic: 'SEC開示のFY2025売上416,161百万ドル、COGS220,960百万ドル、営業利益133,050百万ドル、純利益112,010百万ドルを12分割。', period: 'FY2025（2025年9月27日終了）' });
    expect(r).toMatchObject({ fiscalYear: 'FY2025', periodEnd: '2025年9月27日終了', doc: 'SEC開示', revenue: '$416.2B', operatingIncome: '$133.1B', netIncome: '$112.0B' });
    const loss = reportedAnnualReport({ estimationLogic: 'FY2025売上5,215.304百万ドル、営業損失130.392百万ドル、純損失256.687百万ドルを12分割。' });
    expect(loss).toMatchObject({ operatingIncome: '-$130.4M', netIncome: '-$256.7M' });
  });
  it('returns null when no annual figure is written', () => {
    expect(reportedAnnualReport({ revenueLabel: '売上未確認', estimationLogic: '非上場企業で監査済み通期損益を公式開示していないため、売上・原価・利益はnull。' })).toBeNull();
  });
});

describe('stripSourceParenthetical', () => {
  it('drops parentheses that only say where a value was written or what is unconfirmed', () => {
    expect(stripSourceParenthetical('Courier（公式サイトの著作権表記）')).toBe('Courier');
    expect(stripSourceParenthetical('LANS Inc.（公式サイトの表示。州・所在地は未確認）')).toBe('LANS Inc.');
    expect(stripSourceParenthetical('UNKNOWN (公開ディレクトリ情報のみ)')).toBe('UNKNOWN');
  });
  it('keeps parentheses that are part of a real name', () => {
    expect(stripSourceParenthetical('Acme (Pty) Ltd')).toBe('Acme (Pty) Ltd');
    expect(stripSourceParenthetical(undefined)).toBe('');
  });
});

describe('entityIdentityLine', () => {
  it('joins name and country without source remarks', () => {
    expect(entityIdentityLine('Courier（公式サイトの著作権表記）', 'US')).toBe('Courier · US');
    expect(entityIdentityLine('LANS Inc.（公式サイトの表示。州・所在地は未確認）', '未確認')).toBe('LANS Inc. · 未確認');
  });
  it('shows nothing when every part is unconfirmed or an internal label', () => {
    expect(entityIdentityLine('未確認', '未確認')).toBe('');
    expect(entityIdentityLine('UNKNOWN (公開ディレクトリ情報のみ)', '未確認')).toBe('');
  });
});

describe('estimationLogicLabel', () => {
  it('hides the boilerplate that says no estimate was made', () => {
    expect(estimationLogicLabel('出典に書かれた申告・発表・公告を日付付きで記録。金額の推計・換算は行っていない。P&L項目の数値は0のまま未確認。')).toBe('');
  });
  it('keeps a real basis', () => {
    expect(estimationLogicLabel('FY2025売上を12分割。')).toBe('FY2025売上を12分割。');
  });
});

describe('estimationLogicLabel: work descriptions', () => {
  it('hides sentences that only say what was not done or kept', () => {
    expect(estimationLogicLabel('推計・按分・円換算は行っていない。SEC 10-K の年次報告値（XBRL companyfacts）を報告値に USD のまま保持。月次のP&Lは未確認のまま。')).toBe('');
    expect(estimationLogicLabel('月次換算・円換算・推計はしていない。')).toBe('');
  });
});

describe('listRevenueText: sourced revenue lines', () => {
  it('shows a thousand-dollar annual figure as an annual revenue line with the filing kind', () => {
    expect(listRevenueText({
      revenueLabel: '売上高45,183,036千ドル / 営業利益13,326,603千ドル / 純利益10,981,201千ドル',
      period: '2025-01-01〜2025-12-31',
      sourceDoc: 'https://www.sec.gov/Archives/edgar/data/1065280/000106528026000034/nflx-20251231.htm',
      supported: ['収益は主に月額会員料金と広告から生じると10-Kに記載されている。'],
    })).toBe('年間売上 $45.2B（FY2025・10-K）');
  });
  it('falls back to the founder-entered monthly revenue when the label is unconfirmed', () => {
    expect(listRevenueText({
      revenueLabel: '未確認',
      supported: ['Indie Hackers（収益ページ）（2020-03-07）: 収益ページは月次売上 $5,850 を表示し、「独立には検証されていない」と明記（入力者は創業者）'],
    })).toBe('月次売上 $5,850（本人申告・IH 2020-03-07）');
  });
  it('treats an unsourced failure label as no revenue', () => {
    expect(listRevenueText({ revenueLabel: '破綻事例（数値は未確認）' })).toBe('売上未確認');
  });
});

describe('sourceKindLabel', () => {
  it('classifies only what the source supports', () => {
    expect(sourceKindLabel({ text: 'https://www.sec.gov/Archives/x' })).toBe('開示資料');
    expect(sourceKindLabel({ text: 'https://www.indiehackers.com/product/x/revenue' })).toBe('本人申告');
    expect(sourceKindLabel({ text: 'https://example.com/a', sourceClass: 'INDEPENDENT_SECONDARY' })).toBe('記事');
    expect(sourceKindLabel({ text: 'https://example.com/a' })).toBeNull();
    expect(sourceKindLabel({ text: '' })).toBeNull();
  });
});

describe('withYenApprox', () => {
  it('外貨の金額それぞれに円のおおよその額を添える', () => {
    expect(withYenApprox('料金を月24ドル・49ドル・99ドルの3段と説明し、最安でも年288ドル。')).toBe('料金を月24ドル（約3,600円）・49ドル（約7,350円）・99ドル（約1万4,850円）の3段と説明し、最安でも年288ドル（約4万3,200円）。');
    expect(withYenApprox('年10万ドル超の商談')).toBe('年10万ドル（約1,500万円）超の商談');
    expect(withYenApprox('120万ルピーの月商')).toBe('120万ルピー（約210万円）の月商');
  });
  it('記号・略号の通貨にも添える', () => {
    expect(withYenApprox('月換算$10、月払いは$15')).toBe('月換算$10（約1,500円）、月払いは$15（約2,250円）');
    expect(withYenApprox('年$1.2M')).toBe('年$1.2M（約1.8億円）');
    expect(withYenApprox('月49 USD・€20・£10・₹1,000')).toBe('月49 USD（約7,350円）・€20（約3,300円）・£10（約1,950円）・₹1,000（約1,750円）');
  });
  it('マイナスの金額は円にも符号を付ける', () => {
    expect(withYenApprox('手残りは-$10')).toBe('手残りは-$10（約−1,500円）');
    expect(withYenApprox('純利益▲5万ドル')).toBe('純利益▲5万ドル（約−750万円）');
    expect(withYenApprox('月$10-$20')).toBe('月$10-$20（約1,500円〜3,000円）');
  });
  it('範囲は両端を換算する', () => {
    expect(withYenApprox('月額29〜99ドル')).toBe('月額29〜99ドル（約4,350円〜1万4,850円）');
    expect(withYenApprox('$29〜$99')).toBe('$29〜$99（約4,350円〜1万4,850円）');
    expect(withYenApprox('1〜2万ドル')).toBe('1〜2万ドル（約150万円〜300万円）');
  });
  it('範囲の下端に桁が無く、上端の桁を当てると逆転する時は、下端を書かれたままの額にする', () => {
    expect(withYenApprox('$900〜1K')).toBe('$900〜1K（約13万5,000円〜15万円）');
    expect(withYenApprox('$2,500〜3K')).toBe('$2,500〜3K（約37万5,000円〜45万円）');
    expect(withYenApprox('$1-2M')).toBe('$1-2M（約1.5億円〜3億円）');
  });
  it('ISO の略号の前の桁（k・K・M・B）も読む', () => {
    expect(withYenApprox('25M USD')).toBe('25M USD（約37.5億円）');
    expect(withYenApprox('7K USD')).toBe('7K USD（約105万円）');
    expect(withYenApprox('3M EUR')).toBe('3M EUR（約5億円）');
  });
  it('MM・m・million などの桁も読み、読めない英字が続く金額は換算しない', () => {
    expect(withYenApprox('$1MM')).toBe('$1MM（約1.5億円）');
    expect(withYenApprox('$2.5m')).toBe('$2.5m（約3.8億円）');
    expect(withYenApprox('$10 million')).toBe('$10 million（約15億円）');
    expect(withYenApprox('$5xyz')).toBe('$5xyz');
  });
  it('円の無い括弧の補足が続く時は、その括弧の頭に入れる', () => {
    expect(withYenApprox('月8ドル（商品10点・保存200MB）')).toBe('月8ドル（約1,200円、商品10点・保存200MB）');
  });
  it('すでに円の額や括弧の補足がある金額、外貨の無い文はそのまま', () => {
    expect(withYenApprox('月99ドル（約1万4,850円）')).toBe('月99ドル（約1万4,850円）');
    expect(withYenApprox('月99ドル、約1万円')).toBe('月99ドル、約1万円');
    expect(withYenApprox('月980円')).toBe('月980円');
  });
  it('米ドル以外のドルは換算しない', () => {
    expect(withYenApprox('CA$280,000で売却')).toBe('CA$280,000で売却');
    expect(withYenApprox('A$500と$10')).toBe('A$500と$10（約1,500円）');
    expect(withYenApprox('$39 CAD/mo')).toBe('$39 CAD/mo');
    expect(withYenApprox('US$10')).toBe('US$10（約1,500円）');
  });
  it('円の書式', () => {
    expect(yenText(19995)).toBe('2万円');
    expect(yenText(29996)).toBe('3万円');
    expect(yenText(14850)).toBe('1万4,850円');
    expect(yenText(2.4e8)).toBe('2.4億円');
    expect(yenText(900)).toBe('900円');
  });
});

describe('screenText（画面に出す文の仕上げ）', () => {
  it('出どころの印を外し、外貨に円の概算を添える（両方を同じ関数で通す）', () => {
    expect(screenText('調達はシード160万ドル（TechCrunch、2016年12月）。')).toBe('調達はシード160万ドル（約2.4億円）。');
  });
  it('円が先で外貨が後の並びは、もう換算してあるので重ねない', () => {
    expect(screenText('約900万円（6万ドル、創業者の発言）')).toBe('約900万円（6万ドル）');
  });
  it('円換算が済んだ文はそのまま', () => {
    expect(screenText('月6ドル（約900円）')).toBe('月6ドル（約900円）');
  });
});

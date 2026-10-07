// 画面の自動監査の規則の誤検出・見逃しを押さえる。落とすべき文は 2026-10-07 にオーナーが公開10件の実画面で見つけた問題。
import assert from 'node:assert/strict';
import test from 'node:test';

import { auditScreen, missingYen, originTags, priceExtras, RULES, unitNumbers } from './rules.mjs';

const screen = (over = {}) => ({ id: 'x', name: 'Example', list: '', overview: ['月約1,200人が使う、会計ソフト'], cells: [], sections: [], images: 1, icons: 0, ...over });
const rulesOf = (s) => auditScreen(screen(s)).map((h) => h.rule);

test('出どころの印: 括弧の中の印と媒体の呼び名を落とし、中身の補足は通す', () => {
  for (const bad of ['（保存ページ）', '（インタビュー）', '（月5ドルは約750円。作家のブログ、2009年3月）', '（本人申告）', '（2025年1月・公式）', '（Hacker News、2022-03-04）', '（Grover、選別あり）', '（根拠: 本人の説明）']) {
    assert.equal(originTags(`売上が伸びた${bad}。`).length, 1, bad);
  }
  for (const ok of ['（約1.5万円）', '（2009年3月）', '（年払い）', '（SSO）', '（文字の組み方）', '（合計約41分）', '（8か月で倍増）']) {
    assert.deepEqual(originTags(`売上が伸びた${ok}。`), [], ok);
  }
});

test('印のラベル: 「推定」だけ通す', () => {
  assert.ok(rulesOf({ sections: [{ id: 'section-group-money', title: '稼ぎ方', text: '手残り\n推測\n月約30万円', links: [] }] }).includes(RULES.MARK));
  assert.ok(!rulesOf({ sections: [{ id: 'section-group-money', title: '稼ぎ方', text: '手残り\n推定\n月約30万円', links: [] }] }).includes(RULES.MARK));
});

test('料金: 無料試用・カード不要・PDFが無い・税・返金を落とし、プラン名＋月額＋上限は通す', () => {
  for (const bad of ['14日間の無料試用にカードは要らない。', 'PDFや電子書籍は存在せず、支払ってもダウンロードは付かない。', 'いずれも税別。', '30日間の全額返金を掲げる。']) {
    assert.ok(priceExtras(bad).length > 0, bad);
  }
  for (const ok of ['Proは月10ドル（約1,500円）で10人まで。', '無料プランは10ユーザーまで。', '月額8ドル（約1,200円）で商品10点まで。']) {
    assert.deepEqual(priceExtras(ok), [], ok);
  }
});

test('同じ数字: 表記ゆれも同じ値として、別の場所の2回目を落とす。円換算の括弧と年号は数えない', () => {
  assert.equal(unitNumbers('65万人').at(0)?.key, unitNumbers('650,000人').at(0)?.key);
  assert.equal(unitNumbers('$5,472').at(0)?.key, unitNumbers('5,472ドル').at(0)?.key);
  assert.deepEqual(unitNumbers('2016年に月10ドル（約1,500円）'), [{ key: '10ドル', raw: '10ドル' }]);
  const dup = rulesOf({ sections: [
    { id: 'section-group-secret', title: '成功の秘訣', text: '支払いは489件、5,472ドル（約82万円）', links: [] },
    { id: 'section-chapter-timeline', title: '年表', text: '2016年: 489件で$5,472', links: [] },
  ] });
  assert.equal(dup.filter((r) => r === RULES.DUP_NUMBER).length, 2);
  // 同じ場所の中の繰り返しは見ない（「10人から20人」のような比較）
  assert.ok(!rulesOf({ sections: [{ id: 'section-chapter-core', title: '核', text: '3人で始め、3人のまま続けた', links: [] }] }).includes(RULES.DUP_NUMBER));
});

test('外貨: 同じ文に円が無ければ落とす', () => {
  assert.deepEqual(missingYen('月59ドルの有料版を公開した。'), ['月59ドルの有料版を公開した。']);
  assert.deepEqual(missingYen('月59ドル（約8,850円）の有料版を公開した。'), []);
  assert.deepEqual(missingYen('2016年に始めた。'), []);
});

test('概要: 1行目が規模でなければ落とす', () => {
  assert.ok(rulesOf({ overview: ['電話向けの自動音声案内を売る会社'] }).includes(RULES.OVERVIEW_SCALE));
  assert.ok(!rulesOf({ overview: ['有料200社・年商約3億円の、電話の自動案内の会社'] }).includes(RULES.OVERVIEW_SCALE));
});

test('出典: 章の中のリンクは「出典N」だけ。同じ出典を別の章で繰り返すと落とす', () => {
  const link = (text, href) => ({ text, href });
  const hits = rulesOf({ sections: [
    { id: 'section-chapter-practice', title: 'やった事', text: '', links: [link('出典1', 'https://a.example/')] },
    { id: 'section-chapter-timeline', title: '年表', text: '', links: [link('出典1', 'https://a.example/'), link('こちら', 'https://b.example/')] },
  ] });
  assert.ok(hits.includes(RULES.SAME_SOURCE));
  assert.ok(hits.includes(RULES.ROW_LINK));
});

test('項目名と中身: 年商の欄に売上の一部（直接の支払い・件数）が出たら落とす', () => {
  const cell = (label, value) => ({ where: '数字の帯', label, value });
  assert.ok(rulesOf({ cells: [cell('年商', '$5,472（約82.1万円）\n公開3年目（〜2016年）の直接の支払い 489件')] }).includes(RULES.LABEL_MISMATCH));
  assert.ok(!rulesOf({ cells: [cell('年商', '$2M（約3億円）\n2015-16年度')] }).includes(RULES.LABEL_MISMATCH));
  assert.ok(rulesOf({ cells: [cell('月商', '$60K（約900万円）\n2021年の年間')] }).includes(RULES.LABEL_MISMATCH));
});

test('略語: 説明の無い略語を落とし、固有名の一部・説明つき・誰でも分かる略語は通す', () => {
  const where = (text) => rulesOf({ sections: [{ id: 'section-group-edge', title: '強み', text, links: [] }] }).includes(RULES.JARGON);
  assert.ok(where('HNで190点を取った'));
  assert.ok(!where('一括ログイン（SSO）を足した'));
  assert.ok(!where('SOC2 Type II認証を足した'));
  assert.ok(!where('AIで動画を作る'));
  assert.ok(!where('有名な客: Snapdeal、Canon、DHL。'));
});

test('画像: 製品画面が1枚も出ていなければ落とす', () => {
  assert.ok(rulesOf({ images: 0 }).includes(RULES.NO_IMAGE));
  assert.ok(!rulesOf({ images: 2 }).includes(RULES.NO_IMAGE));
  // アイコンだけでは足りない（docs/OWNER_INTENT.md 7章）
  assert.ok(rulesOf({ images: 0, icons: 1 }).includes(RULES.NO_IMAGE));
});

test('オーナーの例文: 同じ話の繰り返し「よく払い／ほぼ払わなかった」と、概要の「支払い方は…の3つ」を落とす', () => {
  const hits = rulesOf({
    overview: ['年に約70万人が読む、組版の本', '支払い方は、作者が作った文字の書体を買う、直接支払う、紙の本を買う、の3つ。'],
    sections: [
      { id: 'section-chapter-core', title: '戦略の核', text: '無料の流入を、元のサイトごとに見分ける（根拠: Cool Tools経由はよく払い、Reddit経由はほぼ払わなかった）', links: [] },
      { id: 'section-group-first', title: '最初の客', text: '1年目は、Cool Tools経由の読者はよく払い、Reddit経由はほとんど払わなかった。', links: [] },
    ],
  });
  assert.ok(hits.includes(RULES.DUP_PHRASE));
  assert.ok(hits.includes(RULES.OVERVIEW_SALES));
  assert.ok(hits.includes(RULES.ORIGIN));
});

test('同じ話: 別々の話と、章末の出典の一覧は通す', () => {
  const hits = rulesOf({ sections: [
    { id: 'section-chapter-core', title: '戦略の核', text: '無料で読ませ、気に入った読者だけが払う形にした。\n出典1 indiehackers.com\n出典2 news.ycombinator.com', links: [] },
    { id: 'section-group-first', title: '最初の客', text: '最初の客は、法律家向けの紙の本を買った弁護士だった。\n出典1 indiehackers.com\n出典2 news.ycombinator.com', links: [] },
  ] });
  assert.ok(!hits.includes(RULES.DUP_PHRASE));
});

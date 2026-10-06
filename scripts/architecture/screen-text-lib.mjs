/**
 * 画面に出してはいけない語の一覧。check-template-prose.mjs（JSON の文字列欄）と
 * screen-text.tsx（実際に描画した画面の文字）の両方から使う。
 */
export const INTERNAL_TERMS = ['reaudit.legacyDisplaySnapshot', '互換値', 'revenueLabel', 'reportedMetrics'];

// 工程の語（読者向けの文に出してはいけない）。「lane」は Productlane GmbH のような語中を拾わないよう語境界を付ける。
export const PROCESS_RES = [
  [/再監査/, '再監査'],
  [/機械的再監査|機械的な?再/, '機械的(再監査)'],
  [/scripted/i, 'scripted'],
  [/\blane [A-Z]\b/, 'lane X'],
  [/re-audit/i, 're-audit'],
  [/再調査/, '再調査'],
  [/再抽出/, '再抽出'],
  [/以前(?:の|表示していた)(?:数値|表示|損益|説明)|旧表示/, '以前の表示(経緯)'],
  [/【致命的死角】/, '作文見出し'],
  [/^次の作業:/, '次の作業:'],
  // 2026-09-30 5回目の抜き取り監査: 社内向けの文（調査の手順・内部の判定語）
  [/^調べた範囲:/, '調べた範囲:'],
  [/このセッション/, 'このセッション'],
  [/検索回数の上限/, '検索回数の上限'],
  [/採否:/, '採否:'],
  [/前回収集値/, '前回収集値'],
  [/今回の[0-9０-９]*検索/, '今回のN検索'],
  [/IH_WORKFLOW/, 'IH_WORKFLOW'],
  [/Raw本文監査/, 'Raw本文監査'],
  [/明示結合/, '明示結合'],
  [/money signal/i, 'money signal'],
  [/公式URL監査/, '公式URL監査'],
  [/^Indie Hackers公開レコード: 公開報告値$/, '公開報告値だけの行'],
  [/旧業種/, '旧業種'],
  [/UI検証/, 'UI検証'],
  [/^チーム・稼働（記事記載）/, 'チーム・稼働（記事記載）（推測した人数）'],
  [/&(?:#x[0-9a-fA-F]+|#[0-9]+|amp|lt|gt|quot|apos|nbsp);/, 'HTML entity'],
];

// 2026-09-30 6回目: 画面に出る文字の全件検査で足した語（工程・取得手順・内部ラベル）。
export const SCREEN_ONLY_RES = [
  [/派生P&L/, '派生P&L'],
  [/unknown\/hold/, 'unknown/hold'],
  [/ディレクトリ表示を根拠/, 'ディレクトリ表示を根拠'],
  [/未確認も未確認/, '未確認も未確認'],
  [/到達可能/, '到達可能'],
  [/〔金額未確認〕/, '〔金額未確認〕'],
  [/HTTP ?\d{3}/, 'HTTP nnn'],
  [/通常GET/, '通常GET'],
  [/取得結果: 取得成功/, '取得結果: 取得成功'],
  [/外部リンクは公式サイトであることを未確認/, '外部リンクは公式サイトであることを未確認'],
  [/換算・推計はしていない/, '換算・推計はしていない'],
  [/権利: 事実のみ表示/, '権利: 事実のみ表示'],
  [/公式サイトのURLのみ記録/, '公式サイトのURLのみ記録'],
  [/Web検索\d*回/, 'Web検索N回'],
  [/業態別プレイブックは検証手順/, '業態別プレイブックは検証手順'],
  [/収益関連のシグナルを観測/, '収益関連のシグナルを観測'],
  [/rights: Tier/, 'rights: Tier'],
  [/facts-only/, 'facts-only'],
  [/community listing/, 'community listing'],
  [/CAPTURE_REQUIRES/, 'CAPTURE_REQUIRES'],
  [/qualificationStatus/, 'qualificationStatus'],
  // 2026-09-30 7回目
  [/未記録/, '未記録'],
  [/例: 公開情報で確認できた/, '例: 公開情報で確認できた'],
  [/追加の観測レコードはありません/, '追加の観測レコードはありません'],
  [/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, 'ISOタイムスタンプ'],
  [/\[reported\]/, '[reported]'],
  [/Indie Hackers listing/, 'Indie Hackers listing'],
  [/原文は非公開のまま/, '原文は非公開のまま'],
  [/権利未登録/, '権利未登録'],
  [/Web検索では、|Web検索したが/, 'Web検索では、/Web検索したが'],
  [/収益ページを追加取得せず/, '収益ページを追加取得せず'],
  [/本候補は/, '本候補は'],
  [/P&L項目/, 'P&L項目'],
  [/提供機能は上記の出典に記載/, '提供機能は上記の出典に記載'],
  [/製品の説明として記録/, '製品の説明として記録'],
  [/事業内容の詳細は未確認です/, '事業内容の詳細は未確認です'],
  [/第三者報告値/, '第三者報告値'],
  [/monthly revenueは/, 'monthly revenueは'],
  [/推論・サーバー費/, '推論・サーバー費'],
  [/切り出せない。\[出典/, '切り出せない。[出典'],
  // 2026-09-30 8回目
  [/補足記録/, '補足記録'],
  // 「車両登録情報」のような複合語は本物の固有表現なので、語頭が漢字に続くものは除く
  [/(?<![一-龠])登録情報/, '登録情報'],
  [/出典表示で掲載可/, '出典表示で掲載可'],
  [/公式サイト等を再確認/, '公式サイト等を再確認'],
  [/残差計上/, '残差計上'],
  [/仮説材料/, '仮説材料'],
  [/ESTIMATED/, 'ESTIMATED'],
  // 大文字とアンダースコアだけの英語ラベル（NICHE_SAAS, MONOPOLY_MFG など）
  // @CFC_Pro のような X のアカウント名は本物の固有名詞なので除く
  [/(?<!@)\b[A-Z]{3,}(?:_[A-Z]+)+\b/, '内部ラベル(大文字_大文字)'],
  // 2026-09-30 9回目
  [/登録値/, '登録値'],
  // 2026-09-30 10回目
  [/収益パターン候補/, '収益パターン候補'],
  [/外部リンク候補/, '外部リンク候補'],
  [/別途確認対象/, '別途確認対象'],
  [/検索結果に/, '検索結果に'],
  [/公開発言の検索|(?:検索|照会)（\d{4}-\d{2}/, 'の検索（'],
  [/記録していない/, '記録していない'],
  [/(?:実績|数値|金額)として配信しない/, '配信しない'],
  [/(?:元レコード|退避欄|旧値)に保全|保全(?:済み|した)/, '保全'],
  [/事業の採算・再現性は別/, '事業の採算・再現性は別'],
  // 2026-09-30 11回目
  [/開始条件は一部未確認/, '開始条件は一部未確認'],
  [/報道・取材時期不明/, '報道・取材時期不明'],
  [/(?<![A-Za-z])official website/i, 'official website'],
  [/行っていない。/, '行っていない。'],
  [/を保持/, 'を保持'],
  [/主要説明文の語/, '主要説明文の語'],
  [/Services-/, 'Services-'],
  [/出典リンクなし/, '出典リンクなし'],
];

// 一覧の行（ListRow）にだけ効く語。詳細ペインの出典行（SEC 10-K FY2025（期間末…）など）は対象外。
export const LIST_ONLY_RES = [
  [/この収益欄は裏付けが無い/, '一覧:この収益欄は裏付けが無い'],
  [/売上期間未確認|年次根拠のみ/, '一覧:売上期間未確認'],
  [/で割って円換算|で割った値|月平均 約/, '一覧:年間を12で割った円換算'],
  [/\bRevenue \$|^SEC 10-K FY\d{4}:/, '一覧:英語のまま'],
  [/現在の売上は未確認|独立検証なしと明記/, '一覧:注記が長すぎる'],
];

// 独立した行として出てはいけない語（バッジ・タグの生ラベル）
export const STANDALONE_LINES = ['収集事例', '財務未確認', '公式サイト確認済み'];

// ---- 出どころの検査（2026-09-30 13回目）-----------------------------------------------------
// 画面の文字は fact・analysis（その計算と根拠＝data-evidence）・metric・source の要素の中か、ui-strings の許可リストのどちらかでなければならない。
const VOID_TAGS = new Set(['br', 'img', 'input', 'hr', 'meta', 'link', 'wbr', 'source', 'col']);
// data-fact-part: 別の場所に全文がある事実の一部（1文目・残りの文・事実から取り出した年）。同じ fact の2回目とは数えない。
// data-record: 事例の構造化された欄の値（人数など）。文章ではなく数値の表示だけに使う。
const OWNER_ATTRS = ['data-fact', 'data-metric', 'data-source', 'data-analysis', 'data-evidence', 'data-fact-part', 'data-record'];
const ATTR_TEXTS = ['title', 'aria-label', 'alt', 'placeholder'];
const decodeEntities = (s) => s
  .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#x27;/g, "'").replace(/&nbsp;/g, ' ')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const attrOf = (tagSrc, name) => { const m = new RegExp(`\\s${name}="([^"]*)"`).exec(tagSrc); return m ? decodeEntities(m[1]) : undefined; };

/**
 * html を1画面ぶんとして調べる。
 *   isAllowed(text): ui-strings の許可リストに一致する文字か
 *   戻り値: unowned（出どころの無い文字）、emptyHeadings（中身の無い見出し）、dupFacts（同じ fact ID の2回目）、
 *           factCount / metricCount / sourceCount
 */
export function analyzeScreen(html, isAllowed) {
  const clean = html.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
  const stack = []; // { tag, owner, textLen, headingLen }
  const unowned = [];
  const emptyHeadings = [];
  const seenFacts = new Set();
  let currentVariant = '';
  const dupFacts = [];
  let factCount = 0, metricCount = 0, sourceCount = 0;
  const owned = () => stack.some((e) => e.owner);
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)([^>]*)>|([^<]+)/g;
  let m;
  while ((m = re.exec(clean))) {
    if (m[4] !== undefined) {
      const t = decodeEntities(m[4]).replace(/\s+/g, ' ').trim();
      if (!t) continue;
      for (const e of stack) e.textLen += t.length;
      const top = stack[stack.length - 1];
      if (top && /^h[3-6]$/.test(top.tag)) top.headingText = t;
      if (!owned() && !isAllowed(t)) unowned.push(t);
      continue;
    }
    const tag = m[2].toLowerCase();
    if (m[1]) {
      let i = stack.length - 1;
      while (i >= 0 && stack[i].tag !== tag) i--;
      if (i < 0) continue;
      const closed = stack.splice(i);
      const el = closed[0];
      if (/^h[3-6]$/.test(el.tag)) {
        for (const anc of stack) { anc.headingLen += el.textLen; anc.firstHeading ??= el.headingText; }
      }
      // 見出しのある区画（<section>）で、見出し以外の文字が無いもの = 中身の無い見出し
      if (el.tag === 'section' && el.headingLen > 0 && el.textLen - el.headingLen === 0) emptyHeadings.push(el.firstHeading || el.tag);
      continue;
    }
    const attrs = m[3];
    const owner = OWNER_ATTRS.some((a) => attrOf(attrs, a) !== undefined);
    const fact = attrOf(attrs, 'data-fact');
    const variant = attrOf(attrs, 'data-variant');
    if (variant !== undefined) currentVariant = variant;
    if (fact !== undefined) {
      factCount += 1;
      // data-variant は同じ行の幅違いの表示（同時には1つしか見えない）。variant ごとに数える。
      const key = `${currentVariant}|${fact}`;
      if (seenFacts.has(key)) dupFacts.push(fact); else seenFacts.add(key);
    }
    if (attrOf(attrs, 'data-metric') !== undefined) metricCount += 1;
    if (attrOf(attrs, 'data-source') !== undefined) sourceCount += 1;
    if (!owner && !owned()) {
      for (const a of ATTR_TEXTS) {
        const v = attrOf(attrs, a)?.trim();
        if (v && !isAllowed(v)) unowned.push(v);
      }
    }
    const selfClosing = /\/\s*$/.test(attrs) || VOID_TAGS.has(tag);
    if (!selfClosing) stack.push({ tag, owner, textLen: 0, headingLen: 0, firstHeading: undefined });
  }
  return { unowned, emptyHeadings, dupFacts, factCount, metricCount, sourceCount };
}

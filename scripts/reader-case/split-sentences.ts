/**
 * 文ごとの振り分け。fact（事実）／absence（unknowns へ）／process（捨てる）／metric（数値は metrics 側にある）／pointer（引用元の案内）。
 * 事実の文から、URL・「（出典: …）」・「YYYY-MM-DD 確認／取得」・「記事記載」の前置きを取り除く。
 */
import type { ReaderCase } from '../../src/shared/reader-case';

type FactKind = ReaderCase['facts'][number]['kind'];

export type SentenceClass = 'fact' | 'absence' | 'process' | 'metric' | 'pointer';

export interface Sentence {
  cls: SentenceClass;
  text: string;
  original: string;
  factKind?: FactKind;
  /** 文が指す「行頭の出典名」（例: 公式サイト、Indie Hackers 掲載ページ）。出典の結び付けに使う */
  label?: string;
  /** 行頭の（YYYY-MM-DD）。確認日のことが多いので statedAt にはしない */
  leadDate?: string;
  reason?: string;
}

/** 括弧の外の「。」で文を分ける。 */
export function splitSentences(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of text.replace(/\s+/g, ' ')) {
    if ('「（(［[『'.includes(ch)) depth++;
    else if ('」）)］]』'.includes(ch)) depth = Math.max(0, depth - 1);
    cur += ch;
    if (ch === '。' && depth === 0) {
      out.push(cur.trim());
      cur = '';
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out.filter(Boolean);
}

const URL_RE = /https?:\/\/[^\s「」（）()\[\]、。,"'<>]+/g;
const DATE = String.raw`\d{4}-\d{2}-\d{2}`;

const PAREN = String.raw`(?:\s*[（(][^）)]*[）)])`;
const LEAD_LABEL = new RegExp(
  String.raw`^(公式サイト(?:のページ)?|公式(?:トップ|ブログ|サイト)?|Indie ?Hackers(?:\s*(?:掲載ページ|収益ページ|製品ページ|投稿|インタビュー記事|公開レコード))?|IH(?:\s*(?:掲載ページ|収益ページ|製品ページ))?|eBiz Facts(?:の?記事)?|www\.[\w.\-]+|[\w.\-]+\.(?:com|io|ai|co|net|jp|org|app|dev))(${PAREN}*)\s*[:：]\s*`,
);

/** 「事業内容（記事記載）: …」型の前置き。ラベルは残し、「（記事記載）」だけ外す。 */
const ARTICLE_TAG = /（記事記載）|（記事の記載）|\(記事記載\)|（記事記載・[^）]*）/g;

/** 文から取り除く注記 */
function stripNotes(s0: string): string {
  let s = s0;
  s = s.replace(/[\[［（(]\s*(?:出典|source)\s*[:：][^\]］）)]*[\]］）)]/gi, '');
  s = s.replace(URL_RE, '');
  s = s.replace(new RegExp(String.raw`[（(][^）)]*?${DATE}\s*(?:確認|取得)[^）)]*[）)]`, 'g'), '');
  s = s.replace(new RegExp(String.raw`[（(]\s*(?:確認日|取得日|確認|取得)\s*[:：]?\s*${DATE}\s*[）)]`, 'g'), '');
  s = s.replace(new RegExp(String.raw`${DATE}\s*(?:に)?(?:確認|取得)(?:した|済み|時点)?`, 'g'), '');
  s = s.replace(/[（(][^）)]*(?:確認対象|代表性|独立確認|独立した確認|独立には検証|独立検証|検証なし|未検証|第三者の確認|確認は無い|確認されていない)[^）)]*[）)]/g, '');
  s = s.replace(/[（(][^）)]*(?:検索結果|検索で)[^）)]*[）)]/g, '');
  s = s.replace(/[、,]?\s*著作権表記は[^。、]*/g, '');
  s = s.replace(ARTICLE_TAG, '');
  s = s.replace(/[（(]\s*[）)]/g, '').replace(/\s*\/\s*$/, '');
  s = s.replace(/\s{2,}/g, ' ').replace(/^[\s、,:：]+|[\s、,]+$/g, '');
  return s.trim();
}

/** 引用元の案内（事実ではない） */
const POINTER = /(?:を記事が引用|の記事が引用|を記事が紹介)\s*[:：]?\s*$|^(?:創業者の一次発信|公式サイト|本人の発言を載せた第三者ページ)を記事が引用|ページURLを記録|のURLを記録|URLを記録/;

/** 調べた作業の記録（読者に見せない） */
const PROCESS =
  /WebFetch|DNS|HTTP\s?(?:Error\s?)?\d{3}|HTTP Error|名前解決|取得(?:に失敗|できな|できず|成功|した本文|した時点)|開けなかった|開けず|応答(?:しな|が無|がな)|到達不能|タイムアウト|robots|Wayback|CDX|Internet Archive|再抽出|保存済み|原文(?:は|を)(?:非公開|転載)|転載(?:なし|しない)|検索(?:で見え|して確認|結果(?:に|で|は))|雛形|突合|照合|別取得|回の取得|確認対象|代表性|判定できない|当調査|本調査|調査(?:範囲|では|時点|対象外|した範囲)|採録標本|標本として|読み取れ|抽出(?:した|でき)|JavaScript(?:で描画|の描画)|取得した本文|全Web上|不存在を意味|独立(?:した)?確認(?:は|が)?(?:ない|なし|できていない|できない)|独立検証|検証(?:されていない|済みではない)|未検証|入力日[はが]|^(?:記事|公式|本人)は[^、。]{0,40}に言及(?:している|する)?。?$|取得したのは|標本数|判断できる[^。]*ではない|確認した[^。]*ではなく|^採否[:：]|通常GET|記録していない|(?:検証|調査|確認)?(?:は)?今回行っていない|行っていない。?$|を保持する|[A-Z]{2,}_[A-Z0-9_]+|^Indie Hackers listing[:：]|^(?:最初の投稿と同じ|売上であり利益ではない|売上額の記述|本人の過去の申告|保存本文|売上の申告ではない|本人の申告ではない|記事が2つを足した|旧公式URLから)|入力者は|入力は|最後の投稿|収益ページの.*入力|製品欄|公開ページの取得|本文が少な|ページ名は|構造化データ|アクセス(?:できな|できず|不可)|表示されない|読み込め|確認できた範囲|確認した範囲|一次資料で確認|裏付け(?:る|と)なる|記録しない|推奨は|独立に確認|宣伝文は|確認は無い|確認はない|記事が引用するURL|不採用|採用しない|採用していない|同日または前後|丸い(?:値|同額)|月次推移|Stripe連携なし|購入・ログイン|動作試験|提供側の説明|応答している|応答が確認|ドメインが応答|取得できた|取得時に|取得時の/;

const ABSENCE =
  /(?:売上|収益|利益)(?:の)?(?:実額|金額|額|数字|記載)[^。]{0,4}(?:は|が)?(?:ない|なし)|(?:記載|掲載|表示|言及|公表|開示|情報|説明|発言|数値|金額|料金|価格|運営者|所在地|創業者|法人名|住所|人数|プラン|実績)[^。]{0,16}?(?:は|が|も)?(?:ない|なし|見当たらな|見つからな|確認できな|不明|載っていな|書かれていな|書いていな|記されていな|示されていな|明示されていな|公開されていな)|未確認|不明|非掲載|非公開|記載なし|公表していない|明らかにしていない|明らかでない|見つかっていない$|確認できなかった|確認できない|見当たらなかった|得られなかった|判別できな|分からない|わからない/;

/** 数値が metrics に載る種類の行 */
const MONEY_LINE =
  /(?:収益ページ|収益欄|記事に書かれた|記事が載せる金額|記事に金額の記載|Indie Hackersの公開レコード|IH(?:製品)?ページの月間売上)/;

const UNKNOWN_KEYS: [RegExp, ReaderCase['unknowns'][number]][] = [
  [/売上|収益|売上高|MRR/, 'REVENUE'],
  [/利益|手残り|赤字/, 'PROFIT'],
  [/原価|費用|コスト|経費/, 'COST'],
  [/チーム|人数|従業員|社員|運営者|創業者|法人|所在/, 'TEAM'],
  [/集客|チャネル|流入/, 'CHANNEL'],
  [/ツール|技術|スタック/, 'TOOLS'],
  [/料金|価格|プラン/, 'PRICING'],
  [/創業年|設立|開始時期|ローンチ/, 'FOUNDED'],
  [/稼働|現在の状況|存続|運営状況/, 'STATUS'],
];

export function unknownsFromText(text: string): ReaderCase['unknowns'][number][] {
  const out = new Set<ReaderCase['unknowns'][number]>();
  for (const [re, item] of UNKNOWN_KEYS) if (re.test(text)) out.add(item);
  return [...out];
}

const KIND_RULES: [FactKind, RegExp][] = [
  ['EXIT', /売却|買収|M&A|譲渡|バイアウト|エグジット|acquired|acquisition/i],
  ['FUNDING', /調達|出資|資金調達ラウンド|シリーズ[A-EＡ-Ｅ]|助成金|ベンチャーキャピタル|IPO|上場/],
  ['PRICING', /[$＄€£¥]\s?\d|\d[\d,.]*\s?(?:円|ドル|ユーロ|USD|EUR|JPY)|月額|年額|買い切り|一回払い|無料(?:版|プラン|試用|トライアル)|従量課金|課金プラン|サブスクリプション|価格は|料金は|料金を|料金体系|料金プラン|年会費/],
  ['FOUNDING', /創業した|創業し|創業は|に創業|創業年|設立|創設|創立|立ち上げ|開始時期|ローンチ|に開始|開発を始|\d{4}年に.*(?:作り|作った|始め|公開)/],
  ['EVENT', /投稿|報告|ピボット|方針転換|閉鎖|終了した|停止した|移行した|発表/],
  ['TEAM', /共同創業者|創業者は|創業者の|CEO|CTO|CPO|従業員|社員|人で運営|ひとり運営|一人|メンバー|運営者|運営は|本人と|リモート勤務|チーム表示|チームで|人のチーム|掲載者/],
  ['TOOL', /ツール|技術基盤|Stripe|Shopify|WordPress|Next\.js|React|Supabase|Firebase|AWS|GitHub Copilot|ノーコード|Bubble|Zapier|OpenAI|Claude|GPT|スタック/],
  ['CHANNEL', /集客|流入|SEO|広告|Product Hunt|Reddit|Twitter|X（|Xの|YouTube|TikTok|Instagram|アフィリエイト|紹介プログラム|ニュースレター|口コミ|検索経由/],
];

export function classifyKind(text: string): FactKind {
  for (const [k, re] of KIND_RULES) if (re.test(text)) return k;
  return 'OTHER';
}

/** 1つのテキスト（複数の文を含む）を文に分けて振り分ける。 */
export function classifySentences(raw: string): Sentence[] {
  const out: Sentence[] = [];
  // 「。」の後ろに置かれた出典の括弧は、直前の文に付ける
  const segments: string[] = [];
  for (const seg of splitSentences(raw)) {
    if (segments.length && /^[\[［（(]\s*(?:出典|source|確認日)/i.test(seg)) segments[segments.length - 1] += ` ${seg}`;
    else segments.push(seg);
  }
  for (const original of segments) {
    let s = original;
    let label: string | undefined;
    let leadDate: string | undefined;
    // 行頭の日付前置き（「2026-09-29 記事の記載: …」）
    s = s.replace(new RegExp(String.raw`^${DATE}\s*(?:記事の記載|確認|取得|時点)?\s*[:：]\s*`), '');
    const lead = s.match(LEAD_LABEL);
    if (lead) {
      label = lead[1];
      const d = lead[2]?.match(new RegExp(DATE));
      if (d) leadDate = d[0];
      s = s.slice(lead[0].length);
    }
    const hadUrl = URL_RE.test(original);
    URL_RE.lastIndex = 0;
    if (POINTER.test(original) && hadUrl && stripNotes(s).replace(/[:：\s]/g, '').length < 24) {
      out.push({ cls: 'pointer', text: '', original, label, leadDate, reason: 'citation-pointer' });
      continue;
    }
    if (/^\s*(?:公式サイト|Indie Hackers)?のページURLを記録|URLを記録/.test(original)) {
      out.push({ cls: 'pointer', text: '', original, label, leadDate, reason: 'url-record' });
      continue;
    }
    const cleaned = stripNotes(s);
    const text = cleaned.replace(/[。\s]+$/, '');
    if (/^[（(][\s/\d\-:：]*[）)]$/.test(text) || /^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/\S*)?$/i.test(text)) {
      out.push({ cls: 'process', text: '', original, label, leadDate, reason: 'broken-fragment' });
      continue;
    }
    if (!text || text.length < 8 || /[:：]$/.test(text)) {
      out.push({ cls: 'process', text: '', original, label, leadDate, reason: 'empty-after-clean' });
      continue;
    }
    if (MONEY_LINE.test(text) && /[$＄€£¥]\s?\d|\d\s?(?:ドル|円|ユーロ|米ドル)|US\$/.test(text)) {
      out.push({ cls: 'metric', text, original, label, leadDate, reason: 'money-line' });
      continue;
    }
    if (/^(?:独立(?:した)?確認|第三者の確認|利益・原価|本人の数字として|金額は)/.test(text) || /^記事に金額の記載/.test(text)) {
      out.push({ cls: 'process', text, original, label, leadDate, reason: 'verification-note' });
      continue;
    }
    if (PROCESS.test(text)) {
      out.push({ cls: 'process', text, original, label, leadDate, reason: 'process-word' });
      continue;
    }
    if (ABSENCE.test(text)) {
      // 本文は事実で、末尾の括弧だけが「記載なし」の注記なら、括弧を外して事実として残す
      const head = text.replace(/[（(][^（）()]*[）)]$/, '').trim();
      if (head !== text && head.length >= 12 && !ABSENCE.test(head) && !PROCESS.test(head) && !/根拠が見当たら|裏付け|本文に.*(?:ない|なし)/.test(head)) {
        out.push({ cls: 'fact', text: head + '。', original, label, leadDate, factKind: classifyKind(head) });
        continue;
      }
      out.push({ cls: 'absence', text, original, label, leadDate, reason: 'absence' });
      continue;
    }
    out.push({ cls: 'fact', text: text + '。', original, label, leadDate, factKind: classifyKind(text) });
  }
  return out;
}

/** 文字2つ組の類似度（Dice）。言い換えなしの近い重複を1つにする。 */
export function bigramDice(a: string, b: string): number {
  if (a.length < 2 || b.length < 2) return 0;
  const grams = (t: string) => {
    const m = new Map<string, number>();
    for (let i = 0; i < t.length - 1; i++) m.set(t.slice(i, i + 2), (m.get(t.slice(i, i + 2)) ?? 0) + 1);
    return m;
  };
  const ga = grams(a);
  const gb = grams(b);
  let inter = 0;
  for (const [g, n] of ga) inter += Math.min(n, gb.get(g) ?? 0);
  return (2 * inter) / (a.length - 1 + (b.length - 1));
}

/** 重複判定用の正規化 */
export function dedupeKey(text: string): string {
  return text
    .replace(/[\s。、，,．.:：;；「」『』（）()\[\]・\-‐－–—"'“”]/g, '')
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .toLowerCase();
}

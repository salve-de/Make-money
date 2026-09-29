/**
 * 表示用の文章整形（純粋関数・カタログデータに依存しない）。
 * サーバーの公開射影と Foundation アダプタ（ブラウザでも動く）の両方で使う。
 * 新しい内容は作らない。消す・切る・詰める・欠けた主語（事例名）を戻すだけ。
 */

// 全角記号・かな・漢字・全角英数（和文として扱う文字）
const CJK = '\\u3001-\\u303f\\u3040-\\u30ff\\u31f0-\\u31ff\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff\\uff01-\\uff60';
const SPACE_AFTER_CJK = new RegExp(`([${CJK}])[ \\t\\u00a0\\u3000]+(?=[${CJK}A-Za-z0-9])`, 'g');
const SPACE_BEFORE_CJK = new RegExp(`([A-Za-z0-9])[ \\t\\u00a0\\u3000]+(?=[${CJK}])`, 'g');
// 絵文字・装飾記号（SNS投稿の貼り付けの名残）
const DECORATION = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{E0020}-\u{E007F}]/gu;
const BRACKETS: ReadonlyArray<readonly [string, string]> = [['「', '」'], ['『', '』'], ['（', '）'], ['(', ')'], ['【', '】']];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function count(text: string, char: string): number {
  let n = 0;
  for (let i = text.indexOf(char); i !== -1; i = text.indexOf(char, i + 1)) n += 1;
  return n;
}

/** 片側だけ残った括弧を外し、末尾で閉じずに切れた括弧書きは括弧の手前で切る。 */
function balanceBrackets(text: string): string {
  let t = text;
  for (const [open, close] of BRACKETS) {
    if (!t.includes(open) && !t.includes(close)) continue;
    if (t.startsWith(open) && count(t, open) > count(t, close)) t = t.slice(open.length);
    if (t.endsWith(close) && count(t, close) > count(t, open)) t = t.slice(0, -close.length);
    const lastOpen = t.lastIndexOf(open);
    if (lastOpen >= 8 && t.indexOf(close, lastOpen) === -1) t = t.slice(0, lastOpen).trimEnd();
  }
  return t;
}

// 何もしなくてよい文字列で重い置換を走らせないための事前判定
const MAY_HAVE_DECORATION = /[\u2600-\u27bf\u2b00-\u2bff\ufe0f\u200d\ud800-\udbff]/;
const MAY_HAVE_SPACING = /[ \t\u00a0\u3000\r\n]/;
const MAY_HAVE_PUNCTUATION_ISSUE = /\.{3}|…{3}|[、,]\s*。|。\s*[、,]|。。|、、|！！|？？|…。/;
const MAY_HAVE_BRACKET = /[「」『』（）()【】]/;
const EDGE_PUNCTUATION = /^[\s、。,:：・]|[\s、,:：・]$/;

function trimEdgePunctuation(text: string): string {
  return EDGE_PUNCTUATION.test(text) ? text.replace(/^[\s、。,:：・]+/, '').replace(/[\s、,:：・]+$/, '') : text;
}

/** 空白・記号・句読点の崩れを直す。何度かけても同じ結果になる。 */
export function tidyText(value: string): string {
  let t = value;
  if (MAY_HAVE_DECORATION.test(t)) t = t.replace(DECORATION, '');
  if (MAY_HAVE_SPACING.test(t)) {
    t = t.replace(/\r\n?/g, '\n').replace(/[ \t\u00a0]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{2,}/g, '\n');
    t = t.replace(SPACE_AFTER_CJK, '$1').replace(SPACE_BEFORE_CJK, '$1');
  }
  if (MAY_HAVE_PUNCTUATION_ISSUE.test(t)) {
    t = t.replace(/\.{3,}/g, '…').replace(/…{3,}/g, '……');
    t = t.replace(/[、,]\s*。/g, '。').replace(/。\s*[、,]/g, '。').replace(/。{2,}/g, '。').replace(/、{2,}/g, '、');
    t = t.replace(/！{2,}/g, '！').replace(/？{2,}/g, '？').replace(/…。/g, '…');
  }
  t = trimEdgePunctuation(t);
  if (MAY_HAVE_BRACKET.test(t)) t = trimEdgePunctuation(balanceBrackets(t));
  return t.trim();
}

/** 表示名の候補（長い順）。事例名・運営者名・人物名。未確認の値は使わない。 */
export function entityNames(entity: { name?: unknown; legalEntity?: unknown; founder?: unknown; profileSubject?: unknown }): string[] {
  const out = new Set<string>();
  for (const value of [entity.name, entity.legalEntity, entity.founder, entity.profileSubject]) {
    if (typeof value !== 'string') continue;
    const t = value.trim();
    if (!t || /^UNKNOWN/i.test(t) || /未確認|不明|非公開/.test(t)) continue;
    out.add(t);
    const base = t.replace(/\s*[（(][^（）()]*[)）]\s*$/, '').trim();
    if (base) out.add(base);
  }
  return [...out].filter((n) => n.length >= 2).sort((a, b) => b.length - a.length);
}

let stuffingNames = '';
let stuffingPattern: RegExp | null = null;

/** 「XのX式」「【Xの攻略判定】」のような名前の連呼を1回にする。 */
export function dropNameStuffing(text: string, names: readonly string[]): string {
  let t = text.includes('攻略判定') ? text.replace(/【[^】]{0,60}の攻略判定】\s*/g, '') : text;
  if (names.length === 0) return t;
  const key = names.join('\u0000');
  if (key !== stuffingNames) {
    // 同じ事例の欄を続けて処理するので、直前の事例の正規表現を使い回す
    stuffingNames = key;
    stuffingPattern = new RegExp(`(${names.map(escapeRegExp).join('|')})(?:の|型の|式の|専用の)\\1`, 'g');
  }
  if (stuffingPattern && names.some((name) => t.includes(name))) t = t.replace(stuffingPattern, '$1');
  return t;
}

/** 数値欄と重なる先頭の【月商150万円】などを外す（数値そのものは別欄で出す）。 */
export function stripMoneyHeadline(text: string): string {
  return text.replace(/^【(?:月商|年商|月収|年収|売上|月間売上|年間売上|MRR|ARR)[^】]{0,30}】\s*/, '');
}

/** 機械翻訳で主語（事例名）が落ちた「を構築したのは…」を「◯◯を構築したのは…」に戻す。 */
export function restoreDroppedSubject(text: string, subject: string | undefined): string {
  if (!subject || !/^[をがはにでとへ](?=[^぀-ゟ])/.test(text)) return text;
  return `${subject}${text}`;
}

// 文の途中で切れた終わり方（「〜し」「〜を」「〜の」など）。「こと」「もの」は完結した名詞として扱う。
const DANGLING_END = /(?:ことで|により|によって|として|および|及び|ながら|つつ|から|まで|より|けれど|けど|し|で|が|を|に|は|(?<!も)の|(?<!こ)と|や|も|へ)$/;

/** 途中で切れた文を、最後の完結した文まで戻すか「…」で抜粋と分かる形にする。短すぎる断片は捨てる。 */
export function repairTruncation(text: string): string {
  const t = text.trim();
  if (!DANGLING_END.test(t)) return t;
  const sentenceEnd = Math.max(t.lastIndexOf('。'), t.lastIndexOf('！'), t.lastIndexOf('？'));
  if (sentenceEnd >= 8) return t.slice(0, sentenceEnd + 1);
  const ellipsis = t.lastIndexOf('…');
  if (ellipsis >= 8) return t.slice(0, ellipsis + 1);
  if (t.length < 12) return '';
  return `${t}…`;
}

/** 固定長で切る代わりに、文や読点の切れ目で切って「…」を付ける。 */
export function clipText(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  const head = t.slice(0, max);
  const sentenceEnd = Math.max(head.lastIndexOf('。'), head.lastIndexOf('！'), head.lastIndexOf('？'));
  if (sentenceEnd >= max * 0.5) return head.slice(0, sentenceEnd + 1);
  const softBreak = Math.max(head.lastIndexOf('、'), head.lastIndexOf('，'), head.lastIndexOf(' '));
  if (softBreak >= max * 0.5) return `${head.slice(0, softBreak).trimEnd()}…`;
  return `${head.trimEnd()}…`;
}

/** 比較用の正規化（空白・句読点・括弧を無視）。 */
export function comparableText(text: string): string {
  return text.replace(/[\s。、，,.!！?？「」『』（）()【】・:：…]/g, '');
}

/** a と b が同じ内容か（片方がもう片方をほぼ丸ごと含む場合も同じとみなす）。 */
export function isSameContent(a: string, b: string): boolean {
  const x = comparableText(a);
  const y = comparableText(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const [shorter, longer] = x.length <= y.length ? [x, y] : [y, x];
  return shorter.length >= 10 && longer.includes(shorter) && shorter.length >= longer.length * 0.8;
}

// ---- 定型文の判定キー（生成スクリプトと実行時で同じ関数を使う） ----

/** 旧生成パイプラインが書いた説明・分析の欄（`[]` は文字列配列）。証拠カード・観測・調査限界は含めない。 */
export const NARRATIVE_TEXT_PATHS = [
  'tagline', 'essence.whatItDoes', 'essence.targetCustomer', 'essence.painRelief',
  'targetPainWallet', 'architecturePattern', 'pipelineStack',
  'strategy.blindspot', 'strategy.moatDescription', 'strategy.secretInsight', 'strategy.incumbentDilemma',
  'strategy.coldOutreachTemplate', 'strategy.initialTraction[]', 'strategy.actionPlaybook[]',
  'lootBlueprint.targetPrey', 'lootBlueprint.structuralFlaw', 'lootBlueprint.stealthEntry', 'lootBlueprint.tollGateSetup',
  'lootBlueprint.executionChecklist[]',
  'opportunityJudgment.verdictLabel', 'opportunityJudgment.oneLineReason', 'opportunityJudgment.demandDelta', 'opportunityJudgment.competitionDelta',
  'pricing.model', 'pricing.pricePoint', 'pricing.psychologicalTrigger', 'acquisition.primaryFunnel', 'acquisition.tactics[]',
  'temporal.eraContext', 'temporal.currentViabilityAnalysis', 'temporal.initialTractionPeriod', 'temporal.viabilityLabel',
  'blindspot', 'moatDescription', 'secretInsight', 'incumbentDilemma', 'description',
] as const;

/** `NARRATIVE_TEXT_PATHS` の1項目が指す文字列を取り出す。 */
export function readTextPath(entity: unknown, path: string): string[] {
  const many = path.endsWith('[]');
  let current: unknown = entity;
  for (const key of (many ? path.slice(0, -2) : path).split('.')) {
    current = current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined;
  }
  if (many) return Array.isArray(current) ? current.filter((item): item is string => typeof item === 'string') : [];
  return typeof current === 'string' ? [current] : [];
}

export const TEMPLATE_SENTENCE_MIN = 6;
export const TEMPLATE_CLAUSE_MIN = 8;

/** 行と文に分ける（句点・感嘆符・疑問符の直後と改行）。 */
export function sentencesOf(text: string): string[] {
  const out: string[] = [];
  let start = 0;
  const push = (end: number) => {
    const sentence = text.slice(start, end).trim();
    if (sentence) out.push(sentence);
  };
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (c === '\n') { push(i); start = i + 1; }
    else if (c === '。' || c === '！' || c === '？' || c === '!' || c === '?') { push(i + 1); start = i + 1; }
  }
  push(text.length);
  return out;
}

/** 事例名を ◯ に置き換え、先頭の番号と空白・文末記号を除いた比較キー。 */
export function templateKey(sentence: string, names: readonly string[]): string {
  let t = sentence;
  for (const name of names) if (t.includes(name)) t = t.split(name).join('◯');
  t = t.replace(/^\s*(?:Step\s*\d+\s*[:：]|#?\d+\s*[.．、:：)）]|[①-⑳])\s*/i, '');
  return t.replace(/\s+/g, '').replace(/[。！？!?]+$/, '');
}

/** キーを読点・括弧・区切り記号で分けた句。 */
export function clausesOf(key: string): string[] {
  return key.split(/[、，,：:「」『』（）()【】・/／×]+/)
    .map((c) => c.replace(/^[。！？!?]+|[。！？!?]+$/g, ''))
    .filter(Boolean);
}

/**
 * 定型句として数える句か（8文字以上でひらがなを含む＝固有名詞や技術名ではなく言い回し）。
 * 「◯を構築したのは」のような事例名つきの短い書き出しは、固有の説明文にも出るので数えない。
 */
export function isPhraseClause(clause: string): boolean {
  if (clause.length < TEMPLATE_CLAUSE_MIN || !/[぀-ゟ]/.test(clause)) return false;
  return !clause.includes('◯') || clause.length >= 12;
}

/** 調査状態を述べる文（未確認・出典・推定など）。定型でも消さない。 */
export const HONESTY_STATEMENT = /未確認|未判定|未実施|未検証|未掲載|非公開|確認|再監査|推定|推計|出典|申告|記事|掲載|報告値|第三者|取り下げ|根拠|保証|裏付け|不明|主張/;
const DATED_FACT = /\d{4}-\d{2}-\d{2}|\d{4}年\d{1,2}月/;

/** 定型判定の対象外にする文（調査状態の説明や、日付付きの出所の記述）。 */
export function isProtectedSentence(sentence: string): boolean {
  return HONESTY_STATEMENT.test(sentence) || DATED_FACT.test(sentence);
}

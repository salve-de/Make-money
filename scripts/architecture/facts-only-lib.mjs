/**
 * 公開前データの「許可リスト方式（出典で裏づけられたものだけを出し、それ以外は全部出さない）」の共通ロジック。
 *
 * 対象: reaudit.narrativeStatus が AI_NARRATIVE_DEMOTED_UNVERIFIED_20260930 のレコード（元がAI作文だったもの）。
 * scripts/reaudit/facts-only-allowlist.ts（取り下げ）と scripts/architecture/check-template-prose.mjs（公開版を守るチェック）が
 * 同じ判定を使う。ここが許可リストの実装場所。
 *
 * 許可リスト（残してよいもの）:
 *  - 身元: id, ticker, name, legalEntity, url, officialUrl, country, sector, scale, caseType, tags, profile*, sourceMetadata, batchId,
 *          reportedMetrics, reaudit.*, unknownsNotes, coverageAudit, screening、スキーマ上の必須欄
 *  - evidenceCards: type=UNKNOWN_AUDIT（開示カード）、または url / sourceUrl（sourceNote が URL だけの場合を含む）を持ち sourceClass が MODEL でないカード
 *  - observationsStream: sourceUrl があり sourceClass が MODEL でないもの、または定型の開示文（機械的再監査…取り下げ）
 *  - observations: 出典URLを含む文、observationsStream の許可済みの文と同じ文、reaudit.supported / unknown と同じ文、定型の開示文
 *  - pnl: revenueLabel / sourceDoc / sourceClass / dataSnapshotPeriod / estimationLogic（出典の帰属・開示の文のみ）だけ。数値は0、各 is*Unconfirmed は true
 *  - 説明欄: "未確認"。tagline / essence.whatItDoes / description は reaudit.supported の「事業内容（記事記載）:」または出典つきの文のみ
 *  - operations: toolStack は出典つき（isCostUnconfirmed かつ出典の帰属文）だけ。teamSize は出典つきの文に同じ人数がある場合だけ
 *  - temporal: foundedYear は出典つきの文に「創業」等とともにある場合だけ。他は未確認の形
 * これ以外（pnl の数値、operations の各数値、pricing、acquisition、meta、exposureAudit、dynamicMoats、lootBlueprint、opportunityJudgment、
 * 出典の無い observations / evidenceCards / timelineEvents、growth、verifiedBadge=true など）は残さない。
 */
import { isExemptSentence, isSourcedObservation, isSupportedSentence } from './template-prose-lib.mjs';

export const DEMOTED_STATUS = 'AI_NARRATIVE_DEMOTED_UNVERIFIED_20260930';
export const UNCONFIRMED = '未確認';
export const BUSINESS_PREFIX = '事業内容（記事記載）:';

export const PNL_NUMERIC_KEYS = ['monthlyRevenue', 'cogs', 'grossProfit', 'grossMargin', 'operatingProfit', 'operatingMargin', 'estimatedAnnualNetProfit'];
export const PNL_FLAG_KEYS = [
  'isRevenueUnconfirmed', 'isOperatingProfitUnconfirmed', 'isMarginUnconfirmed', 'isGrossProfitUnconfirmed',
  'isGrossMarginUnconfirmed', 'isCogsUnconfirmed', 'isCostsUnconfirmed', 'isNetProfitUnconfirmed',
];
export const PNL_OPEX_KEYS = ['serverAndApi', 'advertising', 'subcontracting', 'toolsAndSaaS', 'other'];
export const PNL_KEEP_TEXT_KEYS = ['revenueLabel', 'sourceDoc', 'sourceClass', 'dataSnapshotPeriod', 'estimationLogic'];
export const PNL_ALLOWED_KEYS = new Set([
  ...PNL_NUMERIC_KEYS, 'operatingExpenses', ...PNL_FLAG_KEYS, 'financialStatus', ...PNL_KEEP_TEXT_KEYS, 'evidenceLocator',
]);

/** 削除（退避）して持たない最上位の欄。スキーマ上は任意。 */
export const WITHDRAWN_TOP_KEYS = ['lootBlueprint', 'opportunityJudgment', 'pricing', 'acquisition', 'meta', 'exposureAudit', 'dynamicMoats'];
export const TOP_TEXT_KEYS = ['architecturePattern', 'pipelineStack', 'targetPainWallet', 'moatDescription', 'incumbentDilemma', 'blindspot', 'secretInsight'];
export const STRATEGY_TEXT_KEYS = ['moatDescription', 'blindspot', 'secretInsight', 'incumbentDilemma'];

// 未確認の形の temporal（honest-rebuild.ts と同じ文言）
export const TEMPORAL_UNKNOWN = {
  foundedYear: 0,
  initialTractionPeriod: '未確認',
  dataSnapshotPeriod: '未確認',
  viabilityStatus: 'UNKNOWN',
  viabilityLabel: '現時点の事業継続・再現性は未確認',
  eraContext: '未確認',
  currentViabilityAnalysis: '未確認',
};

export const DISCLOSURE_RE = /機械的再監査.*取り下げ|取り下げ.*機械的再監査/;

const rec = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const IH_LISTING_QUOTE = 'Indie Hackersの掲載説明は';
const isStr = (v) => typeof v === 'string' && v.trim().length > 0;

export const isDemoted = (e) => e?.reaudit?.narrativeStatus === DEMOTED_STATUS;

/** reaudit.supported の「事業内容（記事記載）:」の本文（出典つきの事業内容）。 */
export function businessText(e) {
  const supported = rec(e.reaudit).supported;
  const line = (Array.isArray(supported) ? supported : []).find((s) => typeof s === 'string' && s.startsWith(BUSINESS_PREFIX));
  const body = line ? line.slice(BUSINESS_PREFIX.length).trim() : '';
  return body || null;
}

const bareUrl = (s) => isStr(s) && /^\s*https?:\/\/\S+(\s+https?:\/\/\S+)*\s*$/.test(s);

export function isAllowedCard(c) {
  if (!c) return false;
  if (c.type === 'UNKNOWN_AUDIT') return true;
  if (c.sourceClass === 'MODEL') return false;
  return Boolean(c.url || c.sourceUrl || bareUrl(c.sourceNote));
}

export function isAllowedStreamItem(o) {
  if (!o || typeof o.text !== 'string') return false;
  if (DISCLOSURE_RE.test(o.text)) return true;
  return Boolean(o.sourceUrl) && o.sourceClass !== 'MODEL';
}

/** 出典つきの文の一覧（説明欄・人数・創業年の裏づけに使う）: 許可済みの観測ストリーム、reaudit.supported、許可済みカード、reportedMetrics。 */
export function sourcedTexts(e) {
  const out = [];
  for (const o of Array.isArray(e.observationsStream) ? e.observationsStream : []) if (isAllowedStreamItem(o)) out.push(o.text);
  for (const s of Array.isArray(rec(e.reaudit).supported) ? e.reaudit.supported : []) if (typeof s === 'string') out.push(s);
  for (const c of Array.isArray(e.evidenceCards) ? e.evidenceCards : []) {
    if (!isAllowedCard(c)) continue;
    for (const f of [c.title, c.punchline, c.snippet]) if (typeof f === 'string') out.push(f);
    if (Array.isArray(c.details)) for (const d of c.details) if (typeof d === 'string') out.push(d);
  }
  for (const m of Array.isArray(e.reportedMetrics) ? e.reportedMetrics : []) if (m && typeof m.context === 'string') out.push(m.context);
  return out;
}

export function isAllowedObservation(text, e, allowedStreamTexts) {
  if (typeof text !== 'string') return false;
  if (/^(eBiz Factsプロフィール記事|記事更新日|記事要約)/.test(text)) return true;
  if (allowedStreamTexts.has(text) || DISCLOSURE_RE.test(text) || /https?:\/\//.test(text) || text.startsWith(IH_LISTING_QUOTE)) return true;
  // 出典の帰属・未確認・取得結果を述べる定型文（【…】の見出し付き作文は除く）
  if (isSourcedObservation(text)) return true;
  const reaudit = rec(e.reaudit);
  for (const list of [reaudit.supported, reaudit.unknown, e.unknownsNotes]) {
    if (Array.isArray(list) && list.includes(text)) return true;
  }
  return false;
}

/** 説明欄（tagline / description / essence.whatItDoes）に残してよい値か。 */
export function isAllowedDescription(value, e) {
  if (!isStr(value)) return true;
  // eBiz Facts の記事だけを入力にした再監査レーン（reaudit.lane=ebiz）が、保存済み原文から書いた要約
  if (rec(e.reaudit).lane === 'ebiz' && e.sourceMetadata) return true;
  // Indie Hackers の掲載説明（出典ページの自己紹介）を観測として引用しているレコードは、その訳文を説明欄に持つ
  if ((Array.isArray(e.observations) ? e.observations : []).some((o) => typeof o === 'string' && o.startsWith(IH_LISTING_QUOTE))) return true;
  if (value === UNCONFIRMED) return true;
  if (value === businessText(e)) return true;
  if (isExemptSentence(value)) return true;
  if (isSupportedSentence(value, e)) return true;
  // 出典のページ本文・掲載データ（sourceMetadata / rawEvidence）にそのまま含まれる文
  const raw = JSON.stringify([e.sourceMetadata ?? null, rec(e.reaudit).rawEvidence ?? null]);
  return value.length >= 12 && raw.includes(value);
}

/** SEC / EDGAR の開示から機械的に作った売上表記（「SEC 10-K FY2025: Revenue $… （期間 …）」）。 */
const SEC_LABEL_RE = /^(SEC\s+(10-K|10-Q|20-F|40-F)|EDGAR)\b/;
/** 上場企業の開示（SEC / EDINET 等）を根拠に書いた推計式か（開示書類のURLが sourceDoc にあり、式が開示に言及している）。 */
const FILING_HOST_RE = /^https?:\/\//i;
const FILING_LOGIC_RE = /開示していない|SEC開示|SEC\s?10-K|EDGAR|有価証券報告書|決算短信|(売上|Revenue)[^。]{0,12}[0-9][0-9,.]*\s?(百万|億|兆|million|billion)/i;
export function isFilingBackedPnl(pnl) {
  const p = rec(pnl);
  return isStr(p.sourceDoc) && FILING_HOST_RE.test(p.sourceDoc) && isStr(p.estimationLogic) && FILING_LOGIC_RE.test(p.estimationLogic);
}
const PLAIN_MONEY_LABEL_RE = /^[¥$€]?\s?[0-9][0-9,.]*\s?(兆|億|万|千)?\s?(円|ドル|USD|JPY)?$/;
/** 開示書類の年間売上を12で割った月平均の表記（「月平均 約2.69兆円（FY2026 年間売上 $215.9B を12で割って円換算）」）。 */
const MONTHLY_AVERAGE_LABEL_RE = /^月平均 約[^（）]+（[^（）]*年間売上[^（）]*12で割[^（）]*）$/;
/** 出典欄に残してよい値か。URL か、出典が無いことを述べる開示文だけ。URLの無い出典名（「〇〇公式 決算公表」など）は裏づけにならない。 */
export const NO_SOURCE_DOC = '出典未記録';
export function isAllowedSourceDoc(doc) {
  if (!isStr(doc)) return true;
  return /^https?:\/\//i.test(doc.trim()) || isExemptSentence(doc);
}
/** 幅・ピーク値の元表記。出典URLがある時だけ出典の記載として見せる。 */
export const PEAK_LABEL_PREFIX = '出典記載（幅・ピーク値。月商としては未確認）:';
export function isAllowedRevenueLabel(label, pnl) {
  if (!isStr(label)) return true;
  if (label.startsWith(PEAK_LABEL_PREFIX)) return isStr(rec(pnl).sourceDoc) && /^https?:\/\//i.test(rec(pnl).sourceDoc.trim());
  return isExemptSentence(label) || SEC_LABEL_RE.test(label) || (isFilingBackedPnl(pnl) && (PLAIN_MONEY_LABEL_RE.test(label.trim()) || MONTHLY_AVERAGE_LABEL_RE.test(label.trim())));
}

export function isAllowedEstimationLogic(text, pnl) {
  if (!isStr(text)) return true;
  return isExemptSentence(text) || SEC_LABEL_RE.test(text) || isFilingBackedPnl(pnl);
}

/** primaryChannels の各値が、出典つきの文にそのまま書かれているか。 */
export function isChannelSourced(channel, e) {
  if (!isStr(channel)) return false;
  const texts = sourcedTexts(e);
  // eBiz Facts の再監査は集客経路を「集客経路（記事記載）: …」として出典つきで記録し、そこから経路名を入れている
  const hasChannelLine = (Array.isArray(rec(e.reaudit).supported) ? e.reaudit.supported : []).some((l) => typeof l === 'string' && l.startsWith('集客経路（記事記載）'));
  return hasChannelLine || texts.some((t) => t.includes(channel));
}

export function isAllowedToolEntry(t) {
  return Boolean(t && t.isCostUnconfirmed === true && t.monthlyCost === 0 && isStr(t.purpose) && isExemptSentence(t.purpose) && !t.replacementDifficulty);
}

const numToken = (n) => [String(n), n.toLocaleString('en-US')];
/** teamSize が、出典つきの文に「従業員/チーム…」とともに書かれている人数か。 */
export function isTeamSizeSourced(n, e) {
  if (typeof n !== 'number' || n <= 0) return false;
  const tokens = numToken(n);
  return sourcedTexts(e).some((t) => /従業員|社員|スタッフ|チーム|employees|headcount|staff|人/i.test(t)
    && tokens.some((tok) => new RegExp(`(^|[^0-9,.])${tok.replace(/[,.]/g, '\\$&')}(?![0-9,]|\\.[0-9])`).test(t)));
}

/** foundedYear が、出典つきの文に創業・設立などとともに書かれている年か。 */
export function isFoundedYearSourced(year, e) {
  if (typeof year !== 'number' || year < 1000) return false;
  return sourcedTexts(e).some((t) => t.includes(String(year)) && /創業|設立|創立|起源|founded|launched|ローンチ|公開|開始/i.test(t));
}

/** 幅の上限・ピーク値を月商として使っていないかの判定材料（claimBindings の targetText / estimationLogic / revenueLabel）。 */
export const PEAK_OR_RANGE_RE = /ピーク|最盛期|最高|最大|上限|peak|[0-9][0-9,.]*\s*(?:k|K|万|億|ドル|円|USD|\$)?\s*(?:〜|～|~|–|—)\s*\$?[0-9]/;
export function revenueEvidenceTexts(e) {
  const out = [];
  for (const b of Array.isArray(e.claimBindings) ? e.claimBindings : []) {
    if (b && b.claimKey === 'pnl.monthlyRevenue' && typeof b.locator?.targetText === 'string') out.push(b.locator.targetText);
  }
  const p = rec(e.pnl);
  for (const f of [p.estimationLogic, p.revenueLabel]) if (typeof f === 'string') out.push(f);
  return out;
}

// ---- B: 全レコード共通の機械的な誤り ----

/** B1: 運営指標の型どおりの値（週20時間・初期資本100000・自動化85・初期人数1 のうち2つ以上が同時に出る）。 */
export function operationsTemplateHits(ops) {
  const o = rec(ops);
  const hits = [];
  if (o.weeklyHours === 20) hits.push('weeklyHours=20');
  if (o.initialCapitalRequired === 100000) hits.push('initialCapitalRequired=100000');
  if (o.automationLevel === 85) hits.push('automationLevel=85');
  if (o.initialTeamSize === 1) hits.push('initialTeamSize=1');
  return hits;
}
export const isOperationsTemplate = (ops) => operationsTemplateHits(ops).length >= 2;

/** B2: COGS が未確認（または0）なのに、粗利＝売上・粗利率100% と表示している。 */
export function isGrossMargin100(pnl) {
  const p = rec(pnl);
  if (p.isGrossMarginUnconfirmed === true && p.isGrossProfitUnconfirmed === true) return false;
  const cogsUnknown = p.isCogsUnconfirmed === true || p.cogs === 0 || p.cogs === undefined;
  const shown = p.isGrossMarginUnconfirmed !== true && p.grossMargin === 100;
  const gpEqRev = p.isGrossProfitUnconfirmed !== true && typeof p.monthlyRevenue === 'number' && p.monthlyRevenue > 0 && p.grossProfit === p.monthlyRevenue;
  return cogsUnknown && (shown || gpEqRev);
}

/** B3: 月商が確定値として表示されているのに、根拠の文が幅の上限・ピーク値。 */
export function isRevenuePeakOrRange(e) {
  const p = rec(e.pnl);
  if (p.isRevenueUnconfirmed === true || !(typeof p.monthlyRevenue === 'number' && p.monthlyRevenue > 0)) return false;
  return revenueEvidenceTexts(e).some((t) => PEAK_OR_RANGE_RE.test(t));
}

const TITLE_RE = /代表取締役|取締役|社長|会長|CEO|COO|CFO|最高経営責任者|代表|President|Chairman|Chief Executive|Managing Director/i;
const FOUNDING_RE = /創業|創立|創設|設立|founder|co-?found|founded|創始/i;
/** B4: founder が現職の肩書だけで、「創業」の語が無い。 */
export function isFounderTitleOnly(founder) {
  return isStr(founder) && founder !== UNCONFIRMED && TITLE_RE.test(founder) && !FOUNDING_RE.test(founder);
}

// ---- A: 許可リスト違反の検出 ----

const nonZeroNumber = (v) => typeof v === 'number' && v !== 0;

/** DEMOTED のレコードに許可リスト外の値が残っていれば {field, detail}[] を返す。 */
export function findAllowlistViolations(e) {
  const v = [];
  const add = (field, detail) => v.push({ field, detail: String(detail).slice(0, 80) });
  if (!isDemoted(e)) return v;

  const p = rec(e.pnl);
  for (const k of Object.keys(p)) if (!PNL_ALLOWED_KEYS.has(k)) add(`pnl.${k}`, 'not in allow-list');
  for (const k of PNL_NUMERIC_KEYS) if (nonZeroNumber(p[k])) add(`pnl.${k}`, p[k]);
  for (const [k, val] of Object.entries(rec(p.operatingExpenses))) if (nonZeroNumber(val)) add(`pnl.operatingExpenses.${k}`, val);
  for (const k of PNL_FLAG_KEYS) if (p[k] !== true) add(`pnl.${k}`, 'must be true');
  if (!isAllowedRevenueLabel(p.revenueLabel, p)) add('pnl.revenueLabel', p.revenueLabel);
  if (!isAllowedSourceDoc(p.sourceDoc)) add('pnl.sourceDoc', p.sourceDoc);
  if (!isAllowedEstimationLogic(p.estimationLogic, p)) add('pnl.estimationLogic', p.estimationLogic);

  const ops = rec(e.operations);
  for (const k of ['weeklyHours', 'initialCapitalRequired', 'automationLevel']) if (nonZeroNumber(ops[k])) add(`operations.${k}`, ops[k]);
  for (const k of ['teamSize', 'currentTeamSize']) {
    if (nonZeroNumber(ops[k]) && !isTeamSizeSourced(ops[k], e)) add(`operations.${k}`, ops[k]);
  }
  if (nonZeroNumber(ops.initialTeamSize)) add('operations.initialTeamSize', ops.initialTeamSize);
  for (const c of Array.isArray(ops.primaryChannels) ? ops.primaryChannels : []) if (!isChannelSourced(c, e)) add('operations.primaryChannels', c);
  for (const t of Array.isArray(ops.toolStack) ? ops.toolStack : []) if (!isAllowedToolEntry(t)) add('operations.toolStack', t?.name);
  for (const flag of ['isWeeklyHoursUnconfirmed', 'isCapitalUnconfirmed', 'isAutomationUnconfirmed']) {
    if (ops[flag] !== true) add(`operations.${flag}`, 'must be true');
  }
  if (nonZeroNumber(ops.teamSize) === false && ops.isTeamSizeUnconfirmed !== true) add('operations.isTeamSizeUnconfirmed', 'must be true when teamSize is 0');
  if (isOperationsTemplate(ops)) add('operations(template)', operationsTemplateHits(ops).join(','));

  for (const k of WITHDRAWN_TOP_KEYS) if (e[k] !== undefined) add(k, 'must be withdrawn');
  for (const k of TOP_TEXT_KEYS) if (e[k] !== undefined && e[k] !== UNCONFIRMED) add(k, e[k]);
  for (const k of ['tagline', 'description']) if (!isAllowedDescription(e[k], e)) add(k, e[k]);
  const essence = rec(e.essence);
  if (!isAllowedDescription(essence.whatItDoes, e)) add('essence.whatItDoes', essence.whatItDoes);
  for (const k of ['targetCustomer', 'painRelief']) if (isStr(essence[k]) && essence[k] !== UNCONFIRMED) add(`essence.${k}`, essence[k]);
  const st = rec(e.strategy);
  for (const k of STRATEGY_TEXT_KEYS) if (st[k] !== undefined && st[k] !== UNCONFIRMED) add(`strategy.${k}`, st[k]);
  if (st.moatType !== undefined && st.moatType !== 'UNKNOWN') add('strategy.moatType', st.moatType);
  for (const k of ['initialTraction', 'actionPlaybook']) if (Array.isArray(st[k]) && st[k].length) add(`strategy.${k}`, st[k][0]);
  if (isStr(st.coldOutreachTemplate)) add('strategy.coldOutreachTemplate', st.coldOutreachTemplate);

  for (const c of Array.isArray(e.evidenceCards) ? e.evidenceCards : []) if (!isAllowedCard(c)) add('evidenceCards', `${c?.type}:${c?.title}`);
  for (const o of Array.isArray(e.observationsStream) ? e.observationsStream : []) if (!isAllowedStreamItem(o)) add('observationsStream', o?.text);
  const allowedStream = new Set((Array.isArray(e.observationsStream) ? e.observationsStream : []).filter(isAllowedStreamItem).map((o) => o.text));
  for (const o of Array.isArray(e.observations) ? e.observations : []) if (!isAllowedObservation(o, e, allowedStream)) add('observations', o);
  for (const t of Array.isArray(e.timelineEvents) ? e.timelineEvents : []) if (!isAllowedTimelineEvent(t)) add('timelineEvents', t?.description);

  const tp = rec(e.temporal);
  if (e.temporal) {
    for (const k of ['initialTractionPeriod', 'viabilityStatus', 'viabilityLabel', 'eraContext', 'currentViabilityAnalysis']) {
      if (tp[k] !== TEMPORAL_UNKNOWN[k]) add(`temporal.${k}`, tp[k]);
    }
    if (nonZeroNumber(tp.foundedYear) && !isFoundedYearSourced(tp.foundedYear, e)) add('temporal.foundedYear', tp.foundedYear);
  }

  if (e.isGrowthUnconfirmed !== true || nonZeroNumber(e.growthRateYoY)) add('growthRateYoY', e.growthRateYoY);
  if (e.verifiedBadge === true) add('verifiedBadge', true);
  if (Array.isArray(e.claimBindings) && e.claimBindings.some((b) => typeof b?.claimKey === 'string' && b.claimKey.startsWith('pnl.'))) add('claimBindings', 'pnl.* binding must be retired');
  return v;
}

/** 監査ログ形式の年表項目（LAUNCH_REPORTED / OFFICIAL_URL_CHECK 等の全大文字の種別）か、sourceUrl を持つ項目だけ許可。 */
export function isAllowedTimelineEvent(t) {
  if (!t) return false;
  if (t.sourceUrl) return true;
  return typeof t.eventType === 'string' && /^[A-Z][A-Z_]+$/.test(t.eventType);
}

/** チェック用: 全レコードの許可リスト違反（A）と B1〜B4 を集計して返す。 */
export function findFactsOnlyViolations(entities) {
  const groups = new Map();
  const bump = (key, label, id) => {
    const g = groups.get(key) ?? { label, ids: [] };
    g.ids.push(id);
    groups.set(key, g);
  };
  for (const e of entities) {
    for (const x of findAllowlistViolations(e)) bump(`A:${x.field}`, `許可リスト外(${x.field})`, e.id);
    if (isOperationsTemplate(e.operations)) bump('B1', `B1 運営指標の型(${operationsTemplateHits(e.operations).join(',')})`, e.id);
    if (isGrossMargin100(e.pnl)) bump('B2', 'B2 COGS未確認なのに粗利率100%', e.id);
    if (isRevenuePeakOrRange(e)) bump('B3', 'B3 幅の上限/ピークを月商にしている', e.id);
    if (isFounderTitleOnly(e.founder)) bump('B4', 'B4 founder が現職の肩書だけ', e.id);
  }
  return [...groups.entries()].map(([key, g]) => ({ key, label: g.label, count: g.ids.length, sample: g.ids.slice(0, 3) })).sort((a, b) => b.count - a.count);
}

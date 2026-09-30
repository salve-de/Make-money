/**
 * entity → ReaderCase（画面が読む唯一の中身）への変換。純粋関数。
 *
 * 取り込む元: observationsStream（出典URLつき）、reaudit.supported、observations、reportedMetrics。
 * 取り込まない: 概要・タグライン・essence・判定規則・調査の作業メモ（自由文）。
 * 数値は reportedMetrics と、決まった形の文（IHの収益欄、年次の報告値）から機械で作る。
 */
import type { ReaderCase } from '@/shared/reader-case';
import { FACT_KINDS, MEASURES, ReaderCaseSchema } from '@/shared/reader-case';
import { SourceTable, attributionFor, extractUrls, hostOf } from '../../../scripts/reader-case/bind-sources';
import { bigramDice, classifySentences, dedupeKey, type Sentence } from '../../../scripts/reader-case/split-sentences';
import { parseFinancialLine, parseIhRevenue, type MetricHint } from '../../../scripts/reader-case/metric-lines';
import { LABEL_DRIVEN_UNITS, measureFromLabel, unitSpecFor, type Measure } from '../../../scripts/reader-case/unit-map';

type Rec = Record<string, unknown>;
type Fact = ReaderCase['facts'][number];
type Metric = ReaderCase['metrics'][number];

export interface ProjectionStats {
  processDropped: number;
  absenceDropped: number;
  metricLineDropped: number;
  pointerDropped: number;
  duplicateDropped: number;
  tooLongDropped: number;
  invalidFactDropped: number;
  metricSkipped: number;
  unsupportedTeamDropped: number;
}

export interface UnboundLine {
  entityId: string;
  text: string;
  reason: string;
}

export interface ReviewItem {
  entityId: string;
  kind: string;
  text: string;
}

export interface ProjectionResult {
  reader: ReaderCase;
  stats: ProjectionStats;
  unbound: UnboundLine[];
  review: ReviewItem[];
}

const ISO = /^\d{4}-\d{2}(-\d{2})?$/;
const iso = (v: unknown): string | undefined => (typeof v === 'string' && ISO.test(v.slice(0, 10)) ? (ISO.test(v) ? v : v.slice(0, 10)) : undefined);
const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v : undefined);
const arr = (v: unknown): Rec[] => (Array.isArray(v) ? (v.filter((x) => x && typeof x === 'object') as Rec[]) : []);
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

const MAX_FACT = 400;

/** 事実を含まない、記事そのものの案内文 */
const ARTICLE_META = /^eBiz Factsが(?:プロフィール)?記事[「『]/;

function metricKey(m: Pick<Metric, 'measure' | 'periodKind' | 'period' | 'amount' | 'currency' | 'unit' | 'label'>): string {
  return [m.measure, m.periodKind, m.period, m.amount, m.currency ?? '', m.unit ?? '', m.label ?? ''].join('|');
}

const SCALE: Record<string, number> = { thousand: 1e3, million: 1e6, '100million': 1e8, billion: 1e9 };

/** 同じ種類・期間で金額が違う数字を見分けるための、文脈の先頭の言い回し */
const SEGMENT = new WeakMap<object, string>();

function firstSegment(context: string | undefined): string | undefined {
  if (!context || !context.includes('／')) return undefined;
  const seg = context.split('／')[0]!.trim();
  return seg && seg.length <= 60 && !/。/.test(seg) ? seg : undefined;
}

function originOf(m: Rec, spec: { measure: Measure }, isFilingSource: boolean): Metric['origin'] {
  const text = `${str(m.context) ?? ''} ${str(m.original) ?? ''} ${str(m.verification) ?? ''} ${str(m.attribution) ?? ''}`;
  const source = `${str(m.source) ?? ''}`;
  if (m.form || m.taxonomyTag || isFilingSource || /sec-companyfacts|SEC companyfacts|annual-report|年次開示|決算|10-K|20-F|登記簿|public-registry|dated-primary/i.test(`${source} ${str(m.attribution) ?? ''}`)) {
    return 'FILED';
  }
  if (/推計値|推定値|見込み|estimated/i.test(`${str(m.original) ?? ''} ${str(m.unit) ?? ''}`) && !/推計なし|換算なし|逆算しない/.test(text)) return 'ESTIMATED';
  if (/estimated|estimate|推計|推定|Sensor ?Tower|Similarweb/i.test(text) && !/推計なし|換算なし|逆算しない/.test(text)) return 'THIRD_PARTY';
  if (/第三者の報告/.test(text) || /platform-verified/.test(source)) return 'THIRD_PARTY';
  if (/ebizfacts-article/.test(source) && !/本人申告/.test(text)) return 'ARTICLE';
  if (/ebizfacts-article/.test(source)) return /第三者/.test(text) ? 'THIRD_PARTY' : 'ARTICLE';
  void spec;
  return 'SELF_REPORTED';
}

function basisOf(m: Rec): string | undefined {
  const text = `${str(m.context) ?? ''} ${str(m.original) ?? ''} ${str(m.unitLabel) ?? ''}`;
  const verification = str(m.verification) ?? '';
  const parts: string[] = [];
  if (/継続事業/.test(text)) parts.push('継続事業ベース');
  if (/非支配持分を含む/.test(text)) parts.push('非支配持分を含む');
  if (/親会社(?:株主|の所有者)?に帰属/.test(text)) parts.push('親会社株主に帰属');
  if (/連結/.test(text) && !parts.length) parts.push('連結');
  if (/Stripe連携で検証済み/.test(verification)) parts.push('IHがStripe連携で検証済みと表示');
  if (m.comparison === 'greater-than') parts.push('表記は「超」（下限）');
  if (m.precision === 'approximate') parts.push('概数');
  return parts.length ? parts.join('・') : undefined;
}

function toMetric(m: Rec, table: SourceTable, entityAuditDate: string | undefined): { metric?: Omit<Metric, 'id'>; skip?: string; unboundText?: string } {
  const unit = str(m.unit);
  if (!unit) return { skip: 'no-unit' };
  const spec = unitSpecFor(unit); // 対応の無い unit は例外
  if (spec.skipReason) return { skip: spec.skipReason };
  let measure: Measure = spec.measure;
  if (LABEL_DRIVEN_UNITS.has(unit)) {
    const got = measureFromLabel(`${str(m.unitLabel) ?? ''} ${str(m.original) ?? ''}`);
    if (!got) return { skip: 'label-driven-unit-without-measure' };
    measure = got;
  }
  if (typeof m.amount !== 'number' || !Number.isFinite(m.amount)) return { skip: 'no-amount' };
  let amount = m.amount;
  const scale = typeof m.scale === 'string' ? SCALE[m.scale] : undefined;
  if (scale) amount = Math.round(amount * scale * 1000) / 1000;
  else {
    // scale が無いのに単位ラベルが「（百万円）」「（千ドル）」の行は、数が単位の倍数のまま入っている
    const ul = str(m.unitLabel) ?? '';
    if (/百万/.test(ul) && Math.abs(amount) < 1e5) amount = Math.round(amount * 1e6 * 1000) / 1000;
    else if (/[（(]千[円ドル]/.test(ul) && Math.abs(amount) < 1e6) amount = Math.round(amount * 1e3 * 1000) / 1000;
  }
  const currencyRaw = str(m.currency);
  const currencyM = currencyRaw?.match(/^([A-Z]{3})/);
  const currency = currencyM && !['N/A', 'NON', 'UNK', 'NUL'].includes(currencyM[1]!) && currencyRaw !== 'NONE' && currencyRaw !== 'UNKNOWN' ? currencyM[1] : undefined;
  if (!spec.quantity && !currency) return { skip: 'no-currency' };
  if (spec.quantity && currencyRaw === 'PERCENT' && spec.quantityUnit !== '%') return { skip: 'percent-unit-mismatch' };

  const ctx = str(m.context);
  const seg0 = firstSegment(ctx);
  const date = iso(m.statedAt) ?? iso(m.statedOn) ?? iso(m.checkedAt) ?? entityAuditDate;
  const pRaw = str(m.period)?.trim();
  const p = pRaw && pRaw.length <= 80 && !/。/.test(pRaw) ? pRaw : undefined;
  const endM = ctx?.match(/(?:(\d+週)・)?(\d{4}-\d{2}-\d{2})終了/);
  const ctxPeriod = endM ? `${endM[1] ? `${endM[1]}・` : ''}${endM[2]}終了` : undefined;
  // 文脈の先頭が「対象・期間」の形（例: 「Spinformationのライセンス収入・四半期ごと」）なら、期間の言い回しを写す
  const segParts = seg0 ? seg0.split('・') : [];
  const segTail = segParts.slice(1).join('・');
  let hintKind: Metric['periodKind'] | undefined;
  let hintPeriod: string | undefined;
  if (segTail) {
    if (/四半期/.test(segTail)) [hintKind, hintPeriod] = ['QUARTER', '四半期ごと'];
    else if (/期間の明示なし/.test(segTail)) [hintKind, hintPeriod] = ['POINT', '期間の明示なし'];
    else if (/月次|毎月|月間/.test(segTail)) [hintKind, hintPeriod] = ['MONTH', '月'];
    else if (/年間|年次|毎年/.test(segTail)) [hintKind, hintPeriod] = ['YEAR', '年'];
  }
  let period = p ?? (spec.periodKind === 'POINT' || spec.measure === 'OTHER' ? hintPeriod : undefined) ?? ctxPeriod ?? spec.defaultPeriod;
  if (!period && spec.periodKind !== 'POINT' && seg0) period = seg0;
  if (!period) period = date ? `${date} 時点` : undefined;
  if (!period) return { skip: 'no-period' };

  let label = spec.label;
  if ((unit === 'MONTHLY_INCOME' || unit === 'ANNUAL_INCOME') && seg0 && /手取り|利益|手元/.test(seg0)) {
    measure = 'PROFIT';
    label = undefined;
  }
  if (!label && seg0 && ['PRICE', 'COST', 'OTHER', 'EXIT_VALUE', 'FUNDING', 'PROFIT', 'REVENUE'].includes(measure) && !(p ?? spec.defaultPeriod)) label = undefined;
  if (measure === 'OTHER' && label === '金額') label = undefined; // 「金額」だけでは何の額か分からない
  if (!label && seg0 && ['PRICE', 'COST', 'OTHER', 'EXIT_VALUE', 'FUNDING'].includes(measure)) label = segParts[0] || seg0;
  if (!label && measure === 'OTHER') label = str(m.unitLabel);
  if (measure === 'OTHER' && !label) return { skip: 'other-without-label' };
  if (!label && LABEL_DRIVEN_UNITS.has(unit) === false && str(m.unitLabel) && ['COST'].includes(measure)) label = str(m.unitLabel);
  if (label && label.length > 60) label = label.slice(0, 60);

  const url = str(m.url) ?? str(m.sourceUrl);
  let src = url ? table.use(url) : undefined;
  if (!src && str(m.publisher)) src = table.byLabel(str(m.publisher)!);
  if (!src && /ebizfacts/.test(str(m.source) ?? '')) src = table.byLabel('eBiz Facts');
  if (!src) src = table.onlyKnown();
  if (!src) return { skip: 'unbound', unboundText: `${str(m.original) ?? ''} (${unit})` };

  const filing = src.kind === 'FILING';
  let periodKind = spec.periodKind;
  if (hintKind && period === hintPeriod) periodKind = hintKind;
  if (periodKind === 'YEAR' && /FY|期|年度|会計|終了/.test(period)) periodKind = 'FISCAL_YEAR';
  let basis = basisOf(m);
  const ul = str(m.unitLabel);
  const ctxBasis = ctx?.match(/終了・(総収益|純売上高|売上高|売上収益)・/)?.[1];
  if (!basis && ctxBasis === '総収益') basis = '総収益（会費収入などを含む）';
  if (['REVENUE', 'OPERATING_INCOME', 'NET_INCOME'].includes(measure) && ul && !/^(?:年次)?(?:売上高?|売上収益|営業利益|純利益|営業収益|純収益)(?:（[^）]*）)?$/.test(ul) && !basis) basis = ul.length <= 40 ? ul : undefined;
  const metric: Omit<Metric, 'id'> = {
    measure,
    periodKind,
    period,
    amount,
    ...(spec.quantity ? { unit: spec.quantityUnit } : currency ? { currency } : {}),
    origin: originOf(m, { measure }, filing),
    ...(basis ? { basis } : {}),
    ...(label ? { label } : {}),
    sourceId: src.id,
    ...((iso(m.statedAt) ?? iso(m.statedOn)) ? { statedAt: iso(m.statedAt) ?? iso(m.statedOn) } : {}),
  };
  if (spec.quantity && currency === undefined && !metric.unit) return { skip: 'no-unit-for-quantity' };
  if (seg0) SEGMENT.set(metric, seg0);
  return { metric };
}

interface Candidate {
  text: string;
  url?: string;
  from: 'stream' | 'supported' | 'observations';
  category?: string;
  sourceClass?: string;
}

const EBIZ_SECTION = /^(事業内容|開始時期|チーム・稼働|ツール|集客|価格|プラン|サービス内容|創業者|規模)(?:[（(][^）)]*[）)])?[:：]/;

export function projectReaderCase(entity: Rec): ProjectionResult {
  const entityId = String(entity.id);
  const stats: ProjectionStats = {
    processDropped: 0,
    absenceDropped: 0,
    metricLineDropped: 0,
    pointerDropped: 0,
    duplicateDropped: 0,
    tooLongDropped: 0,
    invalidFactDropped: 0,
    metricSkipped: 0,
    unsupportedTeamDropped: 0,
  };
  const unbound: UnboundLine[] = [];
  const review: ReviewItem[] = [];
  const reaudit = (entity.reaudit ?? {}) as Rec;
  const auditDate = iso(reaudit.auditDate);
  const table = new SourceTable(str(entity.url));

  // ---- 出典の手がかり ----
  for (const s of arr(reaudit.sources)) {
    table.learn({
      url: str(s.url),
      publisher: str(s.publisher),
      publishedAt: iso(s.publicationDate),
      checkedAt: iso(s.checkedAt),
      sourceType: str(s.sourceType),
      rightsTier: str(s.rightsTier),
    });
  }
  for (const c of arr(entity.evidenceCards)) {
    const title = str(c.title);
    table.learn({ url: str(c.url), publisher: title && /^出典[:：]/.test(title) ? title.replace(/^出典[:：]\s*/, '') : undefined });
  }
  const stream = arr(entity.observationsStream);
  for (const o of stream) table.learn({ url: str(o.sourceUrl), sourceClass: str(o.sourceClass), checkedAt: iso(o.observedAt) });
  const rms = arr(entity.reportedMetrics);
  for (const m of rms) {
    table.learn({ url: str(m.url) ?? str(m.sourceUrl), publisher: str(m.publisher), checkedAt: iso(m.checkedAt), publishedAt: iso(m.statedAt) });
  }
  const pnl = (entity.pnl ?? {}) as Rec;
  table.learn({ url: str(pnl.sourceDoc) });

  // ---- 数値（reportedMetrics） ----
  const metrics: Omit<Metric, 'id'>[] = [];
  const metricKeys = new Set<string>();
  const addMetric = (m: Omit<Metric, 'id'>) => {
    const k = metricKey(m);
    if (metricKeys.has(k)) return;
    metricKeys.add(k);
    metrics.push(m);
  };
  for (const raw of rms) {
    const r = toMetric(raw, table, auditDate);
    if (r.metric) addMetric(r.metric);
    else {
      stats.metricSkipped++;
      if (r.unboundText) unbound.push({ entityId, text: r.unboundText, reason: 'metric-unbound' });
      else if (r.skip && !/範囲表記|価格帯|状態の表記|no-amount/.test(r.skip)) review.push({ entityId, kind: `metric-skipped:${r.skip}`, text: `${str(raw.original) ?? ''} (${str(raw.unit) ?? ''})` });
    }
  }

  // 再監査の候補が持つ構造化 metrics（sourceUrl つき）。形の検査は validate-candidates が済ませている
  for (const raw of arr(entity.metrics)) {
    const src = table.use(str(raw.sourceUrl));
    const okMeasure = (MEASURES as readonly string[]).includes(String(raw.measure));
    if (!src || !okMeasure || !str(raw.period) || typeof raw.amount !== 'number') {
      review.push({ entityId, kind: 'candidate-metric-rejected', text: JSON.stringify(raw).slice(0, 200) });
      continue;
    }
    addMetric({
      measure: raw.measure as Metric['measure'],
      periodKind: raw.periodKind as Metric['periodKind'],
      period: String(raw.period),
      amount: raw.amount,
      ...(str(raw.currency) ? { currency: str(raw.currency) } : {}),
      ...(str(raw.unit) ? { unit: str(raw.unit) } : {}),
      origin: (str(raw.origin) as Metric['origin']) ?? 'ARTICLE',
      ...(str(raw.basis) ? { basis: str(raw.basis) } : {}),
      ...(str(raw.label) ? { label: str(raw.label) } : {}),
      sourceId: src.id,
      ...(iso(raw.statedAt) ? { statedAt: iso(raw.statedAt) } : {}),
    });
  }

  // ---- 文（facts） ----
  const candidates: Candidate[] = [];
  for (const o of stream) {
    const text = str(o.text);
    if (!text) continue;
    if (str(o.category) === 'FORUM_RAGE') {
      review.push({ entityId, kind: 'forum-rage-dropped', text: text.slice(0, 200) });
      continue;
    }
    candidates.push({ text, url: str(o.sourceUrl), from: 'stream', category: str(o.category), sourceClass: str(o.sourceClass) });
  }
  for (const t of strs(reaudit.supported)) candidates.push({ text: t, from: 'supported' });
  for (const t of strs(entity.observations)) candidates.push({ text: t, from: 'observations' });

  const facts: Omit<Fact, 'id'>[] = [];
  const seen: string[] = [];
  // 再監査の候補が持つ構造化 facts（sourceUrl つき）。先に入れるので、同じ文の機械分割は重複として落ちる
  for (const raw of arr(entity.facts)) {
    const text = str(raw.text);
    const src = table.use(str(raw.sourceUrl));
    if (!text || !src || text.length > MAX_FACT) {
      review.push({ entityId, kind: 'candidate-fact-rejected', text: JSON.stringify(raw).slice(0, 200) });
      continue;
    }
    seen.push(dedupeKey(text));
    const kind = (FACT_KINDS as readonly string[]).includes(String(raw.kind)) ? (raw.kind as Fact['kind']) : 'OTHER';
    facts.push({ kind, text, sourceId: src.id, ...(iso(raw.statedAt) ? { statedAt: iso(raw.statedAt) } : {}), attribution: attributionFor(src.kind) });
  }
  let lastPeriod: string | undefined;
  for (const cand of candidates) {
    if (ARTICLE_META.test(cand.text.trim())) {
      stats.pointerDropped++;
      continue;
    }
    let sentences: Sentence[] = classifySentences(cand.text);
    // 「金額: …」型はmetricの写し
    sentences = sentences.map((s) => (s.cls === 'fact' && /^金額[:：]/.test(s.text) ? { ...s, cls: 'metric' as const, reason: 'amount-line' } : s));
    for (const s of sentences) {
      if (s.cls === 'process') {
        stats.processDropped++;
        continue;
      }
      if (s.cls === 'absence') {
        stats.absenceDropped++;
        continue;
      }
      if (s.cls === 'pointer') {
        stats.pointerDropped++;
        continue;
      }
      if (s.cls === 'metric') {
        stats.metricLineDropped++;
        if (s.reason === 'money-line') {
          const hint = parseIhRevenue(s.original);
          if (hint) {
            const src = (cand.url ? table.use(cand.url) : undefined) ?? (s.label ? table.byLabel(s.label) : undefined) ?? table.byLabel('Indie Hackers');
            if (src && !metrics.some((m) => m.measure === hint.measure && m.amount === hint.amount && m.currency === hint.currency && m.periodKind === hint.periodKind)) {
              // 記事が第三者の推計を組み合わせた数字は、本人申告ではなく第三者の推計にする
              const estimated = /第三者の推計|推計を組み合わせ|Sensor ?Tower|estimated/i.test(candidates.map((c) => c.text).join('\n'));
              addMetric(hintToMetric(hint, src.id, estimated ? 'THIRD_PARTY' : 'SELF_REPORTED', estimated ? '第三者の推計を組み合わせた記事の数字' : undefined));
            }
          }
        }
        continue;
      }
      // fact
      const key = dedupeKey(s.text);
      if (key.length < 6) continue;
      if (seen.some((k) => k === key || (key.length >= 20 && (k.includes(key) || key.includes(k))) || (key.length >= 24 && k.length >= 24 && bigramDice(k, key) >= 0.85))) {
        stats.duplicateDropped++;
        continue;
      }
      // 年次の報告値の文は metric にできる
      if (/[売営純]/.test(s.text) && /(?:兆|億|百万|千円|万円|円|ドル|ユーロ|EUR)/.test(s.text)) {
        const fin = parseFinancialLine(s.text, lastPeriod);
        if (fin.period) lastPeriod = fin.period;
        if (fin.metrics.length) {
          const src = resolveSource(cand, s, table, entity);
          if (src) {
            for (const h of fin.metrics) {
              const dup = metrics.some((m) => m.measure === h.measure && m.amount === h.amount && m.currency === h.currency);
              if (!dup) addMetric(hintToMetric(h, src.id, src.kind === 'FILING' ? 'FILED' : 'SELF_REPORTED', h.basis));
            }
            if (fin.unparsedNumeric === 0) {
              stats.metricLineDropped++;
              seen.push(key);
              continue;
            }
          }
        }
      }
      if (s.text.length > MAX_FACT) {
        stats.tooLongDropped++;
        review.push({ entityId, kind: 'fact-too-long', text: s.text.slice(0, 160) });
        continue;
      }
      const src = resolveSource(cand, s, table, entity);
      if (!src) {
        unbound.push({ entityId, text: s.text.slice(0, 200), reason: 'no-source' });
        continue;
      }
      seen.push(key);
      let attribution = attributionFor(src.kind);
      if ((src.kind === 'LISTING' || src.kind === 'ARTICLE') && /本人申告|自己申告|創業者(?:本人)?は.*(?:説明|述べ|投稿)|と説明した|と述べ/.test(s.text)) attribution = 'SELF_REPORTED';
      facts.push({
        kind: s.factKind ?? 'OTHER',
        text: s.text,
        sourceId: src.id,
        ...(iso(s.leadDate) && false ? {} : {}),
        attribution,
      });
    }
  }

  // 根拠の無い「チーム・稼働: 本人」を外す。事例の文のどこかに一人運営の記述がある時だけ残す
  {
    const SOLO = /一人|1人|ひとり|単独|ソロ|solo|自分だけ|個人で|副業|夜間と週末|創業者自身/i;
    const allText = candidates.map((c) => c.text).join('\n').replace(/チーム・稼働[^。\n]*/g, '');
    const soloEvidence = SOLO.test(allText) || facts.some((f) => !/^チーム・稼働[:：]/.test(f.text) && SOLO.test(f.text));
    for (let i = facts.length - 1; i >= 0; i--) {
      if (/^チーム・稼働[:：]\s*本人(?:1人)?。?$/.test(facts[i]!.text) && !soloEvidence) {
        facts.splice(i, 1);
        stats.unsupportedTeamDropped++;
      }
    }
  }
  // kind が違っても中身がほぼ同じ文は1つにする（後ろの文を落とす。項目名つきの文は緩い基準）
  {
    const body = (t: string) => t.replace(/^[^:：]{2,8}[:：]\s*/, '').replace(/[。\s]+$/, '');
    const kept: Omit<Fact, 'id'>[] = [];
    for (const f of facts) {
      const labeled = /^[^:：]{2,8}[:：]/.test(f.text);
      const b = body(f.text);
      const dup = b.length >= 10 && kept.some((k) => {
        const kb = body(k.text);
        return kb.length >= 10 && (kb.includes(b) || b.includes(kb) || bigramDice(kb, b) >= (labeled ? 0.55 : 0.75));
      });
      if (dup) stats.duplicateDropped++;
      else kept.push(f);
    }
    facts.length = 0;
    facts.push(...kept);
  }

  // ---- 概要の事実（公式サイトの事実だけ） ----
  const sources = table.list();
  const kindOf = new Map(sources.map((s) => [s.id, s.kind]));
  let summaryIdx = -1;
  const rootSource = new Set(
    sources.filter((x) => {
      try {
        const p = new URL(x.url).pathname.replace(/\/+$/, '');
        return p === '' || /^\/(?:ja|en)$/.test(p);
      } catch {
        return false;
      }
    }).map((x) => x.id),
  );
  for (let i = 0; i < facts.length && summaryIdx < 0; i++) {
    const f = facts[i]!;
    if (kindOf.get(f.sourceId) !== 'OFFICIAL' || !rootSource.has(f.sourceId)) continue;
    if (!['OTHER', 'TOOL', 'CHANNEL'].includes(f.kind)) continue;
    if (/試用|返金|料金|価格|月額|年額|\d\s?ドル|円|保証/.test(f.text)) continue;
    facts[i] = { ...f, kind: 'DESCRIPTION' };
    summaryIdx = i;
  }
  for (let i = 0; i < facts.length && summaryIdx < 0; i++) {
    const f = facts[i]!;
    if (kindOf.get(f.sourceId) !== 'OFFICIAL') continue;
    if (['EXIT', 'FUNDING', 'FOUNDING'].includes(f.kind)) continue;
    if (/[をと](?:紹介|案内)|(?:サービス|ツール|ソフト|プラットフォーム|アプリ|API|ゲートウェイ|マーケットプレイス).{0,30}(?:提供|できる|使える)/.test(f.text)) {
      facts[i] = { ...f, kind: 'DESCRIPTION' };
      summaryIdx = i;
      break;
    }
  }

  // 期間が無く「時点」で埋めた年次の数値は、同じ事例の年次の期間を借りる（借りた事実は基準に残さない）
  const fiscalPeriod = metrics.find((m) => m.periodKind === 'FISCAL_YEAR' && !/時点$/.test(m.period))?.period;
  if (fiscalPeriod) {
    for (let i = 0; i < metrics.length; i++) {
      const m = metrics[i]!;
      if (m.periodKind === 'FISCAL_YEAR' && /時点$/.test(m.period)) metrics[i] = { ...m, period: fiscalPeriod };
    }
  }
  // 同じ項目・同じ通貨で、日付つきの直近30日の数字がある時、日付も期間も無い「月」だけの数字は取得時点が違う同じ数字とみなして外す（新しい方だけ残す）
  const dated30 = metrics.filter((m) => m.periodKind === 'TRAILING_DAYS' && m.statedAt && /30日/.test(m.period));
  for (let i = metrics.length - 1; i >= 0; i--) {
    const m = metrics[i]!;
    if (m.periodKind === 'MONTH' && !m.statedAt && /^(?:月|毎月|月次)$/.test(m.period) && dated30.some((d) => d.measure === m.measure && d.currency === m.currency && d.unit === m.unit)) {
      metrics.splice(i, 1);
      stats.metricSkipped++;
    }
  }
  // 同じ種類・同じ期間で金額が違う数字は、文脈の先頭の言い回しを基準（basis）に付けて見分ける
  const groups = new Map<string, number[]>();
  metrics.forEach((m, i) => {
    const g = [m.measure, m.periodKind, m.period, m.currency ?? '', m.unit ?? ''].join('|');
    groups.set(g, [...(groups.get(g) ?? []), i]);
  });
  for (const idxs of groups.values()) {
    if (idxs.length < 2 || new Set(idxs.map((i) => metrics[i]!.amount)).size < 2) continue;
    for (const i of idxs) {
      const m = metrics[i]!;
      const seg = SEGMENT.get(m);
      if (!m.basis && !m.label && seg) metrics[i] = { ...m, basis: seg.length > 60 ? seg.slice(0, 60) : seg };
    }
  }
  const finalFacts: Fact[] = facts.map((f, i) => ({ id: `f${i + 1}`, ...f }));
  const finalMetrics: Metric[] = metrics.map((m, i) => ({ id: `m${i + 1}`, ...m }));

  // ---- 未確認の項目（データが無いものだけ） ----
  const unknowns = computeUnknowns(finalFacts, finalMetrics, strs(reaudit.unknown).some((u) => /稼働|現在の状況|存続|運営状況/.test(u)));

  // 使った出典だけを残す（facts・metrics に登場したもの）。id は table が使用順に振っている
  const reader: ReaderCase = {
    sources,
    facts: finalFacts,
    metrics: finalMetrics,
    unknowns,
    analysis: [],
    ...(summaryIdx >= 0 ? { summaryFactId: finalFacts[summaryIdx]!.id } : {}),
  };
  return { reader, stats, unbound, review };
}

/** データが無い項目を数える。照合で主張が落ちた後にも同じ規則で出し直す */
export function computeUnknowns(facts: Fact[], metrics: Metric[], statusUnknown: boolean): ReaderCase['unknowns'] {
  const has = (k: Fact['kind']) => facts.some((f) => f.kind === k);
  const hasM = (...ms: Metric['measure'][]) => metrics.some((m) => ms.includes(m.measure));
  const unknowns: ReaderCase['unknowns'] = [];
  if (!hasM('REVENUE')) unknowns.push('REVENUE');
  if (!hasM('PROFIT', 'OPERATING_INCOME', 'NET_INCOME')) unknowns.push('PROFIT');
  if (!hasM('COST')) unknowns.push('COST');
  if (!has('TEAM')) unknowns.push('TEAM');
  if (!has('CHANNEL')) unknowns.push('CHANNEL');
  if (!has('TOOL')) unknowns.push('TOOLS');
  if (!has('PRICING') && !hasM('PRICE')) unknowns.push('PRICING');
  if (!has('FOUNDING')) unknowns.push('FOUNDED');
  if (statusUnknown) unknowns.push('STATUS');
  return unknowns;
}

function hintToMetric(h: MetricHint, sourceId: string, origin: Metric['origin'], basis?: string): Omit<Metric, 'id'> {
  return {
    measure: h.measure,
    periodKind: h.periodKind,
    period: h.period,
    amount: h.amount,
    ...(h.currency ? { currency: h.currency } : {}),
    origin,
    ...(basis ? { basis } : {}),
    ...(h.label ? { label: h.label } : {}),
    sourceId,
    ...(h.statedAt ? { statedAt: h.statedAt } : {}),
  };
}

/** 結び付ける順: 行の中のURL → 行頭の出典名 → eBiz の記事 → ホスト名 → 事例で出典が1つならそれ */
function resolveSource(cand: Candidate, s: Sentence, table: SourceTable, entity: Rec) {
  if (cand.url) {
    const r = table.use(cand.url);
    if (r) return r;
  }
  for (const u of extractUrls(s.original)) {
    const r = table.use(u);
    if (r) return r;
  }
  if (s.label) {
    const r = table.byLabel(s.label);
    if (r) return r;
  }
  if (EBIZ_SECTION.test(s.original) || /記事(?:記載|の記載)/.test(s.original)) {
    const r = table.byLabel('eBiz Facts');
    if (r) return r;
  }
  const host = hostOfText(s.original);
  if (host) {
    const r = table.byLabel(`www.${host}`);
    if (r) return r;
  }
  const family = String(((entity.reaudit ?? {}) as Rec).family ?? '');
  if (family === 'ebizfacts') {
    const r = table.byLabel('eBiz Facts');
    if (r) return r;
  }
  if (family === 'indiehackers') {
    const r = table.byLabel('Indie Hackers');
    if (r) return r;
  }
  return table.onlyKnown();
}

function hostOfText(text: string): string | undefined {
  const m = text.match(/\b((?:[a-z0-9-]+\.)+(?:com|io|ai|co|net|jp|org|app|dev))\b/i);
  return m ? hostOf(`https://${m[1]}`) : undefined;
}

/** ReaderCaseSchema を通るか。通らなければ理由の要約を返す。 */
export function validateReader(reader: ReaderCase): string | null {
  const r = ReaderCaseSchema.safeParse(reader);
  if (r.success) return null;
  return r.error.issues
    .slice(0, 3)
    .map((i) => `${i.path.join('.')}: ${i.message}`)
    .join(' / ');
}

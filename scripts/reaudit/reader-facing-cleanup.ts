/**
 * 読者の画面に出る内部の言葉を取り除き、元がAI作文だったレコードの残り作文を未確認に戻す（2026-09-30）
 *
 * (A) 全レコード: 「再監査中」タグ・「機械的再監査」の時点表記・工程報告の観測・「次の作業:」行・定型の内部語を読者向けに直し、HTML実体を文字に戻す。
 * (B) reaudit.narrativeStatus = AI_NARRATIVE_DEMOTED_UNVERIFIED_20260930 のレコード: 作文タグ・出典に無い創業者/法人名・国・対象期間を未確認に戻す。
 * (C) 個別の誤り: eBiz Facts の Ahsan Sohail の金額表示、大手の月平均円換算ラベル、根拠の無い年表項目、矛盾する「財務未確認」。
 *
 * 取り除いた値は reaudit.legacyDisplaySnapshot.priorNarrative.readerCleanup.<欄> へ退避（既存の中身は消さない）。
 * 冪等: 退避済みの欄は上書きしない。2回目以降は何も変えない。書き込み前に全件を parseFinancialEntity で検証する。
 *
 * 使い方: node --import tsx scripts/reaudit/reader-facing-cleanup.ts [--dry-run]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseFinancialEntity } from '../../src/shared/financial-entity-schema';
import { DEMOTED_STATUS, NO_SOURCE_DOC, UNCONFIRMED, PNL_FLAG_KEYS } from '../architecture/facts-only-lib.mjs';

type AnyRecord = Record<string, unknown>;
const rec = (v: unknown): AnyRecord => (v && typeof v === 'object' && !Array.isArray(v) ? (v as AnyRecord) : {});
const isStr = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const canon = (v: unknown): string => JSON.stringify(v, (_k, val) => (val && typeof val === 'object' && !Array.isArray(val)
  ? Object.fromEntries(Object.entries(val as AnyRecord).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
  : val));

const DATE = '2026-09-30';
const METHOD = 'SCRIPTED_READER_FACING_CLEANUP_V1';
const dryRun = process.argv.includes('--dry-run');
const indexPath = resolve(process.cwd(), 'data/entities-index.json');

const counts: Record<string, number> = {};
const bump = (k: string, n = 1) => { counts[k] = (counts[k] ?? 0) + n; };

// ---- 退避 ----
function cleanupBucket(e: AnyRecord): AnyRecord | null {
  const reaudit = rec(e.reaudit);
  if (Object.keys(reaudit).length === 0) return null;
  const snap = rec(reaudit.legacyDisplaySnapshot);
  if (!snap.status) Object.assign(snap, { status: 'SUPERSEDED_NOT_PRIMARY_VALIDATED', supersededAt: DATE, method: METHOD });
  const pn = rec(snap.priorNarrative);
  const bucket = rec(pn.readerCleanup);
  if (bucket.cleanedAt === undefined) bucket.cleanedAt = DATE;
  pn.readerCleanup = bucket;
  snap.priorNarrative = pn;
  reaudit.legacyDisplaySnapshot = snap;
  e.reaudit = reaudit;
  return bucket;
}
/** 退避。退避済みの欄は上書きしない。 */
function stash(e: AnyRecord, key: string, value: unknown) {
  if (value === undefined) return;
  const bucket = cleanupBucket(e);
  if (!bucket) { bump('stash skipped (no reaudit)'); return; }
  if (bucket[key] === undefined) bucket[key] = clone(value);
}
function stashList(e: AnyRecord, key: string, items: unknown[]) {
  if (!items.length) return;
  const bucket = cleanupBucket(e);
  if (!bucket) { bump('stash skipped (no reaudit)'); return; }
  const list = Array.isArray(bucket[key]) ? (bucket[key] as unknown[]) : [];
  for (const it of items) if (!list.some((x) => canon(x) === canon(it))) list.push(clone(it));
  bucket[key] = list;
}
/** カード単位の退避: evidenceCards = [{id, title?, punchline?, sourceNote?, detailsRemoved?}] */
function stashCard(e: AnyRecord, id: string, fields: AnyRecord) {
  const bucket = cleanupBucket(e);
  if (!bucket) { bump('stash skipped (no reaudit)'); return; }
  const list = Array.isArray(bucket.evidenceCards) ? (bucket.evidenceCards as AnyRecord[]) : [];
  let entry = list.find((x) => x.id === id);
  if (!entry) { entry = { id }; list.push(entry); }
  for (const [k, v] of Object.entries(fields)) {
    if (k === 'detailsRemoved') {
      const cur = Array.isArray(entry[k]) ? (entry[k] as string[]) : [];
      for (const s of v as string[]) if (!cur.includes(s)) cur.push(s);
      entry[k] = cur;
    } else if (entry[k] === undefined) entry[k] = v;
  }
  bucket.evidenceCards = list;
}

// ---- (A) 定型文の書き換え表 ----
const PUNCHLINE_MAP: Record<string, string> = {
  '公式URLは記録済み。この機械的再監査ではページを再取得していない（個別再監査で製品・価格・会社概要を確認する）。':
    '公式サイトのURLのみ記録。製品・価格・会社概要は未確認。',
  '掲載ページで製品名と自己紹介文を確認。売上・利益・チーム規模の数値はこの再監査では確認していない。':
    '掲載ページで製品名と自己紹介文を確認。売上・利益・チーム規模は未確認。',
  '公式サイトではない。記事が引用したページのURLを記録しただけで、この再監査ではページを再取得していない。':
    '公式サイトではなく、記事が引用したページのURL。内容は未確認。',
  'この記録には出典URLも原本保存もない。旧表示の数値と説明は根拠不足のため取り下げ、個別再監査の対象とする。':
    '出典URLが無いため、以前の数値と説明は取り下げた。',
  '月商・利益・原価・手残りは公式資料で確認できていない。旧表示の数値は出典不足のため取り下げたまま。':
    '月商・利益・原価・手残りは公式資料で確認できていない。以前の数値は出典不足のため取り下げた。',
  '月商・利益・原価・手残り、チーム規模、創業年、集客経路、ツール構成は未確認。旧表示の数値は出典不足のため取り下げた。':
    '月商・利益・原価・手残り、チーム規模、創業年、集客経路、ツール構成は未確認。以前の数値は出典不足のため取り下げた。',
};
const TITLE_MAP: Record<string, string> = {
  '調査限界: この再監査で確認していないこと': '未確認の項目',
  '調査限界: この再調査で確認できなかったこと': '未確認の項目',
};
const SOURCE_NOTE_INTERNAL_RE = /scripted|re-audit|lane [A-Z]\b|demoted by/i;
const SOURCE_NOTE_PLAIN = '調査範囲の開示';
const TAGLINE_RE = /^.*の詳細は再監査中です（公式ページと掲載元のみ確認済み。売上・利益は未確認）。$/;
const TAGLINE_PLAIN = '事業内容の詳細は未確認です（確認できたのは公式ページと掲載元のみ）。';
const OLD_NO_SOURCE_DOC = '出典未記録（旧表示の財務数値は出典不足のため取り下げ。個別再監査で出典を確認する）';
const STREAM_PROCESS_RE = /^\d{4}-\d{2}-\d{2} 機械的再監査:/;
const PNL_SNAPSHOT_INTERNAL_RE = /機械的再監査/;
const TEMPORAL_SNAPSHOT_RE = /^\d{4}-\d{2}-\d{2} 機械的再監査$/;
const TEMPORAL_PENDING = '未確認（個別再監査待ち）';
const TIMELINE_NO_BASIS = '公開レコードの開始値。';

function cleanCards(e: AnyRecord) {
  if (!Array.isArray(e.evidenceCards)) return;
  for (const c of e.evidenceCards as AnyRecord[]) {
    if (!c || typeof c !== 'object') continue;
    const id = String(c.id);
    const old: AnyRecord = {};
    if (typeof c.title === 'string' && TITLE_MAP[c.title]) { old.title = c.title; c.title = TITLE_MAP[c.title]; bump('A.card.title'); }
    if (typeof c.punchline === 'string' && PUNCHLINE_MAP[c.punchline]) { old.punchline = c.punchline; c.punchline = PUNCHLINE_MAP[c.punchline]; bump('A.card.punchline'); }
    if (typeof c.sourceNote === 'string' && SOURCE_NOTE_INTERNAL_RE.test(c.sourceNote) && !/https?:\/\//.test(c.sourceNote)) {
      old.sourceNote = c.sourceNote; c.sourceNote = SOURCE_NOTE_PLAIN; bump('A.card.sourceNote');
    }
    if (Array.isArray(c.details)) {
      const removed = (c.details as unknown[]).filter((d): d is string => typeof d === 'string' && d.startsWith('次の作業:'));
      if (removed.length) {
        old.detailsRemoved = removed;
        c.details = (c.details as unknown[]).filter((d) => !(typeof d === 'string' && d.startsWith('次の作業:')));
        bump('A.card.details 次の作業', removed.length);
      }
    }
    if (Object.keys(old).length) stashCard(e, id, old);
  }
}

// ---- (B) 出典つきの文 ----
const BUSINESS_WORD_RE = /\b(?:inc|llc|ltd|co|corp|company|app|apps|ai|shop|store|studio|studios|media|labs?|lemonade|coffee|bakery|brand|brands|agency|club|games?|group|network|digital|online|snap|hq|io|academy|school|farm|foods?)\b/i;
/** 「名 姓」の形（2〜4語、各語が大文字で始まる英字）で、事業を表す語を含まない。 */
function looksLikePersonName(v: string): boolean {
  const words = v.trim().split(/\s+/);
  if (words.length < 2 || words.length > 4) return false;
  if (BUSINESS_WORD_RE.test(v)) return false;
  return words.every((w, i) => /^[A-Z][A-Za-z'’.-]*$/.test(w) || (i > 0 && i < words.length - 1 && /^(?:van|von|de|da|der|den|le|la|du|del|di)$/.test(w)));
}
function normName(v: unknown): string {
  return String(v ?? '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/['’.]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}
function sourcedCorpus(e: AnyRecord): string[] {
  const out: string[] = [];
  for (const s of Array.isArray(rec(e.reaudit).supported) ? (rec(e.reaudit).supported as unknown[]) : []) if (typeof s === 'string') out.push(s);
  for (const c of Array.isArray(e.evidenceCards) ? (e.evidenceCards as AnyRecord[]) : []) {
    for (const f of [c?.text, c?.punchline]) if (typeof f === 'string') out.push(f);
    if (Array.isArray(c?.details)) for (const d of c.details as unknown[]) if (typeof d === 'string') out.push(d);
  }
  for (const o of Array.isArray(e.observationsStream) ? (e.observationsStream as AnyRecord[]) : []) if (typeof o?.text === 'string') out.push(o.text);
  return out;
}

function hasReportedRevenue(e: AnyRecord): boolean {
  const p = rec(e.pnl);
  const label = p.revenueLabel;
  if (!isStr(label) || /未確認|記載な|不明|なし/.test(label)) return false;
  return (isStr(p.sourceDoc) && /^https?:\/\//.test(p.sourceDoc)) || (Array.isArray(e.reportedMetrics) && e.reportedMetrics.length > 0);
}

function cleanDemoted(e: AnyRecord) {
  // tags: 出典なしの作文が残っていた。許可リスト方式なので例外なく退避して空にする
  if (Array.isArray(e.tags) && e.tags.length > 0) { stash(e, 'tags', e.tags); e.tags = []; bump('B.tags emptied'); }
  // founder / legalEntity: 出典つきの文にそのまま出る場合だけ残す
  const corpus = sourcedCorpus(e);
  // 記事の題名（slug）に出る人名も出典の文として扱う（例: steve-hanov-multiple-saas… → Steve Hanov）。
  // 事業名（CoinSnap、Boo Boo's Lemonade など）は創業者名ではないので、人名の形のものだけ。
  const slugText = normName(rec(e.sourceMetadata).slug);
  const inSlug = (v: string) => slugText !== '' && looksLikePersonName(v) && ` ${slugText} `.includes(` ${normName(v)} `);
  const cleanupPrev = rec(rec(rec(rec(e.reaudit).legacyDisplaySnapshot).priorNarrative).readerCleanup);
  // 「Leo Yang（Indie Hackers の掲載）」のような出典の注記は、照合の前に外す
  const bare = (v: string) => v.replace(/\s*[（(][^）)]*[）)]\s*$/u, '').trim();
  const inCorpus = (v: string) => corpus.some((t) => t.includes(v.trim()) || (bare(v) !== '' && t.includes(bare(v))));
  if (e.founder === UNCONFIRMED && isStr(cleanupPrev.founder) && (inSlug(bare(cleanupPrev.founder)) || inCorpus(cleanupPrev.founder))) {
    e.founder = cleanupPrev.founder;
    bump('B.founder restored (in article title)');
  }
  for (const k of ['founder', 'legalEntity'] as const) {
    const v = e[k];
    if (!isStr(v) || v === UNCONFIRMED) continue;
    if (inCorpus(v) || (k === 'founder' && inSlug(bare(v)))) { bump(`B.${k} kept (in sourced text)`); continue; }
    stash(e, k, v);
    e[k] = UNCONFIRMED;
    bump(`B.${k} -> 未確認`);
  }
  // country
  if (isStr(e.country) && e.country !== UNCONFIRMED) { stash(e, 'country', e.country); e.country = UNCONFIRMED; bump('B.country -> 未確認'); }
  // pnl
  const p = rec(e.pnl);
  const hasLabel = isStr(p.revenueLabel);
  const hasMetrics = Array.isArray(e.reportedMetrics) && e.reportedMetrics.length > 0;
  if (!hasLabel && p.dataSnapshotPeriod !== undefined) {
    stash(e, 'pnl.dataSnapshotPeriod', p.dataSnapshotPeriod);
    delete p.dataSnapshotPeriod;
    bump('B.pnl.dataSnapshotPeriod deleted (no revenueLabel)');
  }
  const allUnconfirmed = PNL_FLAG_KEYS.every((k: string) => p[k] === true);
  if (!hasLabel && !hasMetrics && allUnconfirmed) {
    if (p.financialStatus === 'REPORTED') { stash(e, 'pnl.financialStatus', p.financialStatus); p.financialStatus = 'UNAVAILABLE'; bump('B.pnl.financialStatus REPORTED -> UNAVAILABLE'); }
    if (e.financialStatus === 'REPORTED') { stash(e, 'financialStatus', e.financialStatus); e.financialStatus = 'UNAVAILABLE'; bump('B.financialStatus(top) REPORTED -> UNAVAILABLE'); }
  }
}

// ---- (C) 大手の月平均円換算ラベル ----
const YEN_ONLY_LABEL_RE = /^[¥￥]?\s?[0-9][0-9,.]*\s?(兆|億|万)?\s?円?$/;
function annualText(v: number, unit: string): string {
  if (unit === 'ドル') return v >= 1000 ? `$${(v / 1000).toFixed(1)}B` : `$${v.toFixed(0)}M`;
  if (unit === 'EUR') return v >= 1000 ? `€${(v / 1000).toFixed(1)}B` : `€${v.toFixed(0)}M`;
  if (unit === '円') return v >= 1_000_000 ? `${(v / 1_000_000).toFixed(2)}兆円` : `${Math.round(v / 100).toLocaleString('en-US')}億円`;
  if (unit === '元RMB') return v >= 1_000_000 ? `${(v / 1_000_000).toFixed(2)}兆元` : `${Math.round(v / 100).toLocaleString('en-US')}億元`;
  return v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}兆ウォン` : `${Math.round(v / 100).toLocaleString('en-US')}億ウォン`;
}
function fixMonthlyAverageLabel(e: AnyRecord) {
  const p = rec(e.pnl);
  const label = p.revenueLabel;
  if (!isStr(label) || !YEN_ONLY_LABEL_RE.test(label.trim())) return;
  const logic = isStr(p.estimationLogic) ? p.estimationLogic : '';
  const m = logic.match(/(?:売上等?約?|Revenue)\s?([0-9][0-9,.]*)\s?百万\s?(ドル|EUR|円|KRW|元RMB)/);
  if (!m || !/12分割/.test(logic)) { bump('C.monthlyAverage label NOT parsed'); (counts as AnyRecord).unparsedIds = [...(((counts as AnyRecord).unparsedIds as string[]) ?? []), String(e.id)]; return; }
  const annual = annualText(Number(m[1].replace(/,/g, '')), m[2]);
  const fy = (logic.match(/FY\d{4}/) ?? [''])[0];
  const money = label.trim().replace(/^[¥￥]\s?/, '');
  const how = m[2] === '円' ? 'を12で割った値' : 'を12で割って円換算';
  stash(e, 'pnl.revenueLabel', label);
  p.revenueLabel = `月平均 約${money}（${fy ? `${fy} ` : ''}年間売上 ${annual} ${how}）`;
  bump('C.revenueLabel monthly-average / annual made explicit');
}

// ---- 個別レコード ----
const AHSAN = 'ent_ebizfacts_ahsansohailfiverrbusinessplanwriter1million_66dbf5954083';
const AHSAN_LABEL = '出典記載: Fiverr経由の累計売上は少なくとも $110,000（記事による算出値）';
const AHSAN_TEXT = '記事は、Fiverr経由の累計売上を少なくとも$110,000と記載している（最低単価$50×受注件数から記事が算出。当初の$1.1Mは訂正済み）。';
function fixAhsan(e: AnyRecord) {
  if (e.id !== AHSAN) return;
  const p = rec(e.pnl);
  const changedBefore = canon(e);
  if (p.revenueLabel !== AHSAN_LABEL) { stash(e, 'pnl.revenueLabel', p.revenueLabel); p.revenueLabel = AHSAN_LABEL; }
  if (Array.isArray(e.observations)) {
    e.observations = (e.observations as unknown[]).map((o) => {
      if (o === '記事に金額の記載なし。') { stashList(e, 'observations', [o]); return AHSAN_TEXT; }
      return o;
    });
  }
  for (const o of (Array.isArray(e.observationsStream) ? (e.observationsStream as AnyRecord[]) : [])) {
    if (typeof o.text === 'string' && /記事に金額の記載はない/.test(o.text)) {
      stashList(e, 'observationsStream', [{ id: o.id, text: o.text }]);
      o.text = AHSAN_TEXT;
    }
  }
  for (const c of (Array.isArray(e.evidenceCards) ? (e.evidenceCards as AnyRecord[]) : [])) {
    const old: AnyRecord = {};
    if (c.punchline === '記事は事業の紹介のみで、金額は掲載されていない。') {
      old.punchline = c.punchline;
      c.punchline = '記事は事業の紹介のほか、Fiverr経由の累計売上を少なくとも$110,000と記載している（記事による算出値で、本人の申告ではない）。';
    }
    if (c.punchline === '記事に金額の記載はない。事業内容・ツール・集客の記述だけを要約した。') {
      old.punchline = c.punchline;
      c.punchline = `${AHSAN_TEXT}事業内容・ツール・集客の記述も要約した。`;
    }
    if (c.badge === '金額なし') { old.badge = c.badge; c.badge = '記事の算出値'; }
    if (Array.isArray(c.details) && (c.details as unknown[]).includes('金額の記載なし')) {
      old.detailsRemoved = ['金額の記載なし'];
      c.details = (c.details as unknown[]).map((d) => (d === '金額の記載なし' ? '記載金額: 少なくとも$110,000（記事による算出値。本人の申告ではない）' : d));
    }
    if (Object.keys(old).length) stashCard(e, String(c.id), old);
  }
  if (canon(e) !== changedBefore) bump('C.ahsan corrected');
}

const COUNTRY_UNCONFIRMED_IDS = new Set([
  'ent_ebizfacts_serhiibaraniukwriting912kmonthexamprep_ead554906ca3',
  'ent_lclstck_78559c35',
]);

// ---- HTML 実体の復元 ----
const ENTITY_RE = /&(#x[0-9a-fA-F]+|#[0-9]+|amp|lt|gt|quot|apos|nbsp);/g;
function decodeEntities(s: string): string {
  return s.replace(ENTITY_RE, (m, g: string) => {
    if (g === 'amp') return '&';
    if (g === 'lt') return '<';
    if (g === 'gt') return '>';
    if (g === 'quot') return '"';
    if (g === 'apos') return "'";
    if (g === 'nbsp') return ' ';
    const cp = g[1] === 'x' || g[1] === 'X' ? parseInt(g.slice(2), 16) : parseInt(g.slice(1), 10);
    return Number.isFinite(cp) && cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : m;
  });
}
function decodeDeep(v: unknown, top: boolean, c: { n: number }): unknown {
  if (typeof v === 'string') {
    if (!v.includes('&')) return v;
    const out = decodeEntities(v);
    if (out !== v) c.n++;
    return out;
  }
  if (Array.isArray(v)) return v.map((x) => decodeDeep(x, false, c));
  if (v && typeof v === 'object') {
    const o = v as AnyRecord;
    for (const k of Object.keys(o)) {
      if (k === 'id') continue;
      if (top && (k === 'reaudit' || k === 'meta' || k === 'sourceMetadata')) continue;
      o[k] = decodeDeep(o[k], false, c);
    }
    return o;
  }
  return v;
}

function processEntity(e: AnyRecord) {
  const demoted = rec(e.reaudit).narrativeStatus === DEMOTED_STATUS;

  fixAhsan(e);

  // B は出典つきの文で判定するので、A（文言の書き換え）より先に行う
  if (demoted) cleanDemoted(e);
  else if (COUNTRY_UNCONFIRMED_IDS.has(String(e.id)) && isStr(e.country) && e.country !== UNCONFIRMED) {
    stash(e, 'country', e.country); e.country = UNCONFIRMED; bump('C.country -> 未確認 (individual)');
  }
  if (demoted && COUNTRY_UNCONFIRMED_IDS.has(String(e.id))) bump('C.country individual (already by B)');

  // A: tags
  if (Array.isArray(e.tags) && e.tags.includes('再監査中')) {
    stashList(e, 'tags(再監査中)', ['再監査中']);
    e.tags = (e.tags as string[]).filter((t) => t !== '再監査中');
    bump('A.tags 再監査中 removed');
  }
  // 矛盾する「財務未確認」タグ（URL出典つきの報告売上があるのに）
  if (Array.isArray(e.tags) && e.tags.includes('財務未確認') && hasReportedRevenue(e)) {
    stashList(e, 'tags(財務未確認)', ['財務未確認']);
    e.tags = (e.tags as string[]).filter((t) => t !== '財務未確認');
    bump('C.tags 財務未確認 removed (reported revenue exists)');
  }
  // A: tagline
  if (typeof e.tagline === 'string' && TAGLINE_RE.test(e.tagline)) {
    stash(e, 'tagline', e.tagline);
    e.tagline = TAGLINE_PLAIN;
    bump('A.tagline');
  } else if (typeof e.tagline === 'string' && hasReportedRevenue(e) && /[（(]売上(・利益)?は未確認[）)]/.test(e.tagline)) {
    stash(e, 'tagline', e.tagline);
    e.tagline = e.tagline.replace(/[（(]売上(・利益)?は未確認[）)]/, '');
    bump('C.tagline contradiction removed');
  }
  // A: pnl
  const pnl = rec(e.pnl);
  if (typeof pnl.dataSnapshotPeriod === 'string' && PNL_SNAPSHOT_INTERNAL_RE.test(pnl.dataSnapshotPeriod)) {
    stash(e, 'pnl.dataSnapshotPeriod', pnl.dataSnapshotPeriod);
    delete pnl.dataSnapshotPeriod;
    bump('A.pnl.dataSnapshotPeriod deleted');
  }
  if (pnl.sourceDoc === OLD_NO_SOURCE_DOC) {
    stash(e, 'pnl.sourceDoc', pnl.sourceDoc);
    pnl.sourceDoc = NO_SOURCE_DOC;
    bump('A.pnl.sourceDoc');
  }
  // A: temporal
  const tp = rec(e.temporal);
  if (typeof tp.dataSnapshotPeriod === 'string' && TEMPORAL_SNAPSHOT_RE.test(tp.dataSnapshotPeriod)) {
    stash(e, 'temporal.dataSnapshotPeriod', tp.dataSnapshotPeriod); tp.dataSnapshotPeriod = UNCONFIRMED; bump('A.temporal.dataSnapshotPeriod');
  }
  for (const k of ['initialTractionPeriod', 'eraContext']) {
    if (tp[k] === TEMPORAL_PENDING) { stash(e, `temporal.${k}`, tp[k]); tp[k] = UNCONFIRMED; bump(`A.temporal.${k}`); }
  }
  // A: observationsStream の工程報告
  if (Array.isArray(e.observationsStream)) {
    const removed = (e.observationsStream as AnyRecord[]).filter((o) => typeof o?.text === 'string' && STREAM_PROCESS_RE.test(o.text));
    if (removed.length) {
      stashList(e, 'observationsStream', removed);
      e.observationsStream = (e.observationsStream as AnyRecord[]).filter((o) => !removed.includes(o));
      bump('A.observationsStream process items removed', removed.length);
    }
  }
  cleanCards(e);
  // C: 月平均円換算ラベル・根拠の無い年表項目
  fixMonthlyAverageLabel(e);
  if (Array.isArray(e.timelineEvents)) {
    const removed = (e.timelineEvents as AnyRecord[]).filter((t) => t?.description === TIMELINE_NO_BASIS);
    if (removed.length) {
      stashList(e, 'timelineEvents', removed);
      e.timelineEvents = (e.timelineEvents as AnyRecord[]).filter((t) => t?.description !== TIMELINE_NO_BASIS);
      bump('C.timelineEvents no-basis items removed', removed.length);
      bump('C.timelineEvents records changed');
    }
  }
  // A: HTML 実体
  const d = { n: 0 };
  decodeDeep(e, true, d);
  if (d.n) bump('A.html entities decoded (strings)', d.n);
}

function main() {
  const entities: AnyRecord[] = JSON.parse(readFileSync(indexPath, 'utf8'));
  let changedRecords = 0;
  for (const e of entities) {
    const before = canon(e);
    processEntity(e);
    if (canon(e) !== before) { changedRecords++; parseFinancialEntity(e); }
  }
  bump('records changed', changedRecords);
  console.log(JSON.stringify({ total: entities.length, counts }, null, 1));
  if (!dryRun) writeFileSync(indexPath, JSON.stringify(entities, null, 2), 'utf8');
}

main();

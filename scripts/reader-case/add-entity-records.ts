/**
 * 目録（data/entities-index.json）に無い事例の記録を、別の公開目録（id → ハッシュの details と catalog-artifacts/<hash>.json.gz）から足す。
 *
 * 2段に分ける:
 *   1) --collect: 元の目録から記録を抜き出し、出所つきで data/entity-additions/<name>.json に保存する（コミットする正本）。
 *      保存するのは事業の記録だけ。元の目録の画面用の中身（reader）は旧版の文章なので持ち込まない（中身は取り込み経路が入れる）。
 *   2) --apply: data/entity-additions/*.json を entities-index.json に合流する。
 *      既に同じ id・同じ公式サイトの事例があれば足さない（上書きしない）。足した記録には審査待ちの印「収集事例」を付ける（承認済みにしない）。
 *      entities-index.json の指紋が変わると公開目録（catalog-release.json）の作り直しが要る。--apply は公開データ作りの直前にだけ使う。
 *
 * 使い方:
 *   node --import tsx scripts/reader-case/add-entity-records.ts --collect --manifest <catalog.json> --artifacts <dir> --ids a,b --name <name> [--packs <dir>]
 *   （--packs: 根拠カードが無い記録に、事例担当の材料 packs/<id>.json の出典から根拠カードを付ける）
 *   node --import tsx scripts/reader-case/add-entity-records.ts --from-research <records.json> --name <name>
 *   （新しく調べた事例の記録を、形の検査と出所の指紋つきで足す。R2 には書かない）
 *   node --import tsx scripts/reader-case/add-entity-records.ts --apply [--dry-run]
 */
import { createHash } from 'node:crypto';
import { recordRecordsToLedger } from '../rights/record-sources';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';
import { parseFinancialEntitiesResiliently } from '../../src/shared/financial-entity-schema';
import ENTITY_SCHEMA from '../../src/shared/schemas/financial-entity.json';
import { applyNumberContract, basicFactTextCheck, type FactTextCheck } from './number-contract';
import { describeHit, findNoise, findUnnatural, loadNaturalRules } from '../architecture/natural-japanese.mjs';

export const ADDITIONS_DIR = 'data/entity-additions';
export const REVIEW_TAG = '収集事例';

export interface AdditionFile {
  version: 1;
  /** generation: 集める流れの版（第N世代）。無ければファイル名の `gen<N>-` から、それも無ければ第1世代 */
  source: { manifest: string; manifestSha256: string; artifactsDir: string; collectedAt: string; generation?: number };
  records: { id: string; provenance: { detailsHash: string; artifactSha256: string }; workNotes?: string[]; record: Record<string, unknown> }[];
}

const sha256 = (b: Buffer | string) => createHash('sha256').update(b).digest('hex');
const host = (u: unknown) => { try { return new URL(String(u)).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } };
/**
 * 公式サイトとして名乗っている時だけホストを返す（URL がサイトの入口＝パスが無い時）。
 * 記事のページ（例 indiehackers.com/post/...）を url に持つ記録は、そのホストの持ち主ではないので、同じ公式サイトの判定に使わない。
 */
const officialHost = (u: unknown) => { try { const x = new URL(String(u)); return x.pathname.replace(/\/+$/, '') === '' ? host(u) : ''; } catch { return ''; } };

type Rec = Record<string, unknown>;
const isObj = (v: unknown): v is Rec => !!v && typeof v === 'object' && !Array.isArray(v);

/**
 * 調査記録（OWNER_INTENT 3章どおり、分からない数を null・分からない選択肢を空で書いた記録）を、目録の形に合わせる。
 * 何も作らない: 分からない数は 0 と「未確認」の印の組（docs/research-record/README.md の決まり）、分からない選択肢は UNKNOWN／未審査 RAW に置くだけ。
 * 変えた欄は返り値の changes に残す（記録の normalizedFromResearch にも書く）。
 */
interface SchemaNode { $ref?: string; type?: string | string[]; properties?: Record<string, SchemaNode>; required?: string[]; items?: SchemaNode; definitions?: Record<string, SchemaNode> }
const SCHEMA_DEFS = (ENTITY_SCHEMA as SchemaNode).definitions ?? {};
const deref = (n: SchemaNode | undefined): SchemaNode | undefined => (n?.$ref ? SCHEMA_DEFS[n.$ref.split('/').pop()!] : n);
/** 形の定義をたどり、null の欄を任意なら外す・必須なら型の空の値（文字列 ''・数 0）にする */
function nullsBySchema(value: unknown, node: SchemaNode | undefined, where: string, changes: string[]): void {
  const n = deref(node);
  if (!n) return;
  if (Array.isArray(value)) { value.forEach((v, i) => nullsBySchema(v, n.items, `${where}${i}.`, changes)); return; }
  if (!isObj(value) || !n.properties) return;
  for (const [k, child] of Object.entries(n.properties)) {
    if (!(k in value)) continue;
    if (value[k] === null) {
      const c = deref(child); const t = Array.isArray(c?.type) ? c?.type[0] : c?.type;
      if (!(n.required ?? []).includes(k)) { delete value[k]; changes.push(`${where}${k}: null→欄を外す`); }
      else if (t === 'string') { value[k] = ''; changes.push(`${where}${k}: null→''`); }
      else if (t === 'number') { value[k] = 0; changes.push(`${where}${k}: null→0`); }
      else if (t === 'array') { value[k] = []; changes.push(`${where}${k}: null→[]`); }
      continue;
    }
    nullsBySchema(value[k], child, `${where}${k}.`, changes);
  }
}

/** 調査担当の作業メモ（保存先・台帳・本番表示・一時置き場の話）。事業の観測ではない */
const WORK_NOTE = /本記録は|一時保存先|中央台帳|R2|本番表示|調査成果/;
/** 未取得・未確認の断り（観測ではなく、空欄の理由） */
const UNKNOWN_NOTE = /未取得|未確認|確認できず|確認できない|見つからなかった/;

export function normalizeResearchRecord(input: Rec, textChecks: readonly FactTextCheck[] = [basicFactTextCheck]): { record: Rec; changes: string[]; workNotes: string[] } {
  const r = structuredClone(input) as Rec;
  const changes: string[] = [];
  const num = (o: Rec, k: string, flag: string | null, where: string) => {
    if (typeof o[k] === 'number') return;
    if (o[k] !== null && o[k] !== undefined && o[k] !== '') return; // 数でも空でもない値は検査に任せる（勝手に捨てない）
    o[k] = 0; changes.push(`${where}${k}: 空→0`);
    if (flag) { o[flag] = true; }
  };
  const optNum = (o: Rec, k: string, where: string) => { if (k in o && (o[k] === null || o[k] === '')) { delete o[k]; changes.push(`${where}${k}: 空→欄を外す`); } };
  const en = (o: Rec, k: string, allowed: string[], fallback: string | null, map: Record<string, string> = {}, where = '') => {
    const v = o[k];
    if (typeof v === 'string' && allowed.includes(v)) return;
    if (typeof v === 'string' && map[v]) { o[k] = map[v]; changes.push(`${where}${k}: ${v}→${map[v]}`); return; }
    if (v === undefined) return;
    if (fallback === null) { delete o[k]; changes.push(`${where}${k}: ${JSON.stringify(v)}→欄を外す`); return; }
    o[k] = fallback; changes.push(`${where}${k}: ${JSON.stringify(v)}→${fallback}`);
  };
  const SOURCE_CLASS = ['PRIMARY', 'INDEPENDENT_SECONDARY', 'COMMUNITY', 'MODEL'];
  const SC_MAP = { SECONDARY: 'INDEPENDENT_SECONDARY', OFFICIAL: 'PRIMARY' };

  en(r, 'scale', ['SOLO', 'SMALL_TEAM', 'SCALEUP', 'ENTERPRISE', 'UNKNOWN'], 'UNKNOWN');
  // 調査段の「要審査・未審査・空」は、目録では PARTIAL（公開の候補。承認済み PUBLISHABLE にはしない）。
  // 公開してよいかは後の段（照合・監査・出典の利用条件・画像・選別）が決める。RAW にすると選別の入口で必ず落ち、後の段の審査に届かない
  // 調査段の RAW は「公開審査をまだ通していない」の意味（調査メモの定義）。目録の RAW（公開候補にしない）とは別物なので PARTIAL にそろえる
  if (r.publishability === 'RAW') { r.publishability = 'PARTIAL'; changes.push('publishability: RAW（調査段の未審査）→PARTIAL'); }
  en(r, 'publishability', ['PUBLISHABLE', 'PARTIAL', 'RAW', 'ARCHIVED', 'REJECTED_AS_CASE'], 'PARTIAL', { REVIEW_REQUIRED: 'PARTIAL', UNREVIEWED: 'PARTIAL' });
  num(r, 'growthRateYoY', 'isGrowthUnconfirmed', '');
  if (typeof r.unknownsNotes === 'string') {
    r.unknownsNotes = r.unknownsNotes.split(/／|\n/).map((s) => s.trim()).filter(Boolean);
    changes.push('unknownsNotes: 文字列→配列');
  }
  if (isObj(r.pnl)) {
    const p = r.pnl;
    const flags: Record<string, string> = {
      monthlyRevenue: 'isRevenueUnconfirmed', cogs: 'isCogsUnconfirmed', grossProfit: 'isGrossProfitUnconfirmed', grossMargin: 'isGrossMarginUnconfirmed',
      operatingProfit: 'isOperatingProfitUnconfirmed', operatingMargin: 'isMarginUnconfirmed', estimatedAnnualNetProfit: 'isNetProfitUnconfirmed',
    };
    for (const [k, f] of Object.entries(flags)) num(p, k, f, 'pnl.');
    if (isObj(p.operatingExpenses)) {
      for (const k of ['serverAndApi', 'advertising', 'subcontracting', 'toolsAndSaaS', 'other']) num(p.operatingExpenses, k, null, 'pnl.operatingExpenses.');
      if (changes.some((c) => c.startsWith('pnl.operatingExpenses.'))) p.isCostsUnconfirmed = true;
    }
    en(p, 'sourceClass', SOURCE_CLASS, null, SC_MAP, 'pnl.');
    // 損益の欄には、どの資料を見てその状態（UNAVAILABLE など）にしたかの所在が要る（check-index-safety）。
    // 空の時は、調査で開いた出典のうち公式サイトの1件目（無ければ1件目）を置く。数字は作らない
    if (typeof p.sourceDoc !== 'string' || !p.sourceDoc.trim()) {
      const srcs = ((r.reaudit as { sources?: { url?: string }[] } | undefined)?.sources ?? []).map((s) => s.url).filter((u): u is string => typeof u === 'string' && /^https?:\/\//.test(u));
      const official = host(r.officialUrl ?? r.url);
      const doc = srcs.find((u) => official && host(u) === official) ?? srcs[0];
      if (doc) { p.sourceDoc = doc; changes.push(`pnl.sourceDoc: 空→${doc}`); }
    }
  }
  if (isObj(r.operations)) {
    const o = r.operations;
    num(o, 'teamSize', 'isTeamSizeUnconfirmed', 'operations.');
    num(o, 'weeklyHours', 'isWeeklyHoursUnconfirmed', 'operations.');
    num(o, 'initialCapitalRequired', 'isCapitalUnconfirmed', 'operations.');
    num(o, 'automationLevel', 'isAutomationUnconfirmed', 'operations.');
    optNum(o, 'initialTeamSize', 'operations.');
    optNum(o, 'currentTeamSize', 'operations.');
    if (Array.isArray(o.toolStack) && o.toolStack.some((t) => typeof t === 'string')) {
      // 文字列で書いた道具は、名前と括弧の補足（用途）に分けるだけ。費用は分からないので 0＋未確認
      o.toolStack = o.toolStack.map((t) => {
        if (typeof t !== 'string') return t;
        const m = t.match(/^(.*?)\s*[（(](.+)[）)]\s*$/);
        return { name: (m ? m[1] : t).trim(), category: 'UNKNOWN', monthlyCost: 0, isCostUnconfirmed: true, ...(m ? { purpose: m[2].trim() } : {}) };
      });
      changes.push('operations.toolStack: 文字列→名前と用途');
    }
  }
  if (isObj(r.strategy)) en(r.strategy, 'moatType', ['COUNTER_POSITIONING', 'SWITCHING_COST', 'NETWORK_EFFECT', 'CORNERED_RESOURCE', 'SCALE_ECONOMIES', 'BRAND_PRESTIGE', 'PROCESS_POWER', 'UNKNOWN'], 'UNKNOWN', {}, 'strategy.');
  if (Array.isArray(r.evidenceCards)) {
    const types = ['THE_CRIME', 'SMOKING_GUN', 'DIRTY_GENESIS', 'ASYMMETRIC_LEVERAGE', 'INCUMBENT_TRAP', 'FATAL_BLEED', 'LOOT_BLUEPRINT', 'UNKNOWN_AUDIT'];
    r.evidenceCards.forEach((c, i) => {
      if (!isObj(c)) return;
      en(c, 'type', types, 'UNKNOWN_AUDIT', {}, `evidenceCards.${i}.`);
      en(c, 'sourceClass', SOURCE_CLASS, null, SC_MAP, `evidenceCards.${i}.`);
    });
  }
  // 観測欄（画面の型外の欄に出る）に入った調査担当の作業メモ・未取得の断りを、読む人向けの観測から外す。
  // 作業メモ（保存先・台帳・本番表示の話）は記録の外の workNotes へ、未取得・未確認の断りは unknownsNotes へ移す（消さない）
  const workNotes: string[] = [];
  if (Array.isArray(r.observations)) {
    const keep: unknown[] = [];
    for (const o of r.observations) {
      // 観測を {type|kind, text} の形で書いた記録は、文に直す（「調査範囲」「収集の境界」は作業メモ）
      if (isObj(o) && typeof o.text === 'string') {
        const label = String(o.kind ?? o.type ?? '');
        if (/調査範囲|収集の境界|作業/.test(label)) { workNotes.push(o.text); changes.push('observations: 作業メモ→workNotes'); continue; }
        keep.push(o.text); changes.push('observations: 形→文'); continue;
      }
      // 文の無い構造の観測: 空欄の理由（gap）は unknownsNotes へ、画像などの材料の所在は記録の外の workNotes へ（消さない）
      if (isObj(o)) {
        if (typeof o.gap === 'string') {
          r.unknownsNotes = [...(Array.isArray(r.unknownsNotes) ? r.unknownsNotes : []), `${o.domain ? `${String(o.domain)}: ` : ''}${o.gap}`];
          changes.push('observations: 空欄の理由→unknownsNotes');
        } else { workNotes.push(JSON.stringify(o)); changes.push('observations: 材料の所在→workNotes'); }
        continue;
      }
      const t = typeof o === 'string' ? o : '';
      if (t && WORK_NOTE.test(t)) { workNotes.push(t); changes.push('observations: 作業メモ→workNotes'); continue; }
      if (t && UNKNOWN_NOTE.test(t)) {
        r.unknownsNotes = [...(Array.isArray(r.unknownsNotes) ? r.unknownsNotes : []), t];
        changes.push('observations: 未取得の断り→unknownsNotes'); continue;
      }
      keep.push(o);
    }
    r.observations = keep;
  }
  // 本質（essence）の3つの欄は、1つでも空だと画面が崩れるので検査で落ちる（check-ingest-quality）。
  // 全部空なら欄を外し、一部だけ書かれていれば書かれた分を essencePartial に移して欄を外す（作文で埋めない）
  if (isObj(r.essence)) {
    const e = r.essence; const keys = ['whatItDoes', 'targetCustomer', 'painRelief'];
    const filled = keys.filter((k) => typeof e[k] === 'string' && (e[k] as string).trim());
    if (filled.length < keys.length) {
      if (filled.length) r.essencePartial = Object.fromEntries(filled.map((k) => [k, e[k]]));
      delete r.essence; changes.push(`essence: 空欄あり→${filled.length ? 'essencePartial へ移して' : ''}欄を外す`);
    }
  }
  // 数字の決まり（種類・時点・引用・出典・取得日）。満たさない数字だけを unconfirmedFacts に分ける（事例は止めない。0や仮の数で埋めない）
  changes.push(...applyNumberContract(r, textChecks).changes);
  // 残りの空値（null）は、目録の形の定義に合わせて一律に扱う: 任意の欄は外し、必須の文字列は空文字、必須の数は 0（数の欄の未確認の印は上で付けた）
  nullsBySchema(r, ENTITY_SCHEMA as SchemaNode, '', changes);
  if (changes.length) r.normalizedFromResearch = changes;
  return { record: r, changes, workNotes };
}

interface PackSource { id: string; kind?: string; publisher?: string; title?: string; url?: string; checkedAt?: string }

/** 根拠カードが無い記録に、事例担当の材料（packs/<id>.json）の出典から根拠カードを作る。カードは出典の所在だけで、中身の主張はしない */
export function sourceCards(id: string, sources: PackSource[]): Record<string, unknown>[] {
  return sources.filter((s) => s.url && /^https?:\/\//.test(s.url)).map((s) => {
    const primary = s.kind === 'OFFICIAL' || s.kind === 'FILING';
    let hostName = '';
    try { hostName = new URL(s.url!).hostname.replace(/^www\./, ''); } catch { /* 上で http(s) を確認済み */ }
    return {
      id: `${id}_pack_source_${s.id}`, type: 'UNKNOWN_AUDIT', title: `出典: ${s.publisher ?? hostName}${s.title ? `（${s.title}）` : ''}`,
      badge: '出典', evidenceStatus: 'REPORTED', punchline: '事例の材料に使った出典の所在。内容の照合は事例の照合段で行う。',
      details: [`URL: ${s.url}`, `ホスト: ${hostName}`, ...(s.checkedAt ? [`確認日: ${s.checkedAt}`] : [])],
      url: s.url, sourceNote: `${primary ? 'official' : 'secondary'} source listed in case-rebuild pack ${s.url}`, sourceClass: primary ? 'PRIMARY' : 'INDEPENDENT_SECONDARY',
    };
  });
}

export function collect(manifestPath: string, artifactsDir: string, ids: string[], now = new Date(), packsDir?: string): AdditionFile {
  const text = readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(text) as { details: Record<string, string>; approvalCandidateIds?: string[] };
  const records: AdditionFile['records'] = [];
  for (const id of ids) {
    const detailsHash = manifest.details[id];
    if (!detailsHash) throw new Error(`${id}: 元の目録の details に無い`);
    const bytes = readFileSync(`${artifactsDir}/${detailsHash}.json.gz`);
    const json = gunzipSync(bytes).toString('utf8');
    if (sha256(json) !== detailsHash) throw new Error(`${id}: 中身の指紋が details のハッシュと合わない`);
    const { reader: _oldReader, ...record } = JSON.parse(json) as Record<string, unknown>;
    void _oldReader;
    if (record.id !== id) throw new Error(`${id}: 記録の id が違う（${String(record.id)}）`);
    const tags = Array.isArray(record.tags) ? (record.tags as string[]) : [];
    // 元の目録で審査待ちだったかどうかに関わらず、この目録では審査待ちとして足す（承認はこの目録の承認経路で行う）
    record.tags = tags.includes(REVIEW_TAG) ? tags : [...tags, REVIEW_TAG];
    const cards = Array.isArray(record.evidenceCards) ? record.evidenceCards : [];
    const packPath = packsDir ? `${packsDir}/${id}.json` : '';
    if (!cards.length && packPath && existsSync(packPath)) {
      const pack = JSON.parse(readFileSync(packPath, 'utf8')) as { sources?: PackSource[] };
      record.evidenceCards = sourceCards(id, pack.sources ?? []);
    }
    records.push({ id, provenance: { detailsHash, artifactSha256: sha256(bytes) }, record });
  }
  const parsed = parseFinancialEntitiesResiliently(records.map((r) => r.record));
  if (parsed.invalidEntities.length) throw new Error(`形式の検査に通らない記録がある: ${parsed.invalidEntities.length}件`);
  return { version: 1, source: { manifest: manifestPath, manifestSha256: sha256(text), artifactsDir, collectedAt: now.toISOString() }, records };
}

/**
 * 新しく調べた事例の記録（調査担当が書いた記録の配列 JSON）から足す。
 * 出所は調査ファイルのパスと指紋。記録ごとの detailsHash は記録そのものの指紋、artifactSha256 は調査ファイルの指紋。
 */
export function collectFromResearch(researchPath: string, now = new Date(), textChecks: readonly FactTextCheck[] = [basicFactTextCheck]): AdditionFile {
  const text = readFileSync(researchPath, 'utf8');
  const raw = JSON.parse(text) as unknown;
  const list = (Array.isArray(raw) ? raw : [raw]) as Record<string, unknown>[];
  if (!list.length) throw new Error('記録が1件も無い');
  const records: AdditionFile['records'] = list.map((raw) => {
    const norm = normalizeResearchRecord(raw, textChecks);
    const { reader: _reader, ...record } = norm.record;
    void _reader;
    const id = String(record.id ?? '');
    if (!/^ent_[\w-]+$/.test(id)) throw new Error(`id が ent_ で始まらない: ${id}`);
    // 公式サイトが無い事例（店舗だけ・匿名・閉業など）も足す。目録の既存の記録と同じく url は空文字で持つ
    if (typeof record.url !== 'string') record.url = '';
    const tags = Array.isArray(record.tags) ? (record.tags as string[]) : [];
    record.tags = tags.includes(REVIEW_TAG) ? tags : [...tags, REVIEW_TAG];
    // 根拠カードが無いと公開区分の判定（hasValidEvidenceLocator）で必ず落ちる。調査の出典一覧（reaudit.sources）から出典の所在カードを作る
    const cards = Array.isArray(record.evidenceCards) ? record.evidenceCards : [];
    const auditSources = ((record.reaudit as { sources?: { url?: string; publisher?: string; checkedAt?: string }[] } | undefined)?.sources ?? []);
    if (!cards.length && auditSources.length) {
      // 公式サイトが無い時は、全ての出典を公式以外として扱う
      const official = host(record.url);
      record.evidenceCards = sourceCards(id, auditSources.map((s, i) => ({
        id: String(i + 1), url: s.url, publisher: s.publisher, checkedAt: s.checkedAt, kind: official && host(s.url) === official ? 'OFFICIAL' : 'OTHER',
      })));
    }
    return { id, provenance: { detailsHash: sha256(JSON.stringify(record)), artifactSha256: sha256(text) }, ...(norm.workNotes.length ? { workNotes: norm.workNotes } : {}), record };
  });
  const parsed = parseFinancialEntitiesResiliently(records.map((r) => r.record));
  if (parsed.invalidEntities.length) throw new Error(`形式の検査に通らない記録がある: ${JSON.stringify(parsed.invalidEntities).slice(0, 800)}`);
  return { version: 1, source: { manifest: researchPath, manifestSha256: sha256(text), artifactsDir: '', collectedAt: now.toISOString() }, records };
}

/** 取り込みファイルの世代。ファイルに書いてあればそれ、無ければ名前の `gen<N>-`、どちらも無ければ第1世代 */
export function generationOfAddition(fileName: string, file: AdditionFile): number {
  const written = file.source?.generation;
  if (Number.isInteger(written) && (written as number) >= 1) return written as number;
  const m = /^gen(\d+)-/.exec(fileName);
  return m ? Math.max(1, Number(m[1])) : 1;
}

/** 新しく集める事例の既定の世代 = いま取り込み済みの最大の世代。新しい世代を始める時だけ --generation で指定する */
export function currentGeneration(dir = ADDITIONS_DIR): number {
  return readAdditions(dir).reduce((max, file) => Math.max(max, file.source.generation ?? 1), 1);
}

/** 目録に足す。足した id と、足さなかった id（理由）を返す。既存の記録は変えない */
export function mergeInto(index: Record<string, unknown>[], additions: AdditionFile[]): { next: Record<string, unknown>[]; added: string[]; skipped: { id: string; reason: string }[] } {
  const ids = new Set(index.map((e) => String(e.id)));
  // 同じ公式サイトの判定は、双方が url にサイトの入口を持つ時だけ（記事ページを url に持つ記録は持ち主ではない）
  const hosts = new Map(index.map((e) => [officialHost(e.url), String(e.id)] as const).filter(([h]) => h));
  const added: string[] = [];
  const skipped: { id: string; reason: string }[] = [];
  const next = [...index];
  for (const file of additions) {
    for (const { id, record } of file.records) {
      if (ids.has(id)) { skipped.push({ id, reason: '同じ id が既にある' }); continue; }
      const h = officialHost(record.url);
      if (h && hosts.has(h)) { skipped.push({ id, reason: `同じ公式サイトの事例が既にある: ${hosts.get(h)}` }); continue; }
      // 世代は取り込みファイルが決める。記録にある generation は、ファイルの世代で上書きする（第1世代は書かない = 既存の公開物と同じ形のまま）
      const rest = { ...record };
      delete rest.generation;
      const generation = file.source.generation ?? 1;
      next.push(generation > 1 ? { ...rest, generation } : rest);
      ids.add(id);
      if (h) hosts.set(h, id);
      added.push(id);
    }
  }
  return { next, added, skipped };
}

export function readAdditions(dir = ADDITIONS_DIR): AdditionFile[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => {
    const file = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')) as AdditionFile;
    return { ...file, source: { ...file.source, generation: generationOfAddition(f, file) } };
  });
}

/** 事実の文を差し戻す回数の上限。超えた項目は保留（取り込まないまま、理由を残す） */
export const MAX_RETURNS = 3;
const RETURN_STATE = 'data/runner/collect-return-state.json';
const RETURN_DIR = 'data/runner/instructions/collect-return';
const PLUGIN_DIR = 'scripts/architecture/fact-text-checks';

/**
 * 事実の文の検査をそろえる。既定（日本語か・程度の語）＋画面の文と同じ辞書（data/natural-japanese.json：不自然な言い回し、料金の欄の雑音）
 * ＋差し込み口 scripts/architecture/fact-text-checks/*.mjs（既定の出力が (text, fact) => string[] の関数）。表示の段で初めて落ちる、にしない。
 */
export async function loadFactTextChecks(): Promise<FactTextCheck[]> {
  const checks: FactTextCheck[] = [basicFactTextCheck];
  if (existsSync('data/natural-japanese.json')) {
    const rules = loadNaturalRules('data/natural-japanese.json');
    checks.push((text, fact) => [...findUnnatural(text, rules).map(describeHit), ...findNoise(text, { price: fact.kind === 'PRICING' })]);
  }
  if (existsSync(PLUGIN_DIR)) {
    for (const f of readdirSync(PLUGIN_DIR).filter((x) => x.endsWith('.mjs')).sort()) {
      const mod = (await import(pathToFileURL(`${process.cwd()}/${PLUGIN_DIR}/${f}`).href)) as { default?: FactTextCheck };
      if (typeof mod.default === 'function') checks.push(mod.default);
    }
  }
  return checks;
}

/**
 * 分けた項目を収集役へ差し戻す。回数を数え、上限未満なら直しの指示書を出し、上限に達した項目は保留として残す。
 * 指示書: data/runner/instructions/collect-return/<名前>.md（scripts/reader-case/collect-prompt.md の「直し方」と項目の一覧）
 */
export function returnToCollector(name: string, file: AdditionFile): { returned: number; held: number } {
  const state = (existsSync(RETURN_STATE) ? JSON.parse(readFileSync(RETURN_STATE, 'utf8')) : {}) as Record<string, number>;
  const back: Record<string, unknown>[] = []; let held = 0;
  for (const { id, record } of file.records) {
    for (const u of (record.unconfirmedFacts as { where: string; index?: number; item: Rec; reasonLabels?: string[]; detail?: string[] }[] | undefined) ?? []) {
      // 項目ごとの回数。位置（index）と出典で数える。文や金額を直しても同じ項目として数え、別の項目と回数を分け合わない
      const key = `${id}|${u.where}#${String(u.index ?? '')}|${String(u.item.sourceUrl ?? '')}`;
      const n = (state[key] ?? 0) + 1; state[key] = n;
      if (n >= MAX_RETURNS) { held += 1; (u as Record<string, unknown>).held = true; continue; }
      back.push({ entityId: id, where: u.where, attempt: n, reasons: u.reasonLabels, detail: u.detail, item: u.item });
    }
  }
  mkdirSync('data/runner', { recursive: true });
  writeFileSync(RETURN_STATE, `${JSON.stringify(state, null, 1)}\n`);
  if (back.length) {
    mkdirSync(RETURN_DIR, { recursive: true });
    const prompt = readFileSync('scripts/reader-case/collect-prompt.md', 'utf8');
    writeFileSync(`${RETURN_DIR}/${name}.md`, `${prompt}\n\n## 差し戻し（${back.length}項目。上限${MAX_RETURNS}回）\n\n直した記録を同じ調査記録に書き戻し、もう一度 --from-research を実行する。\n\n\`\`\`json\n${JSON.stringify(back, null, 1)}\n\`\`\`\n`);
  }
  return { returned: back.length, held };
}

/** --generation N があればそれ、無ければ名前の `gen<N>-`、それも無ければ取り込み済みの最大の世代 */
function chosenGeneration(flag: string | undefined, name: string): number {
  if (flag !== undefined) {
    const n = Number(flag);
    if (!Number.isInteger(n) || n < 1) throw new Error('--generation は1以上の整数');
    return n;
  }
  const m = /^gen(\d+)-/.exec(name);
  return m ? Number(m[1]) : currentGeneration();
}

async function main() {
  const args = process.argv.slice(2);
  const val = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
  if (args.includes('--collect')) {
    const manifest = val('--manifest'); const artifacts = val('--artifacts'); const name = val('--name');
    const ids = (val('--ids') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    if (!manifest || !artifacts || !name || !/^[\w-]+$/.test(name) || !ids.length) throw new Error('--manifest --artifacts --ids --name が要る');
    const file = collect(manifest, artifacts, ids, new Date(), val('--packs'));
    file.source.generation = chosenGeneration(val('--generation'), name);
    mkdirSync(ADDITIONS_DIR, { recursive: true });
    writeFileSync(`${ADDITIONS_DIR}/${name}.json`, `${JSON.stringify(file, null, 1)}\n`);
    console.log(JSON.stringify({ collected: file.records.length, file: `${ADDITIONS_DIR}/${name}.json` }));
    return;
  }
  if (args.includes('--from-research')) {
    const research = val('--from-research'); const name = val('--name');
    if (!research || !name || !/^[\w-]+$/.test(name)) throw new Error('--from-research <records.json> --name <name> が要る');
    const file = collectFromResearch(research, new Date(), await loadFactTextChecks());
    file.source.generation = chosenGeneration(val('--generation'), name);
    mkdirSync(ADDITIONS_DIR, { recursive: true });
    writeFileSync(`${ADDITIONS_DIR}/${name}.json`, `${JSON.stringify(file, null, 1)}\n`);
    // 出典ごとの権利の記録（data/source-rights-ledger.json）。台帳に無いドメインは自動で欄を作る（根拠が無ければ未確認。止めない）
    const ledgerResult = await recordRecordsToLedger(file.records.map((r) => r.record as Record<string, unknown>), 'add-entity-records(--from-research)');
    if (ledgerResult.error) console.error(`[rights] 権利台帳への記録に失敗（取り込みは続行）: ${ledgerResult.error}`);
    else if (ledgerResult.added.length) console.error(`[rights] 権利台帳に新しく記録: ${ledgerResult.added.join(', ')}`);
    // 数字の決まりを満たさず分けた数字（事例ごと）。0件でない時は、調査記録を直すか再収集する
    const back = returnToCollector(name, file);
    writeFileSync(`${ADDITIONS_DIR}/${name}.json`, `${JSON.stringify(file, null, 1)}\n`);
    const unconfirmedFacts = Object.fromEntries(file.records.map((r) => [r.id, ((r.record.unconfirmedFacts as unknown[] | undefined) ?? []).length]).filter(([, n]) => n));
    // 創業も転機も無い記録（料金と規約だけの薄い事例。storemapper の失敗）。止めずに知らせる
    const thinCases = file.records.filter((r) => !((r.record.facts as { kind?: string }[] | undefined) ?? []).some((f) => ['FOUNDING', 'EVENT', 'TEAM', 'CHANNEL', 'EXIT', 'FUNDING'].includes(String(f.kind)))).map((r) => r.id);
    console.log(JSON.stringify({ collected: file.records.length, file: `${ADDITIONS_DIR}/${name}.json`, unconfirmedFacts, thinCases, returned: back.returned, held: back.held, ...(back.returned ? { returnFile: `${RETURN_DIR}/${name}.md` } : {}) }));
    return;
  }
  if (args.includes('--apply')) {
    const path = 'data/entities-index.json';
    const index = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>[];
    const additions = readAdditions();
    const { next, added, skipped } = mergeInto(index, additions);
    if (!args.includes('--dry-run')) {
      const lr = await recordRecordsToLedger(additions.flatMap((a) => a.records).filter((r) => added.includes(r.id)).map((r) => r.record as Record<string, unknown>), 'add-entity-records(--apply)');
      if (lr.error) console.error(`[rights] 権利台帳への記録に失敗（取り込みは続行）: ${lr.error}`);
    }
    if (added.length && !args.includes('--dry-run')) { writeFileSync(`${path}.tmp`, JSON.stringify(next)); renameSync(`${path}.tmp`, path); }
    console.log(JSON.stringify({ added, skipped, dryRun: args.includes('--dry-run') }));
    return;
  }
  throw new Error('--collect か --from-research か --apply を指定する');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) void main();

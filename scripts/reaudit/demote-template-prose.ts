/**
 * 使い回し作文（テンプレ文）の取り下げ（2026-09-30, 2回目の抜き取り監査の残り）
 *
 * 判定は scripts/architecture/template-prose-lib.mjs（check-template-prose.mjs と共通）:
 * 欄ごとに、社名・数字・空白を除いた文が3件以上で使われている（または先頭8字＋末尾12字が同じ長文の文枠）ものをテンプレとする。
 * 開示文（未確認・確認できず・出典の帰属など）と、reaudit.supported / 出典つきカードにある文は落とさない。
 *
 * 処理（対象は narrativeStatus を問わない。テンプレと判定された値だけを変える）:
 *  1. description: テンプレ文と、取り下げ済みの旧文（priorNarrative / priorTagline と同一で出典なし）を除く。何も残らなければ "未確認"。
 *  2. secretInsight（トップ階層と strategy 内）ほか文字列の説明欄: テンプレなら "未確認"（出典に基づく文は残す）。
 *  3. evidenceCards: type=DIRTY_GENESIS を外す。出典の無い作文カード（タイトル/要約がテンプレ）も外す。
 *  4. observations / observationsStream: 使い回される【…】ラベルで始まる文を外す。ほか使い回し文を除く。
 *  5. operations.toolStack: 出典の無い項目のうち、使い回されている別業種テンプレ、または人数が確認済みなのに出典の無い項目を外す（[] にする）。
 *  6. tagline: テンプレ、または取り下げ済みの旧文で出典の無いものは "未確認"。
 * 外した値は reaudit.legacyDisplaySnapshot.priorNarrative に退避する（削除しない）:
 *  templateProse[<欄>] = 元の文字列 / evidenceCards[] / observations[] / observationsStream[] / toolStack[]
 * 冪等: 退避済みの値は上書きしない。2回目以降は何も変えない。
 *
 * 使い方: node --import tsx scripts/reaudit/demote-template-prose.ts [--dry-run]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseFinancialEntity } from '../../src/shared/financial-entity-schema';
import {
  boundEvidenceIds,
  buildTemplateIndex,
  isExemptSentence,
  isSourcedObservation,
  isUnsourcedLabelled,
  isSourcedToolEntry,
  isSupportedSentence,
  isTrustedCard,
  normalizeProse,
  splitSentences,
  SOURCED_REWRITE_STATUSES,
} from '../architecture/template-prose-lib.mjs';

type AnyRecord = Record<string, unknown>;
const rec = (v: unknown): AnyRecord => (v && typeof v === 'object' && !Array.isArray(v) ? (v as AnyRecord) : {});
const isStr = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

const UNCONFIRMED = '未確認';
const DATE = '2026-09-30';
const dryRun = process.argv.includes('--dry-run');
const indexPath = resolve(process.cwd(), 'data/entities-index.json');

const TOP_TEXT_FIELDS = ['tagline', 'description', 'architecturePattern', 'pipelineStack', 'targetPainWallet', 'moatDescription', 'incumbentDilemma', 'blindspot', 'secretInsight'] as const;
const STRATEGY_TEXT_FIELDS = ['moatDescription', 'blindspot', 'secretInsight', 'incumbentDilemma', 'coldOutreachTemplate'] as const;
const STRATEGY_ARRAY_FIELDS = ['initialTraction', 'actionPlaybook'] as const;

const counts: Record<string, number> = {};
const bump = (k: string, n = 1) => { counts[k] = (counts[k] ?? 0) + n; };

/** 末尾の句点の有無だけの違いは同じ文とみなす。 */
const cmpNorm = (v: string, e: AnyRecord) => normalizeProse(v, e).replace(/[。．.]+$/, '');

/** 取り下げ済みの旧文（priorNarrative 等）を集める。priorTagline は別扱い（下の priorTaglineNorms）。 */
function withdrawnStrings(e: AnyRecord): Set<string> {
  const out = new Set<string>();
  const snap = rec(rec(e.reaudit).legacyDisplaySnapshot);
  const walk = (v: unknown, depth: number) => {
    if (depth > 6) return;
    if (typeof v === 'string') { const n = cmpNorm(v, e); if (n.length >= 12) out.add(n); }
    else if (Array.isArray(v)) v.forEach((x) => walk(x, depth + 1));
    else if (v && typeof v === 'object') Object.values(v as AnyRecord).forEach((x) => walk(x, depth + 1));
  };
  for (const key of ['priorNarrative', 'priorAdditionalNarrative', 'priorAdditionalFields', 'priorSecretInsight']) walk(snap[key], 0);
  return out;
}

/** 旧表示の tagline（【月商…】などの見出しを外した形も）。 */
function priorTaglineNorms(e: AnyRecord): string[] {
  const priorTagline = String(rec(rec(e.reaudit).legacyDisplaySnapshot).priorTagline ?? '');
  return [priorTagline, priorTagline.replace(/^【[^】]*】/, '')].map((v) => cmpNorm(v, e)).filter((n) => n.length >= 12);
}

function main() {
  const entities: AnyRecord[] = JSON.parse(readFileSync(indexPath, 'utf8'));
  const index = buildTemplateIndex(entities as never[]);
  const reusedLabel = index.isReusedLabel;

  for (const e of entities) {
    const before = JSON.stringify(e);
    let prior: AnyRecord | null = null;
    const priorNarrative = (): AnyRecord => {
      if (prior) return prior;
      const reaudit = rec(e.reaudit);
      const snap = rec(reaudit.legacyDisplaySnapshot);
      if (!snap.status) Object.assign(snap, { status: 'SUPERSEDED_NOT_PRIMARY_VALIDATED', supersededAt: DATE, method: 'SCRIPTED_TEMPLATE_PROSE_DEMOTION_V1' });
      const pn = rec(snap.priorNarrative);
      snap.priorNarrative = pn;
      reaudit.legacyDisplaySnapshot = snap;
      e.reaudit = reaudit;
      prior = pn;
      return pn;
    };
    const stash = (field: string, value: unknown) => {
      const pn = priorNarrative();
      const bucket = rec(pn.templateProse);
      if (bucket[field] === undefined) bucket[field] = value;
      pn.templateProse = bucket;
    };
    const stashList = (key: string, items: unknown[]) => {
      if (!items.length) return;
      const pn = priorNarrative();
      const list = Array.isArray(pn[key]) ? (pn[key] as unknown[]) : [];
      for (const it of items) if (!list.some((x) => JSON.stringify(x) === JSON.stringify(it))) list.push(it);
      pn[key] = list;
    };

    const withdrawnBase = withdrawnStrings(e);
    const priorTagNorms = priorTaglineNorms(e);
    // tagline: 旧 tagline と同じ現行 tagline は、取り下げ時に出典ページの自己紹介文をそのまま残したもの（Indie Hackers 掲載ページ等）なので旧AI文として扱わない。
    // description: 現行 tagline と同じ先頭文は上のケースなので残す。現行 tagline と違う旧 tagline は取り下げ済みの旧AI文。
    const withdrawnFor = (field: string): Set<string> => {
      const set = new Set(withdrawnBase);
      if (field === 'tagline') { for (const n of priorTagNorms) set.delete(n); return set; }
      const cur = isStr(e.tagline) && e.tagline !== UNCONFIRMED ? cmpNorm(e.tagline as string, e) : '';
      for (const n of priorTagNorms) if (n !== cur) set.add(n);
      if (cur) set.delete(cur);
      return set;
    };
    const essence0 = rec(e.essence);
    const cleanText = (field: string, value: unknown, useWithdrawn: boolean): string | null => {
      const withdrawn = useWithdrawn ? withdrawnFor(field) : new Set<string>();
      if (!isStr(value) || value === UNCONFIRMED) return null;
      const kept: string[] = [];
      let dropped = false;
      for (const s of splitSentences(value)) {
        const supported = isSupportedSentence(s, e as never);
        let gone = !isExemptSentence(s) && !supported && (index.isTemplate(field, s, e as never) || withdrawn.has(cmpNorm(s, e)));
        // description は取り下げ前の旧AI文が丸ごと残っている（未監査の）レコードでは、出典の裏づけ（supported・出典カード）か
        // 現行の tagline / essence.whatItDoes と同じ文だけを残す。書き直し済みレコード（REWRITTEN / REPLACED）は言い換えなので対象外。
        if (!gone && field === 'description' && !SOURCED_REWRITE_STATUSES.has(String(rec(e.reaudit).narrativeStatus)) && !isExemptSentence(s) && !supported) {
          const n = cmpNorm(s, e);
          const shown = [e.tagline, essence0.whatItDoes].filter(isStr).filter((v) => v !== UNCONFIRMED).map((v) => cmpNorm(v, e));
          if (!shown.includes(n)) { gone = true; bump('description(unsourced head)'); }
        }
        if (gone) dropped = true; else kept.push(s);
      }
      if (!dropped) return null;
      const text = kept.join('');
      return /[^\s。．.、,]/.test(text) ? text : UNCONFIRMED;
    };

    // 6 → 1 → 2: 文字列の説明欄
    for (const f of TOP_TEXT_FIELDS) {
      const next = cleanText(f, e[f], f === 'tagline' || f === 'description');
      if (next === null) continue;
      stash(f, e[f]);
      e[f] = next;
      bump(f === 'secretInsight' ? 'secretInsight(top)' : f);
    }
    const essence = rec(e.essence);
    for (const k of Object.keys(essence)) {
      const next = cleanText(`essence.${k}`, essence[k], false);
      if (next === null) continue;
      stash(`essence.${k}`, essence[k]);
      essence[k] = next;
      bump(`essence.${k}`);
    }
    const strategy = rec(e.strategy);
    for (const k of STRATEGY_TEXT_FIELDS) {
      const next = cleanText(`strategy.${k}`, strategy[k], false);
      if (next === null) continue;
      stash(`strategy.${k}`, strategy[k]);
      strategy[k] = k === 'coldOutreachTemplate' ? '' : next;
      bump(`strategy.${k}`);
    }
    for (const k of STRATEGY_ARRAY_FIELDS) {
      const arr = strategy[k];
      if (!Array.isArray(arr)) continue;
      const removed = arr.filter((v) => typeof v === 'string' && !isExemptSentence(v) && !isSupportedSentence(v, e as never) && splitSentences(v).some((s) => index.isTemplate(`strategy.${k}`, s, e as never)));
      if (!removed.length) continue;
      stashList(`strategy.${k}`, removed);
      strategy[k] = arr.filter((v) => !removed.includes(v));
      bump(`strategy.${k}`, removed.length);
    }

    // 3: evidenceCards
    if (Array.isArray(e.evidenceCards)) {
      const removed: AnyRecord[] = [];
      const keep: unknown[] = [];
      const bound = boundEvidenceIds(e as never);
      for (const c of e.evidenceCards as AnyRecord[]) {
        if (bound.has(String(c?.id))) { keep.push(c); bump('evidenceCards(kept: claimBinding evidence)'); continue; }
        let drop = c?.type === 'DIRTY_GENESIS';
        if (!drop && !isTrustedCard(c)) {
          for (const f of ['title', 'summary', 'punchline'] as const) {
            if (isStr(c?.[f]) && splitSentences(c[f] as string).some((s) => index.isTemplate(`evidenceCards.${f}`, s, e as never))) drop = true;
          }
          if (drop) bump(`evidenceCards(other:${String(c?.type)})`);
        } else if (drop) bump('evidenceCards(DIRTY_GENESIS)');
        if (drop) removed.push(c); else keep.push(c);
      }
      if (removed.length) {
        stashList('evidenceCards', removed);
        e.evidenceCards = keep;
        bump('evidenceCards(records)');
        if (keep.length === 0) {
          // 表示側の最低1枚の要件（check-ingest-quality）を満たすため、取り下げた事実だけを述べる開示カードを1枚置く（作文ではない）
          e.evidenceCards = [{
            id: `${String(e.id)}_reaudit_template_prose_withdrawn`,
            type: 'UNKNOWN_AUDIT',
            title: '未確認の項目',
            badge: '未確認',
            evidenceStatus: 'UNKNOWN',
            punchline: '事業実態・手口・現金の流れは出典で確認できていないため未確認。',
            details: [
              '未確認: 事業実態・手口・現金着金・原価構造（出典が見つかっていない）',
              `次の作業: 公式サイトと本人の一次発信を再取得し、出典・時点・利用条件付きで個別再監査する（${DATE} 時点）`,
            ],
            sourceNote: 'scripted template-prose demotion / research limits disclosure',
            sourceClass: 'PRIMARY',
          }];
          bump('evidenceCards(disclosure card added)');
        }
      }
    }

    // 4: observations / observationsStream
    if (Array.isArray(e.observations)) {
      const removed: string[] = [];
      const keep: string[] = [];
      for (const o of e.observations as unknown[]) {
        if (typeof o !== 'string') { keep.push(o as never); continue; }
        if (reusedLabel(o) || isUnsourcedLabelled(o)) { removed.push(o); bump('observations(label)'); continue; }
        if (isSourcedObservation(o)) { keep.push(o); continue; }
        const sentences = splitSentences(o);
        const tpl = sentences.filter((s) => !isExemptSentence(s) && !isSupportedSentence(s, e as never) && index.isTemplate('observations', s, e as never));
        if (!tpl.length) { keep.push(o); continue; }
        const rest = sentences.filter((s) => !tpl.includes(s)).join('');
        removed.push(o);
        bump('observations(template)');
        if (rest) keep.push(rest);
      }
      if (removed.length) {
        stashList('observations', removed);
        e.observations = keep;
        bump('observations(records)');
      }
    }
    if (Array.isArray(e.observationsStream)) {
      const removed = (e.observationsStream as AnyRecord[]).filter((o) => reusedLabel(o?.text) || isUnsourcedLabelled(o?.text, o?.sourceUrl));
      if (removed.length) {
        stashList('observationsStream', removed);
        e.observationsStream = (e.observationsStream as AnyRecord[]).filter((o) => !removed.includes(o));
        bump('observationsStream(label)', removed.length);
      }
    }

    // 5: operations.toolStack
    const ops = rec(e.operations);
    if (Array.isArray(ops.toolStack)) {
      const teamKnown = typeof ops.teamSize === 'number' && ops.teamSize !== 0 && !ops.isTeamSizeUnconfirmed;
      const removed: AnyRecord[] = [];
      const keep: AnyRecord[] = [];
      for (const t of ops.toolStack as AnyRecord[]) {
        const sourced = isSourcedToolEntry(t) || (isStr(t?.name) && isSupportedSentence(t.name as string, e as never));
        const drop = !sourced && (index.isTemplate('operations.toolStack', String(t?.name ?? ''), e as never) || teamKnown);
        if (drop) removed.push(t); else keep.push(t);
      }
      if (removed.length) {
        stashList('toolStack', removed);
        ops.toolStack = keep;
        bump('toolStack(entries)', removed.length);
        bump('toolStack(records)');
      }
    }

    if (JSON.stringify(e) !== before) {
      const snap = rec(rec(e.reaudit).legacyDisplaySnapshot);
      if (!snap.templateProseDemotedAt) snap.templateProseDemotedAt = DATE;
      parseFinancialEntity(e);
      bump('records changed');
    }
  }
  console.log(JSON.stringify(counts, null, 1));
  if (!dryRun) writeFileSync(indexPath, JSON.stringify(entities, null, 2), 'utf8');
}

main();

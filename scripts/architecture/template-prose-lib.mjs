/**
 * 公開前データの「使い回し作文（テンプレ文）」を見つける共通ロジック。
 * scripts/architecture/check-template-prose.mjs（公開版を守る自動チェック）と
 * scripts/reaudit/demote-template-prose.ts（取り下げスクリプト）が同じ判定を使う。
 *
 * 判定: 欄ごとに、文（。改行で分割）から「社名・創業者名・数字・空白」を除いた形を作り、
 * (a) その形が3件以上のレコードで使われている、または
 * (b) 先頭8字と末尾12字が同じ長文（40字以上）が5件以上のレコードで使われている（差し替え穴埋め型の文枠）
 * ものをテンプレとする。長さ20字未満の文は一般語（"Web" など）なので対象外。
 */

export const MIN_REPEAT = 3;
export const MIN_LEN = 20;
export const FRAME_MIN_LEN = 40;
/** 文枠（先頭8字＋末尾12字）だけが同じ文は、出典から言い換えた別々の文が偶然似る余地があるので、完全一致（3件）より厳しく5件以上で判定する。 */
export const FRAME_MIN_REPEAT = 5;

/**
 * 除外リスト（開示文）。これらは「何が未確認か」「どの出典に何が書いてあるか」を述べる文で、作文ではない。
 * 根拠: 再監査で意図的に同じ定型で書く開示文。落とすと未確認の理由・出典の表示が消える。
 *  1. 未確認・確認できず・未検証・未実施・記載なし・不明・独立確認なし・再監査中/取り下げ = 空白の明示
 *  3. 取得結果の記録（HTTPステータス・保存記録・公開タグ・引用URL・到達性の注意書き）
 *  2. 出典の帰属（出典:/確認日:/権利:/本人申告/報告値/掲載ページ/収益ページ/記事記載/公式サイト等）= 事実の出所の明示
 * 既知のテンプレ（「無駄な多機能を排し…」「市場の盲点を突き…」「既存大手の死角（…」「【顧客の切実な需要】」等）はどちらにも当たらない。
 */
export const EXEMPT_PATTERNS = [
  /^(未確認|UNKNOWN)[。.]?$/,
  /未確認|UNKNOWN|確認でき(ず|ない|なかった|ていない)|確認していない|未検証|未実施|記載(は|が)?な[いかし]|^不明|(は|が)不明|不明[（(。]|独立(した|に|の)?(会計)?(確認|検証)|裏付け(は|が)?(見つか|得られ)|再監査|再調査|取り下げ|推計は挿入していない/,
  /出典|確認日|権利[:：]|本人申告|報告値|第三者(の|による|報告|提供|プロフィール)|掲載ページ|収益(ページ|欄)|記事記載|記事は|公式(サイト|URL|ページ|ドメイン|資料|求人)|Indie Hackers\s?(掲載|公開|の公開|収益|の収益|のページ)|IH の|eBiz Facts?(の|記事)/,
  // 3. 監査ログの定型（到達性の注意書き、保存記録、公開タグ、引用URL）= 取得結果の記録
  /証拠ではない|裏付けには使わない|示すものではない|Internet Archive|Wayback|CDX|HTTP\s?[0-9]{3}|公開タグ|引用するURL|取得(した|でき|に失敗)|表示がな|と表示/,
];

export function isExemptSentence(sentence) {
  // 〔金額未確認〕〔率未確認〕などは数字を伏せた印で、開示文ではない（旧AI文の金額だけ伏せたものに付く）。判定から外す。
  const t = sentence.replace(/〔[^〕]{0,12}未確認〕/g, '');
  return EXEMPT_PATTERNS.some((re) => re.test(t));
}

/** 観測の文字列全体に出典・未確認・取得結果の記録が含まれるなら、その観測は出典つきの記述として文単位の判定をしない。 */
export function isSourcedObservation(text) {
  return typeof text === 'string' && !LABEL_RE.test(text) && isExemptSentence(text);
}

export const LABEL_RE = /^【[^】]{1,40}】/;

/** 【…】で始まり、出典（出典表記・URL）が無い観測 = 旧AIの見出し付き作文。件数に関わらずテンプレ扱い。 */
export function isUnsourcedLabelled(text, sourceUrl) {
  return typeof text === 'string' && LABEL_RE.test(text) && !sourceUrl && !/出典|https?:\/\//.test(text);
}

/** 【…】ラベルで始まる観測・観測ストリームの、ラベルごとの使用レコード数。 */
export function labelUsage(entities) {
  const use = new Map();
  for (const e of entities) {
    const texts = [...(Array.isArray(e.observations) ? e.observations : []), ...(Array.isArray(e.observationsStream) ? e.observationsStream.map((o) => o?.text) : [])];
    for (const t of texts) {
      const m = typeof t === 'string' ? t.match(LABEL_RE) : null;
      if (!m) continue;
      let set = use.get(m[0]);
      if (!set) use.set(m[0], (set = new Set()));
      set.add(e.id);
    }
  }
  return use;
}

export function isSourcedToolEntry(t) {
  return Boolean(t && (t.url || t.sourceUrl || t.isCostUnconfirmed === true || (t.purpose && isExemptSentence(String(t.purpose)))));
}

/**
 * 出典つきカード（除外リスト3）: 再監査が書いた出典カード(UNKNOWN_AUDIT: 出典/調査限界)と、sourceUrl/observedAt を持つ深掘りカード。
 * 事実の出所や未確認の範囲を述べるカードで、同じ定型文が並ぶのが正しい。作文カード(DIRTY_GENESIS/LOOT_BLUEPRINT/THE_CRIME/INCUMBENT_TRAP)には付かない。
 */
export function isTrustedCard(c) {
  return Boolean(c && (c.type === 'UNKNOWN_AUDIT' || c.sourceUrl || c.observedAt));
}

/** claimBindings が根拠として参照しているカードID。check-ingest-quality が「参照先が無い」で落とすので、テンプレ判定でも取り下げでも触らない（残件として報告）。 */
export function boundEvidenceIds(entity) {
  const ids = new Set();
  for (const b of Array.isArray(entity.claimBindings) ? entity.claimBindings : []) if (b && typeof b.evidenceId === 'string') ids.add(b.evidenceId);
  return ids;
}

const trustCache = new WeakMap();
/** reaudit.supported と出典つきカードの本文を、正規化して連結したもの（この中にある文は出典に基づく）。 */
export function trustedNorm(entity) {
  let v = trustCache.get(entity);
  if (v !== undefined) return v;
  const parts = [];
  const supported = entity.reaudit && Array.isArray(entity.reaudit.supported) ? entity.reaudit.supported : [];
  for (const line of supported) if (typeof line === 'string') parts.push(line);
  for (const c of Array.isArray(entity.evidenceCards) ? entity.evidenceCards : []) {
    if (!isTrustedCard(c)) continue;
    for (const f of [c.title, c.summary, c.punchline, c.snippet]) if (typeof f === 'string') parts.push(f);
    if (Array.isArray(c.details)) for (const d of c.details) if (typeof d === 'string') parts.push(d);
  }
  v = normalizeProse(parts.join('\n'), entity);
  trustCache.set(entity, v);
  return v;
}

export function isSupportedSentence(sentence, entity) {
  const n = normalizeProse(sentence, entity);
  return n.length >= 8 && trustedNorm(entity).includes(n);
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function nameTokens(entity) {
  const out = new Set();
  const add = (v) => { if (typeof v === 'string' && v.trim().length > 1) out.add(v.trim()); };
  for (const v of [entity.name, entity.legalEntity, entity.founder]) add(v);
  const bare = typeof entity.name === 'string' ? entity.name.replace(/[（(].*?[）)]/g, '').trim() : '';
  add(bare);
  for (const src of [bare, entity.founder]) {
    if (typeof src !== 'string') continue;
    for (const tok of src.split(/[\s/、,，・]+/)) if (tok.replace(/[^\p{L}]/gu, '').length >= 4) add(tok);
  }
  return [...out].sort((a, b) => b.length - a.length);
}

export function normalizeProse(text, entity) {
  let t = String(text);
  for (const n of nameTokens(entity)) t = t.replace(new RegExp(escapeRe(n), 'g'), '');
  return t.replace(/[0-9０-９]+([.,][0-9]+)*/g, '').replace(/[\s　]+/g, '');
}

export function splitSentences(text) {
  // 半角の ! ? は URL（?id=）や英語の引用に出るので切れ目にしない
  return String(text).split(/(?<=[。！？])|\n+/).map((s) => s.trim()).filter(Boolean);
}

function frameKey(norm) {
  return norm.length >= FRAME_MIN_LEN ? `${norm.slice(0, 8)}…${norm.slice(-12)}` : null;
}

const isStr = (v) => typeof v === 'string' && v.trim().length > 0;

/**
 * 出典から書き直したレコード（REWRITTEN / REPLACED_BY_SOURCED_FACTS）の説明欄は、出典ごとの言い換え。
 * 別々の出典が同じ事実（同じライセンス・同じ料金表示なし等）を述べると同一文になり得るので、これらの欄は使い回し判定の対象外にする。
 * 作文が残りやすい description / secretInsight / strategy / evidenceCards / observations / toolStack / tagline は対象のまま。
 */
export const SOURCED_REWRITE_STATUSES = new Set([
  'REWRITTEN_FROM_TIER1_TIER2_SOURCES_20260929',
  'AI_NARRATIVE_REPLACED_BY_SOURCED_FACTS_20260929',
]);
export const SOURCED_REWRITE_EXEMPT_FIELDS = /^(architecturePattern|pipelineStack|targetPainWallet|essence\.)/;

const STRATEGY_STRING_KEYS = ['moatDescription', 'blindspot', 'secretInsight', 'incumbentDilemma', 'coldOutreachTemplate'];
const STRATEGY_ARRAY_KEYS = ['initialTraction', 'actionPlaybook'];
const TOP_STRING_KEYS = ['tagline', 'description', 'architecturePattern', 'pipelineStack', 'targetPainWallet', 'moatDescription', 'incumbentDilemma', 'blindspot', 'secretInsight'];

/** 画面に出る自由文欄の値を {field, text} で列挙する（欄名 = 使い回し判定の単位）。 */
export function collectUnits(entity) {
  const units = [];
  const rewritten = SOURCED_REWRITE_STATUSES.has(entity.reaudit?.narrativeStatus);
  const push = (field, text) => {
    if (rewritten && SOURCED_REWRITE_EXEMPT_FIELDS.test(field)) return;
    if (isStr(text)) units.push({ field, text });
  };
  for (const k of TOP_STRING_KEYS) push(k, entity[k]);
  const essence = entity.essence && typeof entity.essence === 'object' ? entity.essence : {};
  for (const k of Object.keys(essence)) push(`essence.${k}`, essence[k]);
  const strategy = entity.strategy && typeof entity.strategy === 'object' ? entity.strategy : {};
  for (const k of STRATEGY_STRING_KEYS) push(`strategy.${k}`, strategy[k]);
  for (const k of STRATEGY_ARRAY_KEYS) if (Array.isArray(strategy[k])) for (const v of strategy[k]) push(`strategy.${k}`, typeof v === 'string' ? v : null);
  for (const c of Array.isArray(entity.evidenceCards) ? entity.evidenceCards : []) {
    if (isTrustedCard(c) || boundEvidenceIds(entity).has(c?.id)) continue;
    push('evidenceCards.title', c?.title);
    push('evidenceCards.summary', c?.summary);
    push('evidenceCards.punchline', c?.punchline);
  }
  for (const o of Array.isArray(entity.observations) ? entity.observations : []) if (!isSourcedObservation(o)) push('observations', o);
  const tools = Array.isArray(entity.operations?.toolStack) ? entity.operations.toolStack : [];
  for (const t of tools) if (t && isStr(t.name) && !isSourcedToolEntry(t)) push('operations.toolStack', t.name);
  return units;
}

/** 全レコードから欄ごとの使い回し件数を数え、テンプレ判定器を返す。 */
export function buildTemplateIndex(entities) {
  const exact = new Map();
  const frames = new Map();
  const bump = (map, key, idx) => { let s = map.get(key); if (!s) map.set(key, (s = new Set())); s.add(idx); };
  entities.forEach((entity, idx) => {
    for (const { field, text } of collectUnits(entity)) {
      const sentences = field === 'operations.toolStack' ? [text] : splitSentences(text);
      for (const s of sentences) {
        if (isExemptSentence(s) || isSupportedSentence(s, entity)) continue;
        const norm = normalizeProse(s, entity);
        if (norm.length < MIN_LEN) continue;
        bump(exact, `${field}\u0000${norm}`, idx);
        const fk = frameKey(norm);
        if (fk) bump(frames, `${field}\u0000${fk}`, idx);
      }
    }
  });
  /** sentence が欄 field でテンプレなら、使い回し件数と群のキーを返す（違えば null）。 */
  function match(field, sentence, entity) {
    if (SOURCED_REWRITE_STATUSES.has(entity.reaudit?.narrativeStatus) && SOURCED_REWRITE_EXEMPT_FIELDS.test(field)) return null;
    if (isExemptSentence(sentence) || isSupportedSentence(sentence, entity)) return null;
    const norm = normalizeProse(sentence, entity);
    if (norm.length < MIN_LEN) return null;
    const n = exact.get(`${field}\u0000${norm}`)?.size ?? 0;
    if (n >= MIN_REPEAT) return { count: n, key: `${field}\u0000${norm}` };
    const fk = frameKey(norm);
    const m = fk ? frames.get(`${field}\u0000${fk}`)?.size ?? 0 : 0;
    return m >= FRAME_MIN_REPEAT ? { count: m, key: `${field}\u0000frame\u0000${fk}` } : null;
  }
  const labels = labelUsage(entities);
  /** 3件以上のレコードが同じ【…】ラベルで始まる文を持つなら、そのラベルはテンプレ（中身は社ごとに違っても枠が使い回し）。 */
  const isReusedLabel = (text) => {
    const m = typeof text === 'string' ? text.match(LABEL_RE) : null;
    return Boolean(m && (labels.get(m[0])?.size ?? 0) >= MIN_REPEAT);
  };
  return { match, isTemplate: (f, s, e) => match(f, s, e) !== null, isReusedLabel, labels };
}

/** チェック用: 使い回しがある文の群を件数の多い順に返す。 */
export function findTemplateViolations(entities) {
  const index = buildTemplateIndex(entities);
  const groups = new Map();
  for (const entity of entities) {
    for (const { field, text } of collectUnits(entity)) {
      const sentences = field === 'operations.toolStack' ? [text] : splitSentences(text);
      for (const s of sentences) {
        const m = index.match(field, s, entity);
        if (!m) continue;
        const g = groups.get(m.key) ?? { field, sentence: s, count: m.count, entities: new Set() };
        g.entities.add(entity.id);
        groups.set(m.key, g);
      }
    }
  }
  const unsourced = new Set();
  const sample = new Map();
  for (const entity of entities) {
    for (const o of Array.isArray(entity.observations) ? entity.observations : []) {
      if (isUnsourcedLabelled(o)) { unsourced.add(entity.id); if (!sample.has('o')) sample.set('o', o); }
    }
    for (const o of Array.isArray(entity.observationsStream) ? entity.observationsStream : []) {
      if (isUnsourcedLabelled(o?.text, o?.sourceUrl)) { unsourced.add(entity.id); if (!sample.has('o')) sample.set('o', o.text); }
    }
  }
  if (unsourced.size) groups.set('unsourced-label', { field: 'observations(出典なしの【ラベル】文)', sentence: sample.get('o'), count: unsourced.size, entities: unsourced });
  for (const [label, ids] of index.labels) {
    if (ids.size >= MIN_REPEAT) groups.set(`label\u0000${label}`, { field: 'observations(【ラベル】)', sentence: `${label}…`, count: ids.size, entities: ids });
  }
  return [...groups.values()].sort((a, b) => b.count - a.count);
}

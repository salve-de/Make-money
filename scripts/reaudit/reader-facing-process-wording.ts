/**
 * 読者の画面から作業の経緯の言葉（再調査・再抽出・取り下げ・以前の表示）を除き、同じ意味の事実だけを残す（2026-09-30）
 *
 * 対象: entities-index.json の画面に出る欄（reaudit / meta / sourceMetadata / id は対象外）。日付・金額は元の値を保つ。
 * 元の文は reaudit.legacyDisplaySnapshot.priorNarrative.readerCleanup.processWording へ {path, before} で退避する（既存の中身は消さない）。
 * 冪等: 2回目以降は何も変えない。書き込み前に変更した全件を parseFinancialEntity で検証する。
 * 規則に当てはまらないが経緯の語を含む文は変更せず、報告に一覧する。
 *
 * 使い方: node --import tsx scripts/reaudit/reader-facing-process-wording.ts [--dry-run]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseFinancialEntity } from '../../src/shared/financial-entity-schema';

type AnyRecord = Record<string, unknown>;
const rec = (v: unknown): AnyRecord => (v && typeof v === 'object' && !Array.isArray(v) ? (v as AnyRecord) : {});
const canon = (v: unknown): string => JSON.stringify(v, (_k, val) => (val && typeof val === 'object' && !Array.isArray(val)
  ? Object.fromEntries(Object.entries(val as AnyRecord).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
  : val));

const DATE = '2026-09-30';
const dryRun = process.argv.includes('--dry-run');
const indexPath = resolve(process.cwd(), 'data/entities-index.json');
const counts: Record<string, number> = {};
const bump = (k: string, n = 1) => { counts[k] = (counts[k] ?? 0) + n; };
const leftovers = new Map<string, number>();

export const PROCESS_WORDING_RE = /再調査|再抽出|取り下げ(た|ました|済み)|以前(の|表示していた)(数値|表示|損益|説明)|旧表示|【致命的死角】|緊急性と恥を広告で刺激し/;

const DELETE = Symbol('delete');
const EXACT: Record<string, string> = {
  '推計は入れていません。以前表示していた月次の損益は、出典で裏づけられないため取り下げました。':
    '推計は入れていません。月次の損益は出典で確認できていないため未確認です。',
  '推計は入れていません。財務数値は根拠が見つかっていないため未確認です。以前の表示は取り下げました。':
    '推計は入れていません。財務数値は出典で確認できていないため未確認です。',
  '本人申告の要約（記事から再抽出した金額・期間）': '本人申告の要約（記事に載った金額・期間）',
  '調査限界: 出典の無い作文カードを取り下げた': '未確認の項目',
  '調査限界: 出典の無い旧表示を取り下げた': '未確認の項目',
  '月商・利益・原価・手残りは公式資料で確認できていない。以前の数値は出典不足のため取り下げた。':
    '月商・利益・原価・手残りは公式資料で確認できていない。',
  '月商・利益・原価・手残り、チーム規模、創業年、集客経路、ツール構成は未確認。以前の数値は出典不足のため取り下げた。':
    '月商・利益・原価・手残り、チーム規模、創業年、集客経路、ツール構成は未確認。',
  '事業実態・手口・現金着金などの作文カードは出典で裏付けられないため取り下げた。出典が付いていない記述は未確認。':
    '事業実態・手口・現金の流れは出典で確認できていないため未確認。',
  '損益・運営指標・料金・手口などの旧表示は出典で裏付けられないため取り下げた。出典が付いていない記述は未確認。':
    '損益・運営指標・料金・手口は出典で確認できていないため未確認。',
  '出典URLが無いため、以前の数値と説明は取り下げた。': '出典URLが無いため、数値と説明は未確認。',
  // 倒産事例カードの見出し・要約に残っていた解釈の作文（本文の details は SEC 提出書類の記載）
  '【致命的死角】見せかけの急成長と解約不能な固定負債の罠': '閉鎖までの経緯（SEC提出書類の記載）',
  'ペット用品の緊急性と恥を広告で刺激し、顧客獲得費が一回の注文粗利を恒常的に上回った。': '閉鎖までの資金と事業の経緯。',
};

function fix(path: string, s: string): string | typeof DELETE | null {
  if (EXACT[s]) return EXACT[s];
  if (path === 'pnl.dataSnapshotPeriod' && /^\d{4}-\d{2}-\d{2} 個別再調査（財務数値は未確認）$/.test(s)) return DELETE;
  if (path === 'temporal.dataSnapshotPeriod') {
    const m = s.match(/^(\d{4}-\d{2}-\d{2}) 個別再調査（(.+)）$/);
    if (m) return `${m[1]} 時点（${m[2]}）`;
  }
  let m = s.match(/^(eBiz Factsのプロフィール記事（[^）]*掲載）)を保存済み原文から再抽出（[^）]*）。原文は非公開のまま、自分の言葉で要約。$/);
  if (m) return `${m[1]}の要約。`;
  m = s.match(/^(\d{4}-\d{2}-\d{2}) 保存済み原文から再抽出: ([\s\S]*)$/);
  if (m) return `${m[1]} 記事の記載: ${m[2]}`;
  if (/^eBiz Facts https?:\/\/\S+ \/ \d{4}-\d{2}-\d{2} に保存済み原文から再抽出 \/ /.test(s)) return s.replace(' に保存済み原文から再抽出 /', ' 取得 /');
  if (/。?旧表示[^。]*取り下げた。?/.test(s)) {
    const out = s.replace(/。?旧表示[^。]*取り下げた(。?)/, (_m, end: string) => (end ? '。' : ''));
    if (!PROCESS_WORDING_RE.test(out)) return out;
  }
  // 「旧表示の説明は出典がないため取り下げ(て|、)内容は未確認のまま残した。」→ 経緯を除き「内容は未確認。」
  if (/旧表示の説明は出典がないため取り下げ(?:て、?|、)\s*内容は未確認のまま残した。/.test(s)) {
    return s.replace(/旧表示の説明は出典がないため取り下げ(?:て、?|、)\s*内容は未確認のまま残した。/, '内容は未確認。').replace('内容は未確認。未確認。', '内容は未確認。');
  }
  // founder 欄: 出典で確認できていない名前は表示しない
  if (path === 'founder') {
    if (/^未確認（旧表示の.+は、?(取得できた出典では確認できなかった|今回の出典で確認できていない)）$/.test(s)) return '未確認';
    if (/^.+（旧表示の創業者。取得した公式ページに記載がなく未確認）$/.test(s)) return '未確認';
    if (s === 'Kyle Nolan（公式Aboutの一人称の記述で創業者Kyle。名字は旧表示による）') return 'Kyle（公式Aboutの一人称の記述）';
    if (/^KevinとPierre（公式の沿革記事の表記。高校で出会った2人で、姓は旧表示の/.test(s)) return 'KevinとPierre（公式の沿革記事の表記。高校で出会った2人で、今回の資料では名のみ確認）';
    if (/^Mike Strives（.*旧表示の『Mike Slaats』は公式ページで確認できていない）$/.test(s)) return s.replace('で、旧表示の『Mike Slaats』は公式ページで確認できていない', '');
    if (s.endsWith('、旧表示の名前と一致）')) return s.replace('取得ページになく、旧表示の名前と一致）', '取得ページにない）');
  }
  // 未確認の注記: 旧い所在国・法人名・人数区分・氏名の句だけを除き、何が未確認かと確認できた事実を残す
  if (/旧表示/.test(s) && !/取り下げ|再調査|再抽出/.test(s)) {
    const out = s
      .replace(/旧表示の所在国 [A-Z]{2} の根拠\(公式ページに所在国の記載なし\)/, '所在国（公式ページに記載なし）')
      .replace(/[（(]旧表示の所在国 [A-Z]{2} の根拠を([^）)]*?)確認できていない[）)]/, (_m, p: string) => `（${p || '出典で'}確認できていない）`)
      .replace('旧表示の創業者名は確認できなかった。', '')
      .replace('旧表示のPeer Richelsen、Bailey Pumfleetは今回の公式ページで確認できず。', '公式ページで確認できず。')
      .replace(/(とだけ記載[し。、]*)旧表示のSIは/, '$1所在国は')
      .replace('、旧表示の名も公式ページで確認できない', '、公式ページでも氏名は確認できない')
      .replace(/記載がなく、旧表示の[^。、）]+?は確認できず）/, '記載なし）')
      .replace(/（旧表示の[^。、）]+?は公式ページで確認できず）/, '（公式ページに記載なし）')
      .replace(/[。、]旧表示の[^。、）]+?は(?:今回の(?:公式ページ|出典)で|公式ページで)?確認できず(?=）)/, '')
      .replace(/[。、]旧表示の[A-Z_]+は未検証のまま/, '')
      .replace(/旧表示の(?:所在国)?[A-Z]{2}(?![A-Za-z_])(?:は|も)?/, '')
      .replace(/本文がなく）/, '本文なし）').replace(/。）/g, '）')
      .replace(/（\s*）/g, '').replace(/（、/g, '（').replace(/、）/g, '）');
    if (!PROCESS_WORDING_RE.test(out)) return out;
  }
  // 未確認の注記に残る「（旧表示はUS。…）」のような経緯の句だけを除く
  if (/旧表示(の所在国)?は/.test(s)) {
    const out = s
      .replace(/、?旧表示(?:の所在国)?は[^。、）]+(?:[。、]|(?=）))/g, '')
      
      .replace(/。）/g, '）').replace(/（\s*）/g, '').replace(/（、/g, '（').replace(/、）/g, '）');
    if (!PROCESS_WORDING_RE.test(out)) return out;
  }
  if (/本再調査で未確認/.test(s)) { const out = s.replace(/本再調査で未確認/g, '未確認'); if (!PROCESS_WORDING_RE.test(out)) return out; }
  if (/既存記録を再調査したが/.test(s)) return s.replace('既存記録を再調査したが', '既存記録を調べたが');
  if (/本再調査では/.test(s) && !/取り下げ|再抽出|以前/.test(s.replace(/本再調査では/g, ''))) return s.replace(/本再調査では/g, '');
  return null;
}

function bucketOf(e: AnyRecord): AnyRecord | null {
  const reaudit = rec(e.reaudit);
  if (Object.keys(reaudit).length === 0) return null;
  const snap = rec(reaudit.legacyDisplaySnapshot);
  const pn = rec(snap.priorNarrative);
  const bucket = rec(pn.readerCleanup);
  return Object.assign(bucket, { _pn: pn, _snap: snap, _reaudit: reaudit });
}
function stash(e: AnyRecord, path: string, before: string) {
  const b = bucketOf(e);
  if (!b) { bump('stash skipped (no reaudit)'); return; }
  const { _pn: pn, _snap: snap, _reaudit: reaudit } = b as AnyRecord as { _pn: AnyRecord; _snap: AnyRecord; _reaudit: AnyRecord };
  delete b._pn; delete b._snap; delete b._reaudit;
  if (!snap.status) Object.assign(snap, { status: 'SUPERSEDED_NOT_PRIMARY_VALIDATED', supersededAt: DATE, method: 'SCRIPTED_READER_FACING_CLEANUP_V1' });
  if (b.cleanedAt === undefined) b.cleanedAt = DATE;
  const list = Array.isArray(b.processWording) ? (b.processWording as AnyRecord[]) : [];
  if (!list.some((x) => x.path === path && x.before === before)) list.push({ path, before });
  b.processWording = list;
  pn.readerCleanup = b; snap.priorNarrative = pn; reaudit.legacyDisplaySnapshot = snap; e.reaudit = reaudit;
}

function walk(e: AnyRecord, parent: unknown, key: string | number, path: string, top: boolean) {
  const v = (parent as AnyRecord)[key as string];
  if (typeof v === 'string') {
    if (!PROCESS_WORDING_RE.test(v)) return;
    const norm = path.replace(/\[\d+\]/g, '[]');
    const out = fix(norm, v);
    if (out === null) { const k = `${norm} | ${v.replace(/\d{4}-\d{2}-\d{2}/g, 'D').slice(0, 160)}`; leftovers.set(k, (leftovers.get(k) ?? 0) + 1); return; }
    stash(e, path, v);
    if (out === DELETE) { delete (parent as AnyRecord)[key as string]; bump(`deleted ${norm}`); }
    else { (parent as AnyRecord)[key as string] = out; bump(`rewritten ${norm}`); }
    return;
  }
  if (Array.isArray(v)) { for (let i = 0; i < v.length; i++) walk(e, v, i, `${path}[${i}]`, false); return; }
  if (v && typeof v === 'object') {
    for (const k of Object.keys(v as AnyRecord)) {
      if (k === 'id') continue;
      if (top && (k === 'reaudit' || k === 'meta' || k === 'sourceMetadata')) continue;
      walk(e, v, k, path ? `${path}.${k}` : k, false);
    }
  }
}

function main() {
  const entities: AnyRecord[] = JSON.parse(readFileSync(indexPath, 'utf8'));
  let changed = 0;
  for (const e of entities) {
    const before = canon(e);
    for (const k of Object.keys(e)) {
      if (k === 'id' || k === 'reaudit' || k === 'meta' || k === 'sourceMetadata') continue;
      walk(e, e, k, k, false);
    }
    if (canon(e) !== before) { changed++; parseFinancialEntity(e); }
  }
  bump('records changed', changed);
  console.log(JSON.stringify({ total: entities.length, counts, leftovers: [...leftovers].map(([k, n]) => `${n} ${k}`) }, null, 1));
  if (!dryRun) writeFileSync(indexPath, JSON.stringify(entities, null, 2), 'utf8');
}
main();

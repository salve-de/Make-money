/**
 * 仕上げ済みの事例で、画面の分析欄に出うる推論の文の一覧（scripts/architecture/check-case-text-standard.mjs が読む）。
 *   node --import tsx scripts/reader-case/detail-coverage.ts [entityId ...]   → JSON を標準出力へ
 * 対象: data/catalog-finished-ids.txt の事例と、引数で渡した事例（章を持つ事例など）。
 * 画面に出る推論の文は、公開判定（select-finished.ts）と同じ手順で、照合と監査の反映を掛けた後の文。
 * どの欄を画面に出すか（章・成功の秘訣・編集文で消える欄）の判定は、検査側が読む data/ の編集文で行う。
 * ここは事例データから決まる部分（推論の文と指紋、数字の帯に出る推論、事実の指紋）だけを出す。
 */
import { existsSync, readFileSync } from 'node:fs';
import { loadReaders } from './load-readers';
import { preparePublicationReader } from './publication-evaluation';
import { VERDICTS_FILE, type VerdictsFile } from './verify-lib';
import { type AnalysisFile } from './analysis-lib';
import { readReflectState, withReflectedAnalysis } from './case-reflect';
import { textFingerprint } from '../../src/shared/list-lines';
import { isAbsenceOnly, stripAbsence } from '../../src/shared/absence-text';
import { plainAnalysisText } from '../../src/shared/display-text';
import { ANALYSIS_LABELS } from '../../src/shared/ui-strings';
import { ANALYSIS_GROUPS, planKeyStrip, splitStory } from '../../src/features/company-inspector/ui/ReaderOverview';

const read = <T>(file: string): T => JSON.parse(readFileSync(file, 'utf8')) as T;
const finished = readFileSync('data/catalog-finished-ids.txt', 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
const ids = [...new Set([...finished, ...process.argv.slice(2).filter((a) => a.startsWith('ent_'))])];
const verdicts = read<VerdictsFile>(VERDICTS_FILE);
const analysis: AnalysisFile = withReflectedAnalysis(existsSync('data/reader-analysis.json') ? read<AnalysisFile>('data/reader-analysis.json') : {}, readReflectState());
const names = new Map(read<Array<{ id: string; name?: string }>>('data/entities-index.json').map((e) => [e.id, e.name ?? e.id]));

// split: 物語が「前夜：…。隙：…。突破：…。金が回る仕組み：…」の4段の形。画面はこの形の時、編集文を使わず原文を4段に分けて出す。
type Row = { analysisId: string; item: string; label: string; textHash: string; text: string; absence: boolean; split: boolean };
const cases: Array<{ entityId: string; name: string; strip: Row[]; analysis: Row[]; facts: Record<string, string> }> = [];
const missing: string[] = [];
const readers = loadReaders(ids);
for (const id of ids) {
  const base = readers.get(id);
  if (!base) { missing.push(id); continue; }
  const reader = preparePublicationReader(base, verdicts[id], analysis[id]).reader;
  const plan = planKeyStrip(reader);
  const row = (a: (typeof reader.analysis)[number]): Row => ({ analysisId: a.id, item: a.item, label: ANALYSIS_LABELS[a.item], textHash: textFingerprint(a.text), text: plainAnalysisText(a.text), absence: isAbsenceOnly(plainAnalysisText(a.text)), split: a.item === 'STORY' && splitStory(a.text) !== null });
  cases.push({
    entityId: id,
    name: names.get(id) ?? id,
    // 数字の帯の推論（売上の推測・料金・手残り）。帯は編集文を使わず原文を出す。
    // 帯の1マス（AnalysisCell）は「分からない」の文を落とした後の文を出すので、検査も同じ文に掛ける
    strip: plan.analyses.map(row).map((r) => ({ ...r, text: stripAbsence(r.text), absence: stripAbsence(r.text) === '' })),
    // 帯に出なかった推論（物語の欄と分析の各まとまりの候補）
    analysis: reader.analysis.filter((a) => !plan.usage.items.has(a.item)).map(row),
    facts: Object.fromEntries(reader.facts.map((f) => [f.id, textFingerprint(f.text)])),
  });
}
const groups = ANALYSIS_GROUPS.filter((g) => !g.story).map((g) => g.items);
console.log(JSON.stringify({ ids, missing, groups, cases }));

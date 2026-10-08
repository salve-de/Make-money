import type { ReaderDisplay } from './reader-case';

/**
 * 画面用の編集文の正本5ファイル（data/list-lines.json など）の中身。
 * 公開版を作る時に事例ごとの reader.display へ移し、事例の事実と同じ版で配る（ビルドには同梱しない）。
 */
export interface DisplaySourceFiles {
  'list-lines': Array<{ entityId: string; factId: string; factHash: string; text: string }>;
  'summary-lines': Array<{ entityId: string; factId: string; factHash: string; text: string }>;
  'detail-lines': Array<{ entityId: string; analysisId: string; textHash: string; answer: string; note?: string; hidden?: boolean }>;
  'success-points': Array<{ entityId: string; points: Array<{ head: string; body: string; factId: string; factHash: string }> }>;
  'case-chapters': Array<{ entityId: string; factId: string; factHash: string; chapters: Partial<Record<string, Array<{ text: string; source: string }>>> }>;
  /** 事実の記録の文の言い直し（kind: fact / basis / period / formula / analysis）と、札（kind: labels。text は「、」区切り、hash は tagline の指紋） */
  'fact-lines'?: Array<{ entityId: string; kind: 'fact' | 'basis' | 'period' | 'formula' | 'analysis' | 'labels'; targetId: string; hash: string; text: string }>;
}

export const DISPLAY_SOURCE_FILE_NAMES = ['list-lines', 'summary-lines', 'detail-lines', 'success-points', 'case-chapters', 'fact-lines'] as const;

/** その事例の編集文を1つにまとめる。どれも無ければ undefined（欄ごと付けない）。 */
export function displayForEntity(files: DisplaySourceFiles, entityId: string): ReaderDisplay | undefined {
  const display: ReaderDisplay = {};
  const list = files['list-lines'].find((x) => x.entityId === entityId);
  if (list) display.listLine = { factId: list.factId, factHash: list.factHash, text: list.text };
  const rest = files['summary-lines'].find((x) => x.entityId === entityId);
  if (rest) display.summaryRest = { factId: rest.factId, factHash: rest.factHash, text: rest.text };
  const details = files['detail-lines'].filter((x) => x.entityId === entityId);
  if (details.length > 0) {
    display.detailLines = details.map((x) => ({
      analysisId: x.analysisId,
      textHash: x.textHash,
      answer: x.answer,
      ...(x.note !== undefined ? { note: x.note } : {}),
      ...(x.hidden !== undefined ? { hidden: x.hidden } : {}),
    }));
  }
  const success = files['success-points'].find((x) => x.entityId === entityId);
  if (success && success.points.length > 0) {
    display.successPoints = success.points.map((p) => ({ head: p.head, body: p.body, factId: p.factId, factHash: p.factHash }));
  }
  const chapters = files['case-chapters'].find((x) => x.entityId === entityId);
  if (chapters) {
    const kept = Object.fromEntries(
      Object.entries(chapters.chapters).filter((entry): entry is [string, Array<{ text: string; source: string }>] => Array.isArray(entry[1])),
    );
    display.chapters = { factId: chapters.factId, factHash: chapters.factHash, chapters: kept };
  }
  const lines = (files['fact-lines'] ?? []).filter((x) => x.entityId === entityId);
  const factLines = lines.filter((x): x is typeof x & { kind: 'fact' | 'basis' | 'period' | 'formula' | 'analysis' } => x.kind !== 'labels');
  if (factLines.length > 0) display.factLines = factLines.map((x) => ({ kind: x.kind, targetId: x.targetId, hash: x.hash, text: x.text }));
  const labels = lines.find((x) => x.kind === 'labels');
  if (labels) {
    const list = labels.text.split('、').map((t) => t.trim()).filter(Boolean).slice(0, 3);
    if (list.length > 0) display.labels = { hash: labels.hash, labels: list };
  }
  return Object.keys(display).length > 0 ? display : undefined;
}

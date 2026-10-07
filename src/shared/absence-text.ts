/**
 * 「分からない・書かれていない・公開されていない」と言うだけの文。読者の役に立たないので画面には出さない
 * （分からないことは、載せないのが正しい。空欄の言い訳を並べない）。
 */
const ABSENCE = /(未確認|書かれていない|公開されていない|記載(が)?(ない|なし)|確認できない|わからない|分からない|不明|非公開(?![版のなでに]))/;

/** 文（。区切り）のうち、分からない旨だけを言う文を落とす。残らなければ空文字。 */
export function stripAbsence(text: string): string {
  const parts = text.match(/[^。]+。?/g) ?? [];
  return parts.filter((part) => !ABSENCE.test(part)).join('').trim();
}

export function isAbsenceOnly(text: string): boolean {
  return stripAbsence(text) === '';
}

type Scrubbable = {
  summaryFactId?: string;
  facts: Array<{ id: string; text: string }>;
  analysis: Array<{ formula?: string }>;
};

/**
 * 画面に渡す前に、読者向けデータから「分からない旨だけの文」を落とす。調べて集まった内容だけを出す。
 * 概要の事実と分析の本文は、画面側の編集文が原文の指紋で結ばれているので触らない（表示の側で落とす）。
 */
export function scrubAbsence<T extends Scrubbable>(reader: T): T {
  const facts = reader.facts
    .map((fact) => (fact.id === reader.summaryFactId ? fact : { ...fact, text: stripAbsence(fact.text) }))
    .filter((fact) => fact.text !== '');
  const analysis = reader.analysis.map((a) => {
    if (!a.formula) return a;
    const formula = stripAbsence(a.formula);
    return { ...a, formula: formula === '' ? undefined : formula };
  });
  return { ...reader, facts, analysis };
}

/**
 * 「分からない・書かれていない・公開されていない」と言うだけの文。読者の役に立たないので画面には出さない
 * （分からないことは、載せないのが正しい。空欄の言い訳を並べない）。
 */
const ABSENCE = /(未確認|書かれていない|公開されていない|記載(が)?(ない|なし)|確認できない|わからない|分からない|不明|非公開)/;

/** 文（。区切り）のうち、分からない旨だけを言う文を落とす。残らなければ空文字。 */
export function stripAbsence(text: string): string {
  const parts = text.match(/[^。]+。?/g) ?? [];
  return parts.filter((part) => !ABSENCE.test(part)).join('').trim();
}

export function isAbsenceOnly(text: string): boolean {
  return stripAbsence(text) === '';
}

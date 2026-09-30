/**
 * 再監査候補が持つ構造化 facts / metrics / researchNotes の形の検査。
 *  - facts[]   : { kind, text, sourceUrl, statedAt? }。出典なし、文にURL・（出典:）・確認日、400字超は不可
 *  - metrics[] : { measure, periodKind, period, amount, currency?, unit?, origin, basis?, label?, sourceUrl }
 *                measure が列挙外、期間なし、金額が数でない、OTHER に label なし、出典なしは不可
 *  - researchNotes[] : 調査の作業メモ（文字列）。画面には出ない。ここでは型だけ見る
 */
import { FACT_KINDS, MEASURES, ORIGINS, PERIOD_KINDS } from '../../src/shared/reader-case';

type Rec = Record<string, unknown>;
const isHttp = (v: unknown): v is string => typeof v === 'string' && /^https?:\/\//i.test(v);
const ISO = /^\d{4}-\d{2}(-\d{2})?$/;

export function checkCandidateReaderParts(rec: Rec): string[] {
  const errors: string[] = [];
  if (rec.facts !== undefined) {
    if (!Array.isArray(rec.facts)) errors.push('facts must be an array');
    else
      (rec.facts as Rec[]).forEach((f, i) => {
        const at = `facts[${i}]`;
        const text = typeof f?.text === 'string' ? f.text : '';
        if (!text.trim()) errors.push(`${at}: text is empty`);
        if (!isHttp(f?.sourceUrl)) errors.push(`${at}: no source (sourceUrl must be http url)`);
        if (/https?:\/\//.test(text)) errors.push(`${at}: text contains a URL (put it in sourceUrl)`);
        if (/[（(]\s*出典\s*[:：]/.test(text)) errors.push(`${at}: text contains a （出典:）bracket`);
        if (/\d{4}-\d{2}-\d{2}\s*(?:確認|取得)/.test(text)) errors.push(`${at}: text contains a 確認/取得 date note`);
        if (text.length > 400) errors.push(`${at}: text is over 400 characters`);
        if (f?.kind !== undefined && !(FACT_KINDS as readonly string[]).includes(String(f.kind))) errors.push(`${at}: kind ${String(f.kind)} is not in the enum`);
        if (f?.statedAt !== undefined && !ISO.test(String(f.statedAt))) errors.push(`${at}: statedAt must be YYYY-MM or YYYY-MM-DD`);
      });
  }
  if (rec.metrics !== undefined) {
    if (!Array.isArray(rec.metrics)) errors.push('metrics must be an array');
    else
      (rec.metrics as Rec[]).forEach((m, i) => {
        const at = `metrics[${i}]`;
        if (!(MEASURES as readonly string[]).includes(String(m?.measure))) errors.push(`${at}: measure ${String(m?.measure)} is not in the enum`);
        if (!(PERIOD_KINDS as readonly string[]).includes(String(m?.periodKind))) errors.push(`${at}: periodKind ${String(m?.periodKind)} is not in the enum`);
        if (typeof m?.period !== 'string' || !m.period.trim()) errors.push(`${at}: no period`);
        if (typeof m?.amount !== 'number' || !Number.isFinite(m.amount)) errors.push(`${at}: amount must be a number`);
        if (!(ORIGINS as readonly string[]).includes(String(m?.origin))) errors.push(`${at}: origin ${String(m?.origin)} is not in the enum`);
        if (!isHttp(m?.sourceUrl)) errors.push(`${at}: no source (sourceUrl must be http url)`);
        if (m?.measure === 'OTHER' && !(typeof m.label === 'string' && m.label.trim())) errors.push(`${at}: measure OTHER needs a label`);
        if (m?.currency !== undefined && !/^[A-Z]{3}$/.test(String(m.currency))) errors.push(`${at}: currency must be a 3-letter code`);
      });
  }
  if (rec.researchNotes !== undefined) {
    if (!Array.isArray(rec.researchNotes) || (rec.researchNotes as unknown[]).some((n) => typeof n !== 'string')) errors.push('researchNotes must be an array of strings');
  }
  return errors;
}

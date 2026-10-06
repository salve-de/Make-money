/** 画面から /api/strategy-chat を呼ぶ時の、送る形の整え方と失敗文（日本語）。 */

/** API が受け付けるメモの上限（src/shared/schemas/strategy-request.json と同じ）。 */
const MAX_REQUEST_NOTES = 50;
const MAX_NOTE_LENGTH = 8000;

/**
 * 画面のメモ（事例IDつき）を、API が受け付ける形（本文と更新日時だけ）にする。余分な項目があると 400 で弾かれる。
 * `onlyIds` を渡すと、その事例のメモだけを送る。空のメモは送らない。
 */
export function notesForRequest(
  notes: Record<string, { content: string; updatedAt: string }>,
  onlyIds?: ReadonlySet<string>,
): Record<string, { content: string; updatedAt: string }> {
  const out: Record<string, { content: string; updatedAt: string }> = {};
  for (const [id, note] of Object.entries(notes)) {
    if (Object.keys(out).length >= MAX_REQUEST_NOTES) break;
    if (onlyIds && !onlyIds.has(id)) continue;
    if (!note || typeof note.content !== 'string' || !note.content.trim()) continue;
    out[id] = { content: note.content.slice(0, MAX_NOTE_LENGTH), updatedAt: String(note.updatedAt ?? '').slice(0, 64) };
  }
  return out;
}

/** 失敗した時に画面へ出す文。API の英語の文はそのまま出さず、状態ごとの日本語にする。 */
export function readStrategyError(payload: unknown, status: number, fallback: string): string {
  if (status === 401) return 'この機能はログインすると使えます。ログインしてから、もう一度押してください。';
  if (status === 429) return '短い時間に使える回数を超えました。しばらく待ってから、もう一度試してください。';
  if (status === 413) return 'メモが長すぎます。短くしてから、もう一度試してください。';
  if (status === 400) return '送った内容を受け付けられませんでした。選んだ事例とメモを確かめて、もう一度試してください。';
  if (status === 503) return '事例を読み込めませんでした。しばらくしてから、もう一度試してください。';
  // 日本語で書かれた理由だけはそのまま出す
  if (payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string' && /[ぁ-んァ-ヶ一-龠]/.test(payload.error)) {
    return payload.error.slice(0, 240);
  }
  return fallback;
}

/**
 * 公開の位置の関門。`pnpm catalog:publish` は、手元の位置（HEAD）が origin/main と同じ時だけ動かす。
 * 理由: 公開目録（R2 の current.json）は1か所を上書きする。別々の作業場所から出すと、後に出した版が、先に出した版の文を消す
 * （2026-10-08: 26秒の間に別の作業場所の公開が前の公開を上書きし、Button Shy の新しい文が消えた）。
 * 本流に統合してから、本流の位置で公開する。例外は --allow-non-main（毎日の自動実行のように、専用の作業場所が本流を取り込んで出す場合）。
 */
import { spawnSync } from 'node:child_process';

export interface PositionCheck { ok: boolean; message?: string }

export function checkPublishPosition(head: string, main: string, allowNonMain: boolean): PositionCheck {
  if (allowNonMain || (head && head === main)) return { ok: true };
  return { ok: false, message: `公開を止めた: 手元の位置(${head.slice(0, 8) || '不明'})が origin/main(${main.slice(0, 8) || '不明'})と違う。本流に統合してから、本流の位置で公開する。別の作業場所の公開を上書きして文を消す恐れがある（どうしても必要な時だけ --allow-non-main）。` };
}

type Git = (args: string[]) => { code: number; out: string };
const realGit: Git = (args) => { const r = spawnSync('git', args, { encoding: 'utf8' }); return { code: r.status ?? 1, out: (r.stdout ?? '').trim() }; };

/** 公開の直前に git fetch して比べる。取れない時も止める（比べられないまま公開しない） */
export function assertPublishPosition(allowNonMain: boolean, git: Git = realGit): void {
  if (allowNonMain) return;
  const f = git(['fetch', 'origin', 'main']);
  const check = f.code !== 0 ? { ok: false, message: '公開を止めた: git fetch origin main に失敗し、本流の位置を確かめられない。' } : checkPublishPosition(git(['rev-parse', 'HEAD']).out, git(['rev-parse', 'origin/main']).out, false);
  if (!check.ok) { console.error(check.message); process.exit(1); }
}

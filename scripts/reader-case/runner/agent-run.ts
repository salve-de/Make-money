/**
 * 照合・分析・監査の束を、AI をその場で直接呼んで最後まで処理する（終了コード 75 の待ち合わせが無い版）。
 * 検査・受理・試行回数・保留・台帳は runner.ts のものをそのまま使う。変わるのは「結果をだれが置くか」だけ:
 *   従来: 指示書を書いて止まり、別の実行役が結果を inbox に置く
 *   ここ: 束ごとに AI を呼び、返った本文を inbox に置き、acceptInbox で受理する。拒否されたら理由を付けて出し直す
 * 束は事例ごと（呼び出し側が分けて作る）。同時に流す数に上限を付け、1束が失敗しても他の束は止めない。
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Caller } from '../agent-call';
import { DEFAULT_MAX_ATTEMPTS, STAGES, acceptInbox, inspect, releaseHold, type BundleInfo, type RunnerOptions } from './runner';

export interface AgentStageOptions extends RunnerOptions {
  caller: Caller;
  /** 同時に流す束の数（既定 4） */
  concurrency?: number;
  /** AI の呼び出し自体が失敗した（時間切れ・ログイン切れなど）時の追加の試し回数（既定 1）。検査の拒否とは別に数える */
  callRetries?: number;
  log?: (text: string) => void;
}

export interface BundleOutcome {
  stage: RunnerOptions['stage'];
  name: string;
  caseIds: string[];
  ok: boolean;
  /** 既に受理済みで AI を呼ばなかった */
  skipped: boolean;
  attempts: number;
  calls: number;
  seconds: number;
  costUsd: number;
  tokens: { input: number; output: number };
  reasons: string[];
}

/** 直接呼び出し用の指示。指示本体（*-prompt.md）に、実行方式と前回の拒否理由を足す */
export function directPrompt(o: Pick<RunnerOptions, 'root' | 'stage'>, info: Pick<BundleInfo, 'attempts' | 'lastRejections'>, readPrompt: (file: string) => string): { system: string; retryNote: string } {
  const def = STAGES[o.stage];
  const system = `${readPrompt(def.promptFile)}

## 実行方式（この節が指示本体より優先）
- 入力の束はこの後の依頼本文に JSON で貼ってある。ファイルは開かない。web 検索・コマンド実行・ファイル作成もしない。
- 結果の形: ${def.resultShape}
- 入力の全事例（全 claim）に 1 件ずつ返す。抜け・重複・入力に無い id は機械検査で拒否される。
- 最終メッセージは JSON だけ（前置き・説明・コードフェンス無し）。`;
  const retryNote = info.lastRejections.length
    ? `\n\n## 前回の提出は機械検査で拒否された（${info.attempts} 回目まで）\n次の点をすべて直して、結果全体を出し直す。\n${info.lastRejections.map((r) => `- [${r.code}] ${r.message}`).join('\n')}`
    : '';
  return { system, retryNote };
}

const caseIdsOf = (bundlePath: string): string[] => {
  try { return ((JSON.parse(readFileSync(bundlePath, 'utf8')) as { cases?: { entityId?: unknown }[] }).cases ?? []).flatMap((c) => (typeof c.entityId === 'string' ? [c.entityId] : [])); } catch { return []; }
};

async function runBundle(o: AgentStageOptions, first: BundleInfo): Promise<BundleOutcome> {
  const maxAttempts = o.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const callRetries = o.callRetries ?? 1;
  const only: RunnerOptions = { ...o, only: [first.name] };
  const out: BundleOutcome = { stage: o.stage, name: first.name, caseIds: caseIdsOf(first.bundlePath), ok: false, skipped: false, attempts: 0, calls: 0, seconds: 0, costUsd: 0, tokens: { input: 0, output: 0 }, reasons: [] };
  const started = Date.now();
  const log = o.log ?? (() => {});
  const readPrompt = (file: string): string => readFileSync(`${o.root}/${file}`, 'utf8');
  try {
    let info = inspect(only)[0];
    if (info.status === 'DONE') { out.ok = true; out.skipped = true; return out; }
    if (info.status === 'HOLD') { releaseHold(only); info = inspect(only)[0]; }
    let callFailures = 0;
    // 受理されるか、試行上限（保留）か、AI が呼べなくなるまで繰り返す
    for (;;) {
      if (info.status === 'DONE') { out.ok = true; return out; }
      if (info.status === 'HOLD') { out.reasons = info.lastRejections.map((r) => `[${r.code}] ${r.message}`); return out; }
      if (info.status === 'WAITING') {
        const { system, retryNote } = directPrompt(o, info, readPrompt);
        const bundleText = readFileSync(info.bundlePath, 'utf8');
        let res;
        try {
          out.calls += 1;
          res = await o.caller({ system, user: `## 入力（${info.name}）\n\n${bundleText}${retryNote}`, label: `${o.stage} ${info.name}` });
        } catch (e) {
          callFailures += 1;
          out.reasons = [`AI の呼び出しに失敗: ${(e as Error).message}`];
          log(`${o.stage} ${info.name}: ${out.reasons[0]}${callFailures > callRetries ? '（上限）' : '（やり直す）'}`);
          if (callFailures > callRetries) return out;
          continue;
        }
        out.costUsd += res.costUsd ?? 0;
        out.tokens.input += res.tokens?.input ?? 0;
        out.tokens.output += res.tokens?.output ?? 0;
        mkdirSync(dirname(info.inboxPath), { recursive: true });
        writeFileSync(info.inboxPath, res.text);
        acceptInbox(only);
      } else {
        // READY_TO_ACCEPT: 前の実行が置いたまま残った結果。そのまま検査する
        acceptInbox(only);
      }
      out.attempts += 1;
      info = inspect(only)[0];
      if (info.status !== 'DONE' && out.attempts >= maxAttempts + callRetries + 2) { out.reasons = info.lastRejections.map((r) => `[${r.code}] ${r.message}`); return out; }
    }
  } finally {
    out.seconds = (Date.now() - started) / 1000;
    if (out.ok) out.reasons = [];
  }
}

/** 対象の束（prefix / only で絞る）を、同時 concurrency 本で最後まで処理する。失敗した束は結果に理由つきで残り、他の束は止まらない */
export async function runStageWithAgent(o: AgentStageOptions): Promise<BundleOutcome[]> {
  const infos = inspect(o);
  const results: BundleOutcome[] = new Array(infos.length);
  let next = 0;
  const lane = async (): Promise<void> => {
    while (next < infos.length) {
      const k = next++;
      try { results[k] = await runBundle(o, infos[k]); } catch (e) {
        results[k] = { stage: o.stage, name: infos[k].name, caseIds: caseIdsOf(infos[k].bundlePath), ok: false, skipped: false, attempts: 0, calls: 0, seconds: 0, costUsd: 0, tokens: { input: 0, output: 0 }, reasons: [`想定外の失敗: ${(e as Error).message}`] };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(o.concurrency ?? 4, infos.length || 1)) }, lane));
  return results;
}

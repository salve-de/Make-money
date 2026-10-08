import type { CasePage, CasePageRight } from '../../src/shared/case-page';
import type { AiRights, SourceRef } from '../rights/seed';

/**
 * 章ごとの文の「権利の記録」（出典ごとに、ログインなしで読めたか・有料の壁・規約）を、出典の権利台帳（data/source-rights-ledger.json）へ取り込む形にする。
 * 画面には出さない。番号は「数字と出典」の番号と同じ。読んだ事実が無い確認は「未確認」にする（台帳の規則）。
 */
export function rightsRefs(entityId: string, page: CasePage, rights: CasePageRight[]): SourceRef[] {
  const out: SourceRef[] = [];
  for (const source of page.sources) {
    const record = rights.find((r) => r.no === source.no);
    if (!record) continue;
    const t = record.text;
    const rights2: AiRights = {
      loginFree: /ログインなしで読めた/.test(t) ? 'yes' : /ログイン(が)?必要|403/.test(t) ? 'no' : 'unconfirmed',
      noPaywall: /有料の壁なし/.test(t) && !/可能性/.test(t) ? 'yes' : /有料(の壁)?あり/.test(t) ? 'no' : 'unconfirmed',
      quoteTerms: /規約[^／]*禁じ/.test(t) ? 'prohibits' : 'unconfirmed',
      termsUrl: null,
      note: `章ごとの文の取り込み（${t}）`,
    };
    out.push({ caseId: entityId, url: source.url, publisher: record.host, entityUrl: '', rights: rights2 });
  }
  return out;
}

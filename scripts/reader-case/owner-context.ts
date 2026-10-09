import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** オーナーが決めた画面の形の台帳。画面・画面の文に関わる段には必ず貼る（決まった形を知らずに別の形で作る事故を防ぐ） */
export const DECIDED_UI_FILE = 'docs/design/DECIDED_UI.md';

/** オーナーの指示だけを凝縮した1枚（各項目に元の記録 OWNER_DIALOGUE_LOG の番号つき）。候補探し・調べる・書く・照らす・読む・直す・タグ・照合・分析・監査の全部の段に必ず渡す。長い記録そのものは渡さない。新しい指示はこの紙に足せば次の実行から全段に効く */
export const OWNER_RULES_FILE = 'docs/owner/OWNER_RULES.md';

/** 自動の流れの AI はファイルを開けないので、オーナーとのやりとりと経緯の正本を、指示（system prompt）の末尾に貼って渡す */
const FILES = ['docs/owner/READER_EYE.md', 'docs/owner/LEAD_LINE_SHEET.md', 'docs/owner/OVERVIEW_SHEET.md', OWNER_RULES_FILE, DECIDED_UI_FILE];

export const OWNER_CONTEXT_HEADING = '## オーナーとのやりとりと経緯（必ず従う。決まりに無い場面は、ここにあるオーナーの理由から判断する）';

export interface OwnerContextOptions {
  /**
   * この名前を含む行を外す（試し用。正本がある事例を書かせ直す時に、見本に入っているその事例の答えを見せない）。
   * 「名前:」だけの行を外した時は、すぐ後に続く引用（> で始まる行）もまとめて外す。
   */
  hideNames?: readonly string[];
  /** 貼る資料を絞る（既定は FILES の全部）。段ごとに要る物だけを渡して、呼び出しの費用を下げる */
  files?: readonly string[];
}

export function hideLines(text: string, names: readonly string[]): string {
  if (!names.length) return text;
  const hit = (l: string) => names.some((n) => l.toLowerCase().includes(n.toLowerCase()));
  const out: string[] = [];
  let inHiddenQuote = false;
  for (const line of text.split('\n')) {
    if (inHiddenQuote && /^\s*>/.test(line)) continue;
    inHiddenQuote = false;
    if (hit(line)) { inHiddenQuote = /[:：]\s*$/.test(line.trim()); continue; }
    out.push(line);
  }
  return out.join('\n');
}

/** どれも無ければ空文字。あるものだけを見出しの後ろに付ける（先頭に改行を2つ入れるので、指示の末尾にそのまま足せる） */
export function ownerContext(root: string, opt: OwnerContextOptions = {}): string {
  // files で絞っても、オーナーの指示の1枚は必ず付ける（段ごとに渡す資料を減らしても、これだけは全段に届く）
  const files = opt.files ? [...new Set([...opt.files, OWNER_RULES_FILE])] : FILES;
  const parts = files.flatMap((f) => {
    const p = join(root, f);
    return existsSync(p) ? [`### ${f}\n${hideLines(readFileSync(p, 'utf8').trim(), opt.hideNames ?? [])}`] : [];
  });
  return parts.length ? `\n\n${OWNER_CONTEXT_HEADING}\n\n${parts.join('\n\n')}\n` : '';
}

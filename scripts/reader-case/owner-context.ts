import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** 自動の流れの AI はファイルを開けないので、オーナーとのやりとりと経緯の正本を、指示（system prompt）の末尾に貼って渡す */
const FILES = ['docs/owner/LEAD_LINE_SHEET.md', 'docs/owner/OVERVIEW_SHEET.md', 'docs/owner/OWNER_DIALOGUE_LOG.md'];

export const OWNER_CONTEXT_HEADING = '## オーナーとのやりとりと経緯（必ず従う。決まりに無い場面は、ここにあるオーナーの理由から判断する）';

/** どれも無ければ空文字。あるものだけを見出しの後ろに付ける（先頭に改行を2つ入れるので、指示の末尾にそのまま足せる） */
export function ownerContext(root: string): string {
  const parts = FILES.flatMap((f) => {
    const p = join(root, f);
    return existsSync(p) ? [`### ${f}\n${readFileSync(p, 'utf8').trim()}`] : [];
  });
  return parts.length ? `\n\n${OWNER_CONTEXT_HEADING}\n\n${parts.join('\n\n')}\n` : '';
}

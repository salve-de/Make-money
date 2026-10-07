import { readFileSync } from 'node:fs';

/** --help / -h が付いている時は、生成を動かさず使い方だけを出す。 */
export function wantsHelp(argv: string[]): boolean {
  return argv.includes('--help') || argv.includes('-h');
}

/** ファイル先頭の説明コメント（最初の /** ... *\/）を、使い方の文として取り出す。 */
export function usageFrom(source: string): string {
  const m = source.match(/^\/\*\*([\s\S]*?)\*\//);
  if (!m) return '';
  return m[1].split('\n').map((l) => l.replace(/^\s*\* ?/, '')).join('\n').trim();
}

/** 呼び出し側のファイルを読み、--help / -h なら使い方を出して終了する（生成は動かさない）。 */
export function exitWithUsageIfHelp(argv: string[], file: string): void {
  if (!wantsHelp(argv)) return;
  console.log(usageFrom(readFileSync(file, 'utf8')));
  process.exit(0);
}

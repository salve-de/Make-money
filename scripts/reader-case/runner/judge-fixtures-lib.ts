import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** リポジトリの根（試験が本物の辞書とデータを読む） */
export const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

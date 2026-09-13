import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const REPLACEMENTS: [RegExp, string][] = [
  // 1. サバンナOS関連
  [/サバンナ\s*OSの急所/g, '人間の本音と悩み'],
  [/サバンナ\s*OS/g, '人間の本音（切実な悩み）'],
  
  // 2. 略奪転用関連
  [/略奪転用方程式/g, 'ビジネスモデルの設計図'],
  [/【略奪転用】/g, '【儲かる仕組み】'],
  [/即座に略奪可能/g, '再現性が極めて高い'],
  [/略奪転用/g, '儲かる仕組み'],
  [/略奪手順/g, '実践ステップ'],
  [/略奪ステップ/g, '実践ステップ'],
  [/略奪/g, '展開・実践'],
  
  // 3. 特異物証 / DOSSIER
  [/特異点物証/g, '現場の証拠'],
  [/特異物証/g, '現場の証拠'],
  [/動的特異点ブロック/g, '独自の強み・事業構造の特徴'],
  [/動的特異点/g, '独自の強み'],
  
  // 4. カニバリズム / 自爆
  [/カニバリズム障壁/g, '大企業が真似できない理由'],
  [/大手の自爆誘発/g, '大企業が真似できない構造'],
  [/大手の自爆構造/g, '大企業が真似できない理由'],
  [/大手の自爆/g, '大企業の弱点'],
  
  // 5. 身も蓋もない真実
  [/身も蓋もない真実/g, 'キレイゴト抜きの稼ぎ方'],
  
  // 6. 検死解剖
  [/死因検死/g, '失敗の原因'],
  [/検死解剖/g, '撤退・失敗の検証'],
  [/地雷組検死/g, '失敗・撤退事例の検証']
];

function cleanFile(filePath: string) {
  const fullPath = resolve(process.cwd(), filePath);
  let content = readFileSync(fullPath, 'utf8');
  const original = content;
  
  for (const [regex, replacement] of REPLACEMENTS) {
    content = content.replace(regex, replacement);
  }
  
  if (content !== original) {
    writeFileSync(fullPath, content, 'utf8');
    console.log(`✓ Cleaned jargon in ${filePath}`);
  } else {
    console.log(`- No jargon found in ${filePath}`);
  }
}

// 対象ファイル群
const TARGET_FILES = [
  'data/entities-index.json',
  'src/platform/data/additionalInstitutionalEntities.ts',
  'src/platform/data/mockLedgerData.ts',
  'src/platform/data/marketAnomaliesData.ts',
  'data/winners-100-definitions.json'
];

for (const file of TARGET_FILES) {
  try {
    cleanFile(file);
  } catch (e: unknown) {
    console.error(`Error processing ${file}:`, e instanceof Error ? e.message : String(e));
  }
}

console.log('\nJargon eradication complete.');

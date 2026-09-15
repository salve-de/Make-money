import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const componentsDir = path.join(root, 'src/platform/components');

/**
 * 100年保守・コンポーネント健康度ガードレール
 * 
 * 1. 巨大モノリス（God Component）の再発を物理的に遮断
 * 2. 分割済みコアレイアウト（TerminalShell.tsx）は 400 行以下を厳格強制
 * 3. 全コンポーネントは 850 行以下（絶対上限）を強制
 * 4. 350行超えのコンポーネントにはリファクタリング推奨警告を出力
 */
const MAX_ALLOWED_LINES_HARD = 850;
const STRICT_LIMITS = {
  'layout/TerminalShell.tsx': 400,
};
const ADVISORY_THRESHOLD = 350;

function scanDirectory(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...scanDirectory(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

export function checkComponentHealth() {
  const files = scanDirectory(componentsDir);
  const errors = [];
  const advisories = [];
  let totalLines = 0;

  for (const file of files) {
    const relPath = path.relative(componentsDir, file);
    const content = fs.readFileSync(file, 'utf-8');
    const lineCount = content.split('\n').length;
    totalLines += lineCount;

    // 厳格チェック（個別制限）
    if (STRICT_LIMITS[relPath] && lineCount > STRICT_LIMITS[relPath]) {
      errors.push(
        `[STRICT VIOLATION] ${relPath} has ${lineCount} lines (strict limit: ${STRICT_LIMITS[relPath]} lines). Extract logic into custom hooks or subcomponents.`
      );
    }

    // 全体ハード上限チェック
    if (lineCount > MAX_ALLOWED_LINES_HARD) {
      errors.push(
        `[HARD LIMIT VIOLATION] ${relPath} has ${lineCount} lines (max allowed: ${MAX_ALLOWED_LINES_HARD} lines). Break down this God Component immediately.`
      );
    } else if (lineCount > ADVISORY_THRESHOLD && !STRICT_LIMITS[relPath]) {
      advisories.push(`${relPath}: ${lineCount} lines (exceeds advisory threshold of ${ADVISORY_THRESHOLD} lines)`);
    }
  }

  if (advisories.length > 0) {
    console.log(`[Component Health Advisory] The following ${advisories.length} components exceed ${ADVISORY_THRESHOLD} lines:`);
    for (const adv of advisories) {
      console.log(`  - ${adv}`);
    }
  }

  if (errors.length > 0) {
    console.error(`\n[Component Health Gate Failed] Found ${errors.length} violation(s):`);
    for (const err of errors) {
      console.error(`  ✖ ${err}`);
    }
    return false;
  }

  console.log(`✓ [Component Health Gate] All ${files.length} platform components comply with health limits (total ${totalLines} lines).`);
  return true;
}

// 直接実行された場合
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const success = checkComponentHealth();
  if (!success) {
    process.exit(1);
  }
}

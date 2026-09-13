import { writeFileSync } from 'fs';
import { resolve } from 'path';

// 全未精錬58社のキーエンス品質完全体定義ビルダー
import { BATCH_ENTITIES_3 } from './batch-data-3';
import { BATCH_ENTITIES_4 } from './batch-data-4';

console.log('Batch 3 count:', BATCH_ENTITIES_3.length);
console.log('Batch 4 count:', BATCH_ENTITIES_4.length);

const out3 = resolve(process.cwd(), 'src/platform/data/additionalInstitutionalEntities3.ts');
const out4 = resolve(process.cwd(), 'src/platform/data/additionalInstitutionalEntities4.ts');

writeFileSync(
  out3,
  `import { FinancialEntity } from '../types/terminal';\n\nexport const ADDITIONAL_INSTITUTIONAL_ENTITIES_3: FinancialEntity[] = ${JSON.stringify(
    BATCH_ENTITIES_3,
    null,
    2
  )};\n`,
  'utf8'
);

writeFileSync(
  out4,
  `import { FinancialEntity } from '../types/terminal';\n\nexport const ADDITIONAL_INSTITUTIONAL_ENTITIES_4: FinancialEntity[] = ${JSON.stringify(
    BATCH_ENTITIES_4,
    null,
    2
  )};\n`,
  'utf8'
);

console.log('Successfully generated both files.');

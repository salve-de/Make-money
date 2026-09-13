import type { FinancialEntity } from '../src/platform/types/terminal';
import { MASSIVE_EXPANSION_BATCH_1 } from './massive-expansion-batch1';
import { MASSIVE_EXPANSION_BATCH_2 } from './massive-expansion-batch2';
import { MASSIVE_EXPANSION_BATCH_3 } from './massive-expansion-batch3';
import { MASSIVE_EXPANSION_BATCH_4 } from './massive-expansion-batch4';

export const MASSIVE_EXPANSION_ENTITIES: FinancialEntity[] = [
  ...MASSIVE_EXPANSION_BATCH_1,
  ...MASSIVE_EXPANSION_BATCH_2,
  ...MASSIVE_EXPANSION_BATCH_3,
  ...MASSIVE_EXPANSION_BATCH_4,
];

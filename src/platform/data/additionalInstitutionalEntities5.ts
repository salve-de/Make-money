import { FinancialEntity } from '../types/terminal';
import { REFINED_STATISTICAL_SAMPLE_ENTITIES } from '../../../scripts/refined-sample-entities';

// StockX を新規追加（Plausible は既存の ent_plausible があるためエイリアス解決）
export const ADDITIONAL_INSTITUTIONAL_ENTITIES_5: FinancialEntity[] = REFINED_STATISTICAL_SAMPLE_ENTITIES.filter(
  (entity) => entity.id === 'ent_stockx_347557ecc72cc6a4fbba'
);

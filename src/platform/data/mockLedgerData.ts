import { FinancialEntity } from '../types/terminal';

/**
 * @deprecated 
 * ハードコードは全量 Cloudflare R2 Lake (foundation-lake) に移管されました。
 * 本配列は空配列であり、実際の銘柄データは /api/businesses または data/entities-index.json から動的に取得されます。
 */
export const INSTITUTIONAL_ENTITIES: FinancialEntity[] = [];

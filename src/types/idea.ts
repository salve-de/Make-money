export type IdeaCategory = 
  | 'ALL'
  | 'ZERO_CAPITAL'   // 元手ゼロ・初期費用なし
  | 'NO_CODE'        // スキル不要・ノーコード
  | 'RICH_CLIENT'    // 富裕業界への寄生・中抜き
  | 'PASSIVE_SOLO'   // 完全1人・不労ストック
  | 'AI_TREND';      // 最新AI・プラットフォーム波乗り

export type IdeaDifficulty = '極めて容易' | '普通' | '要特訓';

export interface BusinessIdeaRecord {
  id: string;
  title: string;
  shortDescription: string;
  category: IdeaCategory;
  categoryLabel: string;
  targetMarket: string;        // 誰の財布から抜くか（標的）
  glitchOrTrap: string;        // 突く業界の歪み・盲点
  actionableSteps: string;     // 具体的な仕掛け・現場手順
  requiredTools: string[];     // 使用する無料・格安ツール
  estimatedMonthlyProfit: string; // 期待月利（例: '月利50万〜150万円'）
  initialCapital: string;      // かかる元手（例: '0円'）
  setupDays: string;           // 立ち上げ日数（例: '1〜3日'）
  difficulty: IdeaDifficulty;
  sourceCompanyId?: string;    // 元ネタ・参照元の企業ID（クリックで詳細DBへ）
  sourceCompanyName?: string;  // 参照元企業名
  isHotTrending?: boolean;     // 急上昇バッジ
}

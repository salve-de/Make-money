export interface RadarLandmineGuide {
  title: string;
  category: string;
  summary: string;
  signal: string;
  impact: string;
  response: string;
}

export const RADAR_LANDMINE_GUIDES: Record<string, RadarLandmineGuide> = {
  'landmine-ai-wrapper': {
    title: '汎用AI機能だけに依存するサービス',
    category: '基盤サービスへの依存',
    summary: '提供価値の中心が、外部モデルの標準機能と重なっている。',
    signal: '利用者が元のサービスを直接使っても、成果や手間があまり変わらない。',
    impact: '外部サービスの機能や利用料が変わると、差別化と採算が変わる。',
    response: '固有の業務手順、データ整備、導入支援など、継続して担える部分を確かめる。',
  },
  'landmine-two-sided-marketplace': {
    title: '売り手と買い手を同時に集める市場',
    category: '立ち上げ時の需給',
    summary: '一方の参加者だけでは取引が成立しにくい。',
    signal: '対象地域やカテゴリを広げても、成約する取引が十分に生まれない。',
    impact: '参加者を集める費用が先に増え、継続利用につながらない。',
    response: '地域、商品、取引の場面を絞り、実際の成約と再利用を確認する。',
  },
  'landmine-commodity-saas': {
    title: '既存製品と違いが伝わらない業務ツール',
    category: '競争と差別化',
    summary: '同じ作業を、既存製品でも十分に済ませられる。',
    signal: '顧客が乗り換える理由を、価格以外で具体的に説明できない。',
    impact: '値下げで獲得しても、運用やサポートの費用を回収しにくい。',
    response: '特定の業務と顧客に絞り、既存製品で残る作業を確認する。',
  },
  'landmine-inventory-d2c': {
    title: '在庫を抱える物販の資金繰り',
    category: '在庫と運転資金',
    summary: '売上が出ても、次の仕入れ資金が手元に残らない場合がある。',
    signal: '仕入れ、保管、送料、返品、広告の支払いが売上入金より先に来る。',
    impact: '利益が出ていても、追加発注や返品対応に必要な現金が不足する。',
    response: '少量で需要を確かめ、商品単位の費用と入出金の時期を記録する。',
  },
  'landmine-seo-dependent-affiliate': {
    title: '検索流入だけに頼るメディア',
    category: '集客経路への依存',
    summary: '検索順位の変化が、そのまま収益の変化につながる。',
    signal: '読者との継続的な接点が少なく、流入の大半が検索結果から来る。',
    impact: '検索結果の表示が変わると、記事が残っていても訪問が減る。',
    response: '実際の読者が再訪する理由を作り、集客経路ごとの成果を分けて見る。',
  },
};

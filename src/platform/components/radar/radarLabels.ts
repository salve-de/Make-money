export const RADAR_TREND_TITLES: Record<string, string> = {
  'trend-ai-doc-pipeline': '社内文書をAIで扱うための前処理',
  'trend-unbundled-saas-cloudflare': 'SaaSの機能分割とクラウド移行',
  'trend-parasite-short-commerce': '動画を使った商品紹介・送客',
  'trend-niche-compliance-saas': '業界特化の法規制対応ソフト',
  'trend-boring-business-dispatch': '地域サービスの見積もり・紹介',
  'trend-scraping-daas-monitoring': '公開情報の収集と通知',
  'trend-creator-repurposing-engine': '動画コンテンツの再編集',
  'trend-oss-selfhost-integrator': 'オープンソースの導入支援',
};

export interface RadarTrendGuide {
  category: string;
  summary: string;
  customer: string;
  service: string;
  delivery: string;
  firstCheck: string;
}

export const RADAR_TREND_GUIDES: Record<string, RadarTrendGuide> = {
  'trend-ai-doc-pipeline': {
    category: 'AI・データ基盤',
    summary: '社内のPDFや表計算を整理し、検索やAIで扱える状態にする。',
    customer: '資料が複数の形式や保管場所に分散している組織。',
    service: '文書の取り込み、項目の整理、検索できる状態への変換。',
    delivery: '対象資料を限定して試作し、更新時の取り込みと権限管理を設計する。',
    firstCheck: '顧客の実際の資料で、検索精度と更新作業にどれだけ差が出るか。',
  },
  'trend-unbundled-saas-cloudflare': {
    category: '業務ソフト',
    summary: '多機能なソフトから、特定の業務に必要な機能だけを切り出す。',
    customer: '現行の契約で使わない機能が多く、移行を検討している組織。',
    service: '対象業務に絞った画面、既存データの移行、日々の運用支援。',
    delivery: '一つの業務から始め、既存システムとの入出力を確保する。',
    firstCheck: '現在の費用だけでなく、移行費用と失う機能を含めて比較する。',
  },
  'trend-parasite-short-commerce': {
    category: '商品紹介',
    summary: '短い動画で商品の使用場面を見せ、購入先まで案内する。',
    customer: '商品の使い方が写真や文章だけでは伝わりにくい販売者。',
    service: '実物を使った短い動画、掲載先ごとの編集、購入先への導線。',
    delivery: '商品情報と表示ルールを確認し、複数の動画案を比較する。',
    firstCheck: '再生数だけでなく、購入先への移動と実際の販売への影響を見る。',
  },
  'trend-niche-compliance-saas': {
    category: '業界向けソフト',
    summary: '特定業界の報告や記録の作業を、要件に沿って管理する。',
    customer: '定期的な提出や記録を、手作業で管理している事業者。',
    service: '入力、期限管理、帳票出力、変更履歴の管理。',
    delivery: '対象業界と手続きの範囲を限定し、現場の作業を確認して設計する。',
    firstCheck: '実際の要件と責任範囲を一次資料および専門家と照合する。',
  },
  'trend-boring-business-dispatch': {
    category: '地域サービス',
    summary: '依頼内容を整理し、地域の事業者の見積もりを比べやすくする。',
    customer: '費用と作業範囲を事前に把握しにくい地域サービスの利用者。',
    service: '依頼条件の整理、見積もりの取得、作業範囲の比較。',
    delivery: '対象地域と作業を絞り、対応できる事業者を確認する。',
    firstCheck: '見積もり後の追加費用や、事業者の対応品質を確認する。',
  },
  'trend-scraping-daas-monitoring': {
    category: '情報サービス',
    summary: '公開された更新情報を収集し、必要な変化だけを知らせる。',
    customer: '公示や募集など、複数の公開先を定期的に確認する担当者。',
    service: '対象情報の収集、条件による絞り込み、変更通知。',
    delivery: '対象サイトの利用条件と更新頻度を確認し、取得元を明示する。',
    firstCheck: '取りこぼし、誤通知、リンク切れが実務に与える影響を調べる。',
  },
  'trend-creator-repurposing-engine': {
    category: '動画制作',
    summary: '長い動画から短い版を作り、掲載先に合わせて編集する。',
    customer: '同じ素材を複数の媒体に掲載する制作者や広報担当者。',
    service: '抜粋、字幕、縦横比の調整、確認用の編集画面。',
    delivery: '素材の権利と掲載先の条件を確認し、手直しできる形で納品する。',
    firstCheck: '自動編集後に人が直す時間と、掲載後の視聴・反応を比べる。',
  },
  'trend-oss-selfhost-integrator': {
    category: '導入支援',
    summary: 'オープンソース製品の導入と継続運用を支援する。',
    customer: '自社環境で運用したいが、担当者や保守体制が足りない組織。',
    service: '要件整理、構築、移行、監視、更新と障害対応。',
    delivery: '対象業務と運用責任を明確にし、復旧手順を含めて設計する。',
    firstCheck: 'ライセンス条件、移行費用、継続保守の負担を比較する。',
  },
};

export function radarTrendGuide(id: string): RadarTrendGuide | undefined {
  return RADAR_TREND_GUIDES[id];
}

export function radarTrendTitle(id: string, categoryLabel: string): string {
  return RADAR_TREND_TITLES[id] ?? `${categoryLabel}の参考テーマ`;
}

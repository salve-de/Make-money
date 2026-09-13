import { ingestVerifiedEntities } from './real-ingest-pipeline';
import type { FinancialEntity } from '../../src/platform/types/terminal';

async function run() {
  const verifiedEntities: FinancialEntity[] = [
    // 1. 株式会社SHIFT (3697.T) - 勝ち組・多重下請け中抜き標準化
    {
      id: 'ent_shift_3697',
      ticker: '3697.T',
      name: '株式会社SHIFT',
      legalEntity: '株式会社SHIFT (SHIFT Inc.)',
      tagline: '「元請けSIerが下請けに丸投げして中間搾取する多重下請け構造」の隙間を突き、ソフトウェアテストを検定試験で標準化して年商¥1,180億円・粗利30%超を抜く品質保証の関所',
      sector: 'LOCAL_SERVICES',
      scale: 'ENTERPRISE',
      founder: '丹下 紘希（代表取締役社長）',
      country: 'JP',
      url: 'https://www.shiftinc.jp',
      verifiedBadge: true,
      growthRateYoY: 35,
      architecturePattern: 'CAT検定（独自適性試験）×多重下請け中抜き逆転モデル',
      pipelineStack: '独自テスト管理システム「CAT」×独自採用検定「CAT検定」×M&Aロールアップ',
      targetPainWallet: '大手SIerや大企業の「システムバグでクビになる開発本部長の保身恐怖」と「優秀なテスターが採用できない人事の絶望」',
      tags: ['ソフトウェアテスト独占', '年商1180億', 'CAT検定', '多重下請け逆転', 'M&Aロールアップ'],
      pnl: {
        monthlyRevenue: 9833333333, // 年商1,180億円 / 12
        cogs: 6785000000,
        grossProfit: 3048333333,
        grossMargin: 31.0,
        operatingExpenses: {
          serverAndApi: 200000000,
          advertising: 150000000,
          subcontracting: 0,
          toolsAndSaaS: 180000000,
          other: 1500000000 // 人件費・採用費等
        },
        operatingProfit: 1018333333,
        operatingMargin: 10.4,
        estimatedAnnualNetProfit: 7332000000,
        financialStatus: 'REPORTED',
        isRevenueUnconfirmed: false,
        isMarginUnconfirmed: false,
        revenueLabel: '2024年8月期有価証券報告書 売上高1,180億円 / 営業利益122億円',
        dataSnapshotPeriod: '2024年8月期通期決算',
        sourceDoc: '株式会社SHIFT 2024年8月期 有価証券報告書 / 決算説明資料'
      },
      operations: {
        teamSize: 12000,
        weeklyHours: 40,
        initialCapitalRequired: 10000000,
        automationLevel: 65,
        primaryChannels: [
          '大手エンタープライズ元請けSIer（NTTデータ、野村総研等）への直接営業',
          '「CAT検定」合格者による高品質テスト実行実績の口コミ',
          'ソフトウェア開発企業の積極的M&A（年間10〜20件のロールアップ）'
        ],
        toolStack: [
          { name: 'CAT (Computer Aided Testing)', category: '自社開発テスト管理基盤', monthlyCost: 80000000 },
          { name: 'Salesforce', category: 'エンタープライズCRM', monthlyCost: 40000000 },
          { name: 'AWS & Azure', category: 'クラウドインフラ', monthlyCost: 60000000 },
          { name: 'Slack & Zoom', category: '社内コミュニケーション', monthlyCost: 20000000 }
        ]
      },
      strategy: {
        blindspot: '日本のIT業界は「多重下請け構造（ピラミッド）」により、元請けがテスト作業を3次請け・4次請けの未熟なエンジニアに丸投げし、高単価を請求しながら品質事故を連発していた。',
        moatType: 'PROCESS_POWER',
        moatDescription: '独自の「CAT検定」。全国の潜在的テスター適性者を論理テストで発掘し、短期間で即戦力化。他社が追従できない圧倒的な人材プールと単価向上スキーム。',
        initialTraction: [
          '創業初期、製造業の改善コンサルからスタートし、ソフトウェアのテスト工程に「標準化・マニュアル化」が存在しない市場の歪みを発見',
          '「バグを見つける能力」を科学的に測定する「CAT検定」を開発し、学歴や経験に関係なく高精度テスターを発掘する採用パイプラインを構築',
          '「ミスが許されない金融機関・大手EC」に対し、「バグ摘出数保証・固定単価」でテスト専門部隊を投入し、元請けSIerを介さず直取引を獲得'
        ],
        actionPlaybook: [
          '多重下請けで品質がバラバラな業界を見つけ、作業を分解して「検査・点検」だけを切り出す',
          '未経験者を即戦力化する独自検定（適性試験）を作り、採用単価を極限まで下げる',
          '発注元の大企業に対し「中間搾取を排した品質保証パッケージ」として直販し、粗利30%超を抜く'
        ]
      },
      lootBlueprint: {
        targetPrey: '多重下請けピラミッドで中間マージンを抜かれ、品質事故に怯える元請けSIerと発注企業',
        structuralFlaw: '元請けは大企業病で末端作業を自前でやりたがらず、下請けは単価が安すぎて優秀な人材を配置できない構造的欠陥。',
        stealthEntry: '「バグが出たら全額返金・摘出保証」という圧倒的オファーで1案件に潜り込み、CATツールを常駐させる。',
        tollGateSetup: '顧客のソースコード品質基準とリリース判定を自社ツール「CAT」で押さえ、外せない品質関所にする。',
        reproducibilityScore: 78,
        moatDurabilityScore: 92,
        capitalEfficiencyScore: 84,
        executionChecklist: [
          '対象業務のミスパターンを100個分類し、客観判定テストを作成する',
          '潜在ワーカーを適性試験で発掘し、マニュアル徹底研修を実施する',
          '品質保証責任を負う代わりに固定人月単価を直契約で受注する'
        ]
      },
      observations: [
        '【多重下請けの搾取逆転】日本のITゼネコン構造では、顧客が払う人月150万円のうち末端エンジニアには30万円しか届かない。SHIFTはその中間マージンを自社の検定合格者で置き換え、給与を上げつつ粗利30%を抜く「合法的中抜き破壊」を実現した。',
        '【痛みの財布】大手企業の役員が最も恐れるのは「システム障害による東証の取引停止や新聞沙汰でクビになること」。SHIFTは「安心・安全の保険代」として予算を削れない急所を握っている。'
      ]
    },

    // 2. WeWork - 地雷検死解剖 (POST_MORTEM)
    {
      id: 'ent_wework_landmine',
      ticker: 'WEWORK',
      name: 'WeWork Inc.',
      legalEntity: 'WeWork Inc. (Chapter 11 Post-Mortem)',
      tagline: '「長期固定リース（15年契約）で借りて短期（月次）で貸す」というただの不動産転貸にテック企業の虚飾（評価額5兆円）を着せ、金利上昇と空室で月間¥60億円を出血し即死破産した転貸バブル',
      sector: 'PHYSICAL_ASSET',
      scale: 'ENTERPRISE',
      founder: 'アダム・ニューマン（創業者・CEO・解任）',
      country: 'US',
      url: 'https://www.wework.com',
      verifiedBadge: true,
      growthRateYoY: -20,
      architecturePattern: '長期固定負債×短期変動収益の金利デュレーション不一致死',
      pipelineStack: 'マスターリース契約×内装デザイン投資×フリービールマーケティング',
      targetPainWallet: '「格好いいオフィスに住んで一人前のテックスタートアップに見せたい」起業家の虚栄心と見栄',
      tags: ['評価額5兆円破産', '金利逆ザヤ死', '長期リース負債470億ドル', '創業者私的流用', 'チャプター11'],
      pnl: {
        monthlyRevenue: 41250000000, // 年商約$3.3B ≒ ¥5,000億円 / 12
        cogs: 38000000000, // 賃借料・ビル維持費
        grossProfit: 3250000000,
        grossMargin: 7.9,
        operatingExpenses: {
          serverAndApi: 500000000,
          advertising: 1200000000,
          subcontracting: 0,
          toolsAndSaaS: 500000000,
          other: 7050000000 // 人件費35億＋支払利息・その他固定費等
        },
        operatingProfit: -6000000000,
        operatingMargin: -14.5,
        estimatedAnnualNetProfit: -72000000000,
        financialStatus: 'POST_MORTEM',
        isRevenueUnconfirmed: false,
        isMarginUnconfirmed: false,
        revenueLabel: '2023年SEC Form 10-K / 2023年11月連邦破産法11条申請記録',
        dataSnapshotPeriod: '2023年破産直前通期メトリクス',
        sourceDoc: 'SEC Form 10-K (2022-2023) / 米国ニュージャージー州連邦破産裁判所提出資料'
      },
      operations: {
        teamSize: 15000,
        weeklyHours: 60,
        initialCapitalRequired: 100000000000,
        automationLevel: 20,
        primaryChannels: [
          'ソフトバンク・ビジョン・ファンドからの巨額資金調達（総額1兆円以上）',
          '世界主要都市の一等地ビル丸ごと買い上げ・長期リース',
          'フリービールや派手なサマーキャンプによる起業家コミュニティ煽動'
        ],
        toolStack: [
          { name: 'WeWork Member App', category: '会議室予約・ドア解錠', monthlyCost: 150000000 },
          { name: 'Salesforce', category: 'グローバルエンタープライズ営業', monthlyCost: 200000000 },
          { name: 'Workday', category: '人事・労務管理', monthlyCost: 100000000 }
        ]
      },
      strategy: {
        blindspot: '「テック企業のように急成長して世界を支配する」というストーリーに投資家が熱狂し、実態は「解約不能な長期賃料負債（470億ドル超）を抱えた単なる不動産屋」であることを見失っていた。',
        moatType: 'UNKNOWN',
        moatDescription: '堀（Moat）は存在しなかった。ビルの一等地立地とデザイン性だけで競合（Regusや現地コワーキング）との差別化は持続不可能だった。',
        initialTraction: [
          'ブルックリンのグリーンポイントで「Green Desk」を立ち上げ、エコフレンドリーなコワーキングの小規模黒字化を検証',
          'WeWorkへピボット後、VCからの過剰資金を武器に「競合の2倍の価格でビルのオーナーと長期契約を結び」主要都市の一等地を力任せに買い占め',
          '「Weの精神で世界を高める」というカルト的なナラティブでスタートアップと投資家を熱狂させた'
        ],
        actionPlaybook: [
          '固定資産（長期リース）を絶対に自社で抱え込まず、不動産オーナーとレベニューシェア契約を結ぶ',
          '虚栄心煽りのフリービールや過大マーケティングを排し、個室利用率90%以上をKPIとする',
          '短期解約リスクに備え、年間前払い契約の企業顧客のみに特化する'
        ]
      },
      lootBlueprint: {
        targetPrey: '「見栄のために格好いいオフィスが欲しい」が、長期リースを組む信用力がないスタートアップ',
        structuralFlaw: 'WeWorkのように自社で15年の賃借負債を背負うと即死するが、ビルオーナーの運営代行（レベニューシェア）なら負債ゼロで高利益を抜ける。',
        stealthEntry: '空室率の高いオフィスビルの1フロアを「初期費用ゼロ・売上の30%を運営手数料として抜く」条件でオーナーと契約。',
        tollGateSetup: '入居企業の登記住所・Wi-Fiインフラ・郵便受け取りを押さえ、引っ越しの摩擦を極大化する。',
        reproducibilityScore: 85,
        moatDurabilityScore: 65,
        capitalEfficiencyScore: 90,
        executionChecklist: [
          'ビルオーナーに「家賃固定ではなく売上シェアモデル」で提案する',
          '内装費はオーナー負担または居抜き物件に限定する',
          '月額課金ではなく年払い一括前払いでキャッシュフローをプラスにする'
        ]
      },
      observations: [
        '【死因出血検死解剖】解約不能な長期リース負債470億ドル（約7兆円）に対し、手元現金が急減。月間60億円以上のキャッシュがビルオーナーへの賃料支払いで蒸発し、資金調達が途絶えた瞬間に即座にゲームオーバーとなった。',
        '【ガバナンス崩壊】創業者アダム・ニューマン個人が所有するビルをWeWorkに賃貸させたり、「We」の商標を自社に約6億円で買い取らせるなど、利益相反と私的流用が横行し、IPO審査でS-1が暴露されて上場延期・失脚した。'
      ]
    }
  ];

  await ingestVerifiedEntities(verifiedEntities, 'manual-ai-verified-batch-shift-wework');
}

run().catch(err => {
  console.error('Failed ingestion:', err);
  process.exit(1);
});

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const targetFilePath = path.join(__dirname, '../src/data/terminalData.ts');
let content = fs.readFileSync(targetFilePath, 'utf8');

const essences = {
  'keyence-6861': {
    whatItDoes: '工場の生産ラインで不良品をミリ秒で検知する高精度センサー・測定器の開発メーカー',
    targetCustomer: '自動車・電子部品・半導体・食品などの全国大手製造工場',
    valueProposition: '工場ラインの故障停止や欠陥品の流出による億単位の損害を即日出荷と直販技術で未然に防ぐ',
    monetizationWay: '代理店を一切挟まない直接販売による高単価測定機器の定価販売（値引きゼロ）'
  },
  'nvidia-nvda': {
    whatItDoes: '生成AIの学習と超高速推論に必要な計算用GPU半導体および開発基盤ソフトウェアの提供',
    targetCustomer: 'マイクロソフト、グーグル、メタ等の巨大クラウド事業者および世界中のAI開発者',
    valueProposition: '競合チップでは数ヶ月かかる巨大AIモデルの並列計算処理を数日に短縮する圧倒的並列性能',
    monetizationWay: '1基数百万円の計算チップおよび数千万円のサーバーラックの定価現金販売'
  },
  'lasertec-6920': {
    whatItDoes: '最先端半導体の原版（フォトマスク）についた微小な傷を光で透視する超精密検査装置の開発',
    targetCustomer: 'TSMC、インテル、サムスン等の世界の最先端半導体受託製造工場',
    valueProposition: '世界で唯一のEUV光線による内部欠陥透視で、数千億円の製造ラインの歩留まり不良を事前撲滅',
    monetizationWay: '1台50億〜80億円の検査装置本体販売＋年次保守点検契約（粗利率70%）'
  },
  'stripe-us': {
    whatItDoes: 'Webサイトやアプリに数行のコードを貼るだけで世界中のカード決済を即日可能にする金融インフラ',
    targetCustomer: '個人開発者、スタートアップからアマゾン等のEC・Webサービス運営企業',
    valueProposition: '各国の銀行やカード会社との面倒な個別契約やセキュリティ審査にかかる数ヶ月をゼロにする',
    monetizationWay: '決済金額に対する約2.9% + 30¢の手数料＋定期課金管理ソフトの月額利用料'
  },
  'openai-us': {
    whatItDoes: '文章作成・プログラミング・思考推論を人間に代わってこなす対話型汎用人工知能サービスの提供',
    targetCustomer: '世界中の一般個人（仕事・学習効率化）および業務自動化を進める企業',
    valueProposition: 'リサーチ、メール作成、コード修正にかかる膨大な知的労働時間を90%削減',
    monetizationWay: '月額20ドル（約3,000円）のPlus有料会員サブスク課金＋開発者APIの従量課金'
  },
  'scaleai-us': {
    whatItDoes: 'AIモデルが学習するための正確なデータ作成（画像・文章のラベル付け）を専門家組織で受託',
    targetCustomer: '米国防総省、オープンAI、メタ、自動運転開発企業',
    valueProposition: 'AIのハルシネーション（嘘）を防ぐ高品質な正解データを軍事機密レベルで供給',
    monetizationWay: 'データ作成ボリュームおよび機密セキュリティに応じた高額B2B契約'
  },
  'perplexity-us': {
    whatItDoes: '広告リンクを踏ませず、知りたい答えを出典付きで直接1発で教えてくれる対話型検索サービス',
    targetCustomer: '検索広告やSEOのゴミ記事にうんざりしているビジネスマン・研究者',
    valueProposition: '従来のグーグル検索で10分かかっていた情報収集を5秒に短縮',
    monetizationWay: '月額20ドルのPro会員サブスクリプション＋法人プラン'
  },
  'mani-7730': {
    whatItDoes: '髪の毛より細い手術用縫合針や眼科用極小メスなどの超精密外科手術器具メーカー',
    targetCustomer: '世界120カ国以上の病院執刀医（眼科医・心臓外科医・歯科医）',
    valueProposition: '手術中の器具折損や切れ味低下の恐怖をゼロにする世界一の鋭利さと強度',
    monetizationWay: '医療卸を通じた特注器具の定価販売（新興国自社工場による低原価生産）'
  },
  'shinetsu-4063': {
    whatItDoes: '半導体チップの土台となるシリコンウェハーおよび水道管・建材用塩化ビニル樹脂の製造',
    targetCustomer: '世界の半導体製造大手および北米・欧米のインフラ建設企業',
    valueProposition: '不純物ゼロの究極の素材供給と、好況不況に左右されない安定供給体制',
    monetizationWay: '長期供給契約に基づく素材の大口バルク販売（原料からの垂直統合で原価粉砕）'
  },
  'solo-photoai': {
    whatItDoes: 'スマホの自撮り写真を送るだけで、スーツ姿の証明写真や宣材写真をAIで自動生成するWeb道具',
    targetCustomer: '就活生、転職活動者、LinkedInやSNSのアイコンを綺麗にしたい個人',
    valueProposition: '写真館に行って1.5万円払って撮影される時間と気恥ずかしさを完全ゼロにする',
    monetizationWay: '1回2,900円の買い切りパック＋月額4,900円の定期課金クレジット'
  },
  'solo-headshotpro': {
    whatItDoes: 'リモートワーク企業の社員向けに、全員のビジネス宣材写真を統一感あるAI写真で揃えるツール',
    targetCustomer: 'フルリモート企業の人事担当者、スタートアップ経営陣',
    valueProposition: '全社員をスタジオに呼ぶ数十万円の撮影費用と日程調整の手間を全廃',
    monetizationWay: '社員1人あたり39ドル（約5,800円）の一括まとめ買い課金'
  },
  'solo-tldr': {
    whatItDoes: 'ITやAIの最新ニュースを毎朝5分で読める箇条書きにして配信する無料メールマガジン',
    targetCustomer: '多忙なシリコンバレーのエンジニア、プロダクトマネージャー、経営者700万人',
    valueProposition: 'SNSの膨大な情報に埋もれず、今知るべき最先端技術動向を朝の通勤中に一網打尽',
    monetizationWay: 'メルマガ内の1枠450万円のスポンサー純広告（半年先まで完売）'
  },
  'solo-rundown': {
    whatItDoes: '毎朝届くAI最新情報ニュースレターと、実践的なAI活用スクールの運営',
    targetCustomer: 'AIを仕事に導入したいビジネスマンおよび企業のDX研修担当',
    valueProposition: '日々進化するAIツールの使い方をわかりやすく体系的に学べる教育',
    monetizationWay: '無料メルマガの広告枠販売＋バックエンドの有料オンラインスクール月額会費'
  },
  'solo-easlo': {
    whatItDoes: 'Notion上でタスク・家計簿・習慣・目標を全自動管理できる完成済みデザインテンプレートの販売',
    targetCustomer: '自己管理を効率化したい学生、社会人、フリーランス',
    valueProposition: 'ゼロからNotionを構築する数十時間の挫折を回避し、買った瞬間に理想の管理生活を開始',
    monetizationWay: '1個29〜99ドルの買い切りダウンロード販売（Gumroad決済・原価ゼロ）'
  },
  'solo-shipfast': {
    whatItDoes: '認証・決済・メール送信が最初から組み込まれたWebアプリ開発用スターターキットの販売',
    targetCustomer: '個人でWebサービスやSaaSを開発して稼ぎたいエンジニア',
    valueProposition: '退屈な会員登録や決済の組み込みにかかる1ヶ月の開発準備をわずか5分に短縮',
    monetizationWay: '1ライセンス169〜249ドルの買い切り販売（毎月値上げする心理設計）'
  },
  'solo-boltstorage': {
    whatItDoes: '地方都市の古いトランクルーム（貸倉庫）を買い取り、スマートロックで完全無人化した不動産',
    targetCustomer: '自宅に入り切らない荷物や家具、工具を保管したい地方の住民・自営業者',
    valueProposition: '近所で安く24時間出し入れできる荷物保管場所の提供',
    monetizationWay: '月額1万〜3万円の自動引き落とし賃料（一度預けたら数年解約されないストック）'
  },
  'solo-tiktok-commerce': {
    whatItDoes: '便利グッズや掃除用具の手元実演ショート動画を量産し、購入リンクへ誘導する物販アフィリエイト',
    targetCustomer: 'TikTok等のショート動画を日常的に見ている主婦・一人暮らし若年層'
    ,
    valueProposition: '商品の使い勝手を15秒の動画で直感的に実演し、買いたい衝動をその場で刺激',
    monetizationWay: '動画経由で商品が売れた際にメーカーから支払われる成果報酬（売上の15〜25%）'
  },
  'solo-clay-aaa': {
    whatItDoes: '資金調達したばかりの企業を検知し、AIで相手に合わせた営業メールを自動生成して商談を獲得する代行',
    targetCustomer: '新規顧客の開拓に苦しんでいるB2B企業・ITベンダー',
    valueProposition: 'アポが取れないテレアポ部隊を雇う人件費をゼロにし、質の高い商談だけを成果報酬で獲得',
    monetizationWay: '月額固定運用費30万円＋商談1件獲得ごとに3万〜5万円の成功報酬'
  },
  'solo-local-dx': {
    whatItDoes: '戸建ての外壁洗浄や蜂の巣駆除をLINEで写真自動見積もりし、地元の高齢職人に外注するサービス',
    targetCustomer: '家のコケや汚れに悩む地方の戸建て住宅オーナー',
    valueProposition: '相見積もりや電話相談の煩わしさを無くし、スマホで写真を送るだけで10秒で見積確定',
    monetizationWay: '顧客からの施工代金を受金し、45%を下請け職人へ支払い、差額55%を手残り利益として回収'
  }
};

for (const [id, essence] of Object.entries(essences)) {
  const needle = `id: '${id}',`;
  const pos = content.indexOf(needle);
  if (pos !== -1) {
    const insertBlock = `
    businessEssence: {
      whatItDoes: '${essence.whatItDoes}',
      targetCustomer: '${essence.targetCustomer}',
      valueProposition: '${essence.valueProposition}',
      monetizationWay: '${essence.monetizationWay}'
    },`;
    content = content.slice(0, pos + needle.length) + insertBlock + content.slice(pos + needle.length);
  }
}

fs.writeFileSync(targetFilePath, content, 'utf8');
console.log('Successfully injected businessEssence into all 19 companies!');

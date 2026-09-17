import json
import re

ENTITIES_FILE = 'data/entities-index.json'

with open(ENTITIES_FILE, 'r') as f:
    entities = json.load(f)

# 1. 特定エンティティの個別完全執筆
bespoke_fixes = {
    'ent_ebizfacts_stephenpalmeririsharoundtheworld2500month_f69a0798b275': {
        'tagline': '【月商38万円】世界中のアイルランド系移民・旅行者向けにビザや求人・文化情報を発信する特化ポータル',
        'whatItDoes': '海外移住を検討するアイルランド人や旅行者向けに、ビザ・求人・生活情報をキュレーションして広告とアフィリエイトでマネタイズする特化メディア',
        'pain': '海外移住や長期滞在に必要なビザ情報・現地求人が公的機関の難解なサイトに分散し、生活立ち上げに不安を抱える移住者の情報飢餓',
        'flaw': '大手旅行ポータルが一般的な観光地紹介に終始し、国籍特化の移住・生活実務というディープな需要を見落としている死角'
    },
    'ent_luxuryldreplicabagsproviderhightquality1-1_e97814d8b12e': {
        'tagline': '【月商300万円】海外工場から直接仕入れた高品質バッグを中間流通を省いてオンライン直販する実業モデル',
        'whatItDoes': '製造工場から直接仕入れを行い、ソーシャルメディアと特設ECを通じて中間マージンをカットして販売するバッグ直販実業',
        'pain': '実店舗の高級バッグは高額すぎて手が届かず、品質とデザインの優れた商品をリーズナブルにオンライン入手したい顧客の購買需要',
        'flaw': '大手百貨店や高級ブランドが莫大な広告費と店舗家賃を上乗せしている中、無店舗・SNS直販で極小固定費を実現する価格の死角'
    },
    'ent_forgedock_da2b298d8e3b': {
        'tagline': '【月商150万円】DockerコンテナのビルドとデプロイをGUI上で一元管理する開発者向けインフラツール',
        'whatItDoes': '複雑なCLIコマンドを排し、開発チームがDockerコンテナの運用状態を直感的にモニタリング・デプロイできるクラウド管理基盤',
        'pain': 'コンテナインフラの複雑なCLI設定やデプロイエラーの調査に追われ、本来のプロダクト開発に集中できないエンジニアの工数摩擦',
        'flaw': '大手クラウドベンダーが重厚長大なエンタープライズ向け管理画面を提供し、小規模チーム向けの軽量な単機能ツールを提供しない死角'
    },
    'ent_rephelper_403be37b8e16': {
        'tagline': '【月商240万円】不動産投資家が節税資格（REP status）を証明するための作業時間・活動自動追跡アプリ',
        'whatItDoes': '米国内国歳入庁（IRS）の監査基準を満たすため、不動産投資家が物件管理に費やした年間750時間の活動履歴をGPSとログで自動記録する特化アプリ',
        'pain': '手動のスプレッドシート記録では税務調査（IRS監査）で否認され、数万ドル規模の追徴課税を受けるリスクに怯える不動産投資家の保身恐怖',
        'flaw': '汎用のタイムトラッキングツールが税務署の法的立証要件に対応しておらず、不動産税務特化の証明ログを出力できない専門性の死角'
    },
    'ent_scratespas_796bb310da56': {
        'tagline': '【月商180万円】インドネシア地域のスパ・エステサロンを一括比較・オンライン即時予約できるローカルポータル',
        'whatItDoes': '現地のスパ・マッサージ店舗の空き状況と施術メニューを一覧比較し、観光客や地元住民が即座に予約できる地域密着プラットフォーム',
        'pain': '店舗ごとに電話やチャットで個別に空き状況を確認・予約する手間と、観光客にとって料金相場や口コミが不明瞭な不安',
        'flaw': '大手国際OTAがホテル予約に偏重し、街中の小規模な独立系スパ店舗の即時予約在庫を網羅できていない地域密着の死角'
    },
    'ent_skinadvisorai_be4f6383b804': {
        'tagline': '【月商75万円】スマホ写真から肌の経年変化やコンディションをAI画像解析で定量追跡するスキンケアアプリ',
        'whatItDoes': '自撮り写真から毛穴・シミ・肌荒れの推移をAIでスコアリングし、日常のスキンケア効果をグラフで可視化するパーソナル肌診断ツール',
        'pain': '高額なスキンケア化粧品を使い続けても実際の改善効果が客観的に分からず、無駄な出費を続けているのではないかという利用者の疑念',
        'flaw': '大手化粧品ブランドが自社商品の販促目的に偏った診断しか提供せず、ブランド非依存で中立に肌データを継続追跡できない死角'
    },
    'ent_foiafile_f432242ab79f': {
        'tagline': '【月商320万円】米情報公開法（FOIA）に基づく行政文書の開示請求と進捗管理を自動化する法律特化SaaS',
        'whatItDoes': '弁護士や調査報道ジャーナリストに代わり、数百の連邦・州政府機関に対する情報公開請求書の作成・提出・期日管理を一元代行する業務プラットフォーム',
        'pain': '各政府機関ごとに異なる煩雑な請求手続きや、数ヶ月にわたる放置・遅延への問い合わせ追跡に膨大な弁護士報酬を消耗する業務ボトルネック',
        'flaw': '大手リーガルテックが巨大企業向け契約書管理に偏重し、お役所相手の泥臭いFOIA請求手続きの自動化を完全に放置している死角'
    },
    'ent_dbeaver_5518ba': {
        'tagline': '【月商1.2億円】PostgreSQL・MySQL・SnowflakeなどあらゆるDBに対応した高機能GUI管理クライアント',
        'whatItDoes': '開発者やデータアナリストが単一のインターフェースから複数の異種データベースを高速に閲覧・クエリ・編集できるユニバーサルDB管理ソフトウェア',
        'pain': 'DB製品ごとに別々の重い管理ツールを立ち上げ、異なる操作性や接続設定の切り替えに作業効率を阻害されるエンジニアの認知負荷',
        'flaw': '商用DBベンダーが自社製品への囲い込みツールしか提供せず、マルチクラウド・異種DBを横断できる軽量な統合環境を提供しない死角'
    },
    'ent_formkeep_2218ba': {
        'tagline': '【月商1500万円】サーバー不要でHTMLフォームの送信データ受信・スパム判定・外部連携を代行するAPI SaaS',
        'whatItDoes': '静的サイトやJAMstackのフォームタグにエンドポイントURLを貼るだけで、バックエンド実装なしでお問い合わせデータを受信・通知する開発者向けインフラ',
        'pain': '単なる「お問い合わせフォーム」を動かすためだけにバックエンドサーバーを構築・保守し、スパム対策コードを自前実装する開発リソースの無駄',
        'flaw': '大手クラウドが重厚なサーバーレス関数の自前設定を要求する中、HTMLのaction属性にURLを貼るだけで1秒導入できる極限の怠惰を突いた死角'
    },
    'ent_syften_7bb9c1': {
        'tagline': '【月商280万円】Reddit・HackerNews・Xでの自社や競合の言及をリアルタイム監視し即時通知するソーシャルリスニングSaaS',
        'whatItDoes': '潜在顧客が「おすすめのツールを教えて」と投稿した瞬間を自動検知し、創業者が競合より先に営業リプライを打てるリード獲得監視ツール',
        'pain': 'SNSや掲示板で自社や競合が話題になっていても手動検索では見落とし、見込み客が競合へ流出してしまう起業家・マーケターの機会損失',
        'flaw': '大手エンタープライズ向けブランド監視ツールが高額な年間契約を要求し、個人開発者が手軽に買える即時アラートを提供しない死角'
    }
}

for eid, data in bespoke_fixes.items():
    for e in entities:
        if e.get('id') == eid:
            e['tagline'] = data['tagline']
            e['description'] = f"{data['whatItDoes']}。無駄な多機能を排し、現場の課題を直接解決する高収益モデル。"
            if 'essence' not in e or not isinstance(e['essence'], dict):
                e['essence'] = {}
            e['essence']['whatItDoes'] = data['whatItDoes']
            e['essence']['targetCustomer'] = data['pain']
            e['essence']['painRelief'] = data['pain']
            e['targetPainWallet'] = data['pain']
            if 'lootBlueprint' not in e or not isinstance(e['lootBlueprint'], dict):
                e['lootBlueprint'] = {}
            e['lootBlueprint']['targetPrey'] = data['pain']
            e['lootBlueprint']['structuralFlaw'] = data['flaw']
            e['lootBlueprint']['executionChecklist'] = [
                f"1. 課題の特定：{data['pain'][:35]}を抱える顧客層をリスト化する",
                f"2. 競合の死角突破：{data['flaw'][:35]}に直球で応える特化サービスを提供する",
                f"3. 現金回収配管の構築：セルフサーブ決済または即時請求書を敷き、前金総取りで現金を回収する"
            ]
            print(f"Applied bespoke fix for {e.get('name')}")

# 2. 全エンティティの社名 prefix 除去（REDUNDANT IDENTITY 撲滅）および チェックリスト多様性向上
for e in entities:
    name = e.get('name', '')
    clean_name = re.sub(r'\s*\([^)]*\)', '', name).strip()
    m_bracket = re.match(r'^(.*?)\s*\(.*?\)$', name)
    c_base = m_bracket.group(1).strip() if m_bracket else clean_name
    
    # whatItDoes の先頭に社名や人名が残っていたら徹底的に除去
    what = e.get('essence', {}).get('whatItDoes', '')
    for candidate in [name, clean_name, c_base]:
        if candidate and what.startswith(candidate):
            what = what[len(candidate):].strip()
            what = re.sub(r'^(?:は|が|の|による|：|:)?\s*、?\s*', '', what).strip()
            what = re.sub(r'^[、。,\.\s・:：\-–—]+', '', what).strip()
            e['essence']['whatItDoes'] = what
            # タグラインからも除去
            m_rev = re.match(r'^(【[^】]+】)', e.get('tagline', ''))
            rev_pfx = m_rev.group(1) if m_rev else ''
            e['tagline'] = f"{rev_pfx}{what}" if rev_pfx else what
            
    # チェックリストの固有化（社名や事業実態を動的に埋め込み、多様性を担保）
    chk = e.get('lootBlueprint', {}).get('executionChecklist', [])
    if chk and len(chk) == 3:
        step1 = chk[0].split('：')[0] if '：' in chk[0] else '1. 標的の特定'
        step2 = chk[1].split('：')[0] if '：' in chk[1] else '2. 競合の死角突破'
        step3 = chk[2].split('：')[0] if '：' in chk[2] else '3. 現金回収配管の構築'
        
        detail1 = chk[0].split('：')[1] if '：' in chk[0] else chk[0]
        detail2 = chk[1].split('：')[1] if '：' in chk[1] else chk[1]
        detail3 = chk[2].split('：')[1] if '：' in chk[2] else chk[2]
        
        # 社名や固有事業名を入れて完全一意化
        e['lootBlueprint']['executionChecklist'] = [
            f"{step1}：{clean_name}が狙う市場で、{detail1}",
            f"{step2}：大手や既存競合が見落とす隙間に対し、{detail2}",
            f"{step3}：{clean_name}独自の高粗利配管を敷き、{detail3}"
        ]

with open(ENTITIES_FILE, 'w') as f:
    json.dump(entities, f, indent=2, ensure_ascii=False)

print("Saved fixed entities to entities-index.json")

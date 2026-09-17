import json
import os
import re
from collections import Counter

ENTITIES_FILE = 'data/entities-index.json'
TRANSLATIONS_FILE = 'data/translations_cache_2088.json'
OUTPUT_FILE = 'data/entities-index.json'

# 最高品質の個別プロファイルを保持する手動設定エンティティ
PRESERVE_BESPOKE_IDS = {
    'ent_worksbuddy_6e933270a77c',
    'ent_seendesignsystemuikit_7e1f3504b4c1',
    'ent_jameswells_verticalwallprinting_35kmonthhomeoffices_df30efaa76ff',
    'ent_danieltom_portabletoilets_100kmonthrentallocaldrive_c21a4f0bb412',
    'ent_willmilliken_pooperscooper_17kmonthrecurringsub_d47d488cf4c8',
    'ent_shauntookey_gravestonecleaning_40kmonthmemorialrestor_b61b477b792b',
    'ent_natalie_roversitter_15kmonthholidayratespetcare_8e1e77f9859f'
}

def clean_company_name(name):
    clean = re.sub(r'\s*\([^)]*\)', '', name)
    clean = re.sub(r'\s*(?:Inc\.|LLC|Corp\.|Ltd\.|Co\.|GmbH|Pty|SAS|S\.A\.|B\.V\.)', '', clean, flags=re.IGNORECASE)
    clean = re.sub(r'\|\s*.*$', '', clean)
    clean = re.sub(r'–\s*.*$', '', clean)
    clean = re.sub(r':\s*.*$', '', clean)
    clean = clean.strip()
    return clean if clean else name.strip()

def clean_what_it_does(name, clean_name, ja_text):
    t = ja_text.strip()
    t = re.sub(r'^[^\s]{1,30}(?:は|が)、?「(.*?)」', r'\1', t)
    t = t.replace('は、「', 'は ').replace('「', '').replace('」', '')
    prefixes = [
        rf'^{re.escape(name)}\s*(?:は|が|の|による|：|:)?\s*',
        rf'^{re.escape(clean_name)}\s*(?:は|が|の|による|：|:)?\s*',
        r'^(?:彼|彼女|これ|このアプリ|このツール|このサービス|このサイト|この企業|創業者|開発者)\s*(?:は|が|の)?\s*',
        r'^(?:A solo developer|A founder|Two physicists|Someone)\s*(?:charges|sells|built|runs)?\s*',
        r'^(?:個人の開発者|創業者|2人の物理学者|15歳|元アーミッシュ|私|私たち|私たちが|私が)\s*(?:は|が|の)?\s*'
    ]
    for p in prefixes:
        t = re.sub(p, '', t, flags=re.IGNORECASE).strip()

    first_sentence = re.split(r'[。！？\n]', t)[0].strip()
    if not first_sentence:
        first_sentence = t[:80].strip()

    ends = ['サービス', 'ツール', 'プラットフォーム', 'アプリ', '事業', 'モデル', 'システム', '基盤', '代行', 'ソリューション', 'キット', 'サイト', 'ポータル', 'ソフトウェア', 'ストア', 'マーケットプレイス']
    if not any(first_sentence.endswith(end) for end in ends):
        if any(w in first_sentence for w in ['アプリ', 'app']):
            first_sentence += 'アプリ'
        elif any(w in first_sentence for w in ['ツール', 'tool']):
            first_sentence += 'ツール'
        elif any(w in first_sentence for w in ['代行', '書く', '投稿', '清掃', 'コーティング']):
            first_sentence += '代行サービス'
        elif any(w in first_sentence for w in ['販売', '転売', '売る', 'せどり']):
            first_sentence += '実業モデル'
        else:
            first_sentence += '特化ソリューション'

    if len(first_sentence) > 120:
        first_sentence = first_sentence[:115] + '等'

    for p in prefixes:
        first_sentence = re.sub(p, '', first_sentence, flags=re.IGNORECASE).strip()

    first_sentence = first_sentence.replace('は、「', 'は ').replace('「', '').replace('」', '').strip()
    return first_sentence

def classify_archetype(name, en_text, ja_text):
    full_en = f'{name} {en_text}'.lower()
    full_ja = f'{name} {ja_text}'

    # 1. ATM & Vending Machines (無人機材・自販機・ATMルート)
    if bool(re.search(r'\b(atm|vending|cotton candy machine|vending machine)\b', full_en)) or any(k in full_ja for k in ['自販機', '自動販売機', 'atm', '綿菓子製造機']):
        return 'ATM_VENDING'

    # 2. B2B Outreach & Gift Middleman (B2Bギフト・役員直撃アポ獲得)
    if 'cake middleman' in full_en or ('cake' in full_en and 'prospect' in full_en) or 'パン屋から 80 ドルのケーキ' in full_ja:
        return 'B2B_OUTREACH_MIDDLEMAN'

    # 3. Specialized Animal Care & Training (犬訓練・ブリーダー・ペットケア)
    if bool(re.search(r'\b(dog breeder|shepherd|dog training|protection dog|pet care|dog walker)\b', full_en)) or any(k in full_ja for k in ['ダッチ・シェパード', '護衛犬', 'ドッグトレーナー', 'ペットシッター', '犬の散歩']):
        return 'SPECIALIZED_ANIMAL_CARE'

    # 4. Local Property & Maintenance Trades (白線・窓拭き・高圧洗浄・コンクリート施工・ゴミ箱)
    if bool(re.search(r'\b(line-striping|striping|sealcoating|power washing|pressure washing|window washer|drywall|painting|painter|cleaning|cleaner|lawn|mow|mowing|mechanic|detailing|garage|flooring|plumbing|roofing|hvac|pest|dumpster)\b', full_en)) or any(k in full_ja for k in ['清掃', '白線', '塗装', '窓拭き', '高圧洗浄', '修理', '施工', '床', 'ガレージ', '草刈り', '害虫', '配管', '板金', 'コンテナ']):
        return 'LOCAL_PROPERTY_MAINTENANCE'

    # 5. Food & Beverage (外食・軽食・カフェ・テイクアウト・ケータリング)
    if bool(re.search(r'\b(burrito|restaurant|cafe|coffee|bakery|cake|lemonade|food|bread|barbecue|sandwich|pizza|brewery|donut|taco|cookies|catering|meal)\b', full_en)) or any(k in full_ja for k in ['ブリトー', 'カフェ', 'コーヒー', 'パン屋', 'ケーキ', 'レモネード', 'ベーカリー', '飲食店', '食品', 'ドーナツ', 'タコス', 'ケータリング']):
        return 'FOOD_BEVERAGE'

    # 6. Arbitrage, Retail & Physical Goods (実業物販・転売・仕入れ・中古)
    if bool(re.search(r'\b(arbitrage|walmart|ebay|fba|flipper|flipping|thrift|resell|reselling|plate|license plate|sneaker|inventory|wholesale|3d print|merch|apparel|jewelry|physical phone|handset)\b', full_en)) or any(k in full_ja for k in ['転売', 'せどり', '仕入れ', '物販', '古着', 'ナンバープレート', '3dプリント', '仕入', '有形製品', 'ジュエリー']):
        return 'PHYSICAL_ARBITRAGE_RETAIL'

    # 7. Rental, Events & Space (レンタル・パーティー・バルーン・式場)
    if bool(re.search(r'\b(rental|renting|balloon|party rental|photobooth|bounce house|wedding|tents|event space|party chairs)\b', full_en)) or any(k in full_ja for k in ['レンタル', 'バルーン', 'パーティーレンタル', '結婚式', '写真ブース', 'テント貸出']):
        return 'RENTAL_EVENT_SPACE'

    # 8. Media, Newsletter & Print Publications (ニュースレター・ZINE・郵便)
    if bool(re.search(r'\b(newsletter|zine|snail mail|substack|beehiiv|newspaper|magazine|digest|publication)\b', full_en)) or any(k in full_ja for k in ['ニュースレター', '同人誌', '郵便', '手紙', '定期刊行物']):
        return 'MEDIA_NEWSLETTER_ZINE'

    # 9. Video, Creator, Clipping & Media Channels (YouTube・TikTok・切り抜き・動画制作)
    if bool(re.search(r'\b(youtube|youtuber|tiktok|clipper|clipping|podcast|commentary|creator|video editor|filmed|channel|faceless|vlogger|streamer)\b', full_en)) or any(k in full_ja for k in ['ユーチューブ', '切り抜き', 'ポッドキャスト', '動画クリエイター', '動画編集', 'チャンネル']):
        return 'CONTENT_VIDEO_CREATOR'

    # 10. Desktop Native Apps & Standalone Software (Macネイティブ・買い切りソフト)
    if bool(re.search(r'\b(mac app|macos|ios app|desktop app|swift|tauri|screen recorder|menu bar|menubar|native app|screen recording)\b', full_en)) or any(k in full_ja for k in ['録画ソフト', 'デスクトップ', '買い切りアプリ', 'macOS']):
        return 'DESKTOP_NATIVE_APP'

    # 11. Real Generative AI & LLM Systems (単語境界でのみ真のAIを判定)
    has_real_ai = bool(re.search(r'\b(ai|gpt|llm|chatgpt|openai|anthropic|machine learning|deep learning|artificial intelligence|prompt|lora|stable diffusion|midjourney|tts|transcription|voice ai|speech-to-text)\b', full_en)) or any(k in full_ja for k in ['人工知能', '画像生成', '音声認識', '文字起こし', '機械学習'])
    if has_real_ai:
        return 'REAL_AI_AGENT'

    # 12. Free Web Tools, Calculators, SEO Directories & Plugins (無料計算機・ディレクトリ・SEO)
    if bool(re.search(r'\b(calculator|directory|unscramble|search engine|free tool|plugin|lightbox|widget|database|curation|job board|rank & rent)\b', full_en)) or any(k in full_ja for k in ['計算機', 'ディレクトリ', '検索エンジン', '無料ツール', 'プラグイン', '求人掲示板']):
        return 'WEB_TOOL_SEO_DIRECTORY'

    # 13. B2B Services, Agencies & Ghostwriting (高単価代行・B2Bゴーストライティング)
    if bool(re.search(r'\b(ghostwriter|ghostwriting|agency|consulting|retainer|client|cold email|outreach|visa|tax|bookkeeping|audit|recruiting|staffing|postcard|direct mail)\b', full_en)) or any(k in full_ja for k in ['ゴーストライター', '代行', 'コンサル', '顧問', '営業代行', '記帳', 'ポストカード']):
        return 'B2B_SERVICE_AGENCY'

    # 14. Dev Tools, OSS & Developer Libraries (開発者向けOSS・ライブラリ)
    if bool(re.search(r'\b(open source|developer tool|sdk|api|library|github|ui kit|framework|boilerplate|starter kit)\b', full_en)) or any(k in full_ja for k in ['開発者', 'ライブラリ', 'ボイラープレート']):
        return 'DEV_TOOLS_OSS'

    # 15. Niche B2B SaaS (ニッチ特化クラウド)
    return 'NICHE_B2B_SAAS'

def build_bespoke_profile(name, clean_name, ja_text, en_text, role, tags, what_it_does):
    archetype = classify_archetype(name, en_text, ja_text)

    core_fact = re.sub(r'^[^\s]{1,10}(?:は|が)\s*', '', ja_text).strip()
    core_fact = re.split(r'[。！？\n]', core_fact)[0].strip()
    if len(core_fact) > 50:
        core_fact = core_fact[:45] + '…'

    if archetype == 'ATM_VENDING':
        tool_stack = [
            {'name': 'ATM / 自販機ハードウェア機材', 'category': 'HARDWARE', 'monthlyCost': 0, 'isCostUnconfirmed': True, 'purpose': f'{clean_name}の無人自動販売・現金出金端末'},
            {'name': '売上監視・残高テレメトリー配管', 'category': 'TELEMETRY', 'monthlyCost': 0, 'isCostUnconfirmed': True, 'purpose': f'{clean_name}の遠隔在庫・現金残高モニタリング'}
        ]
        return {
            'archetype': archetype,
            'tool_stack': tool_stack,
            'stack': f'ATM / 自動販売機機材 × 現金のみ店舗・リゾート立地契約 × 遠隔売上監視テレメトリー × 手数料自動回収口座',
            'moat': f'{clean_name}独自の高トラフィック店舗・施設オーナーとの排他的な設置場所契約、および無人稼働による極小の労働コスト。',
            'arch': f'{clean_name}式無人機材設置・手数料自動徴収配管',
            'pain': f'現金決済のみのバーや高密度リゾートで、客がその場で手軽に現金を引き出したり特別なスイーツを購入したい即時欲求（{clean_name}が解決する「{core_fact}」への対価支出）',
            'flaw': f'大手銀行や大手飲料ベンダーが高コストな専用機材や画一的な審査基準に縛られ、小規模なローカル店舗やニッチな観光地スポット（{clean_name}の設置領域）を放置している死角',
            'stealth': f'{clean_name}が実証した店舗オーナーとの手数料折半交渉と初動設置（{what_it_does[:35]}）',
            'checklist': [
                f'1. 設置候補地の特定：現金需要が高いバーやレジャー施設を訪問し、空きスペースの設置交渉を行う',
                f'2. 大手の死角突破：大手銀行が撤退した空白地帯に特化し、店舗オーナーと手数料折半契約を結ぶ',
                f'3. 現金回収配管の構築：無人機材を設置して売上監視テレメトリーを繋ぎ、引き出し手数料を自動回収する'
            ]
        }

    elif archetype == 'B2B_OUTREACH_MIDDLEMAN':
        tool_stack = [
            {'name': 'LinkedIn / 企業キーマンリスト', 'category': 'LEAD_GEN', 'monthlyCost': 0, 'isCostUnconfirmed': True, 'purpose': f'{clean_name}の決裁者・役員リスト抽出'},
            {'name': 'ローカルベーカリー手配網', 'category': 'FULFILLMENT', 'monthlyCost': 0, 'isCostUnconfirmed': True, 'purpose': f'{clean_name}の個別ケーキ・ギフト配送手配'},
            {'name': 'Stripe / 銀行振込決済', 'category': 'PAYMENT', 'monthlyCost': 0, 'isCostUnconfirmed': True, 'purpose': f'{clean_name}のアポ獲得報酬・月額リテイナー回収'}
        ]
        return {
            'archetype': archetype,
            'tool_stack': tool_stack,
            'stack': f'ターゲット企業キーマンリスト × 近隣ローカルベーカリー提携 × サプライズギフト配送 × 成果報酬/リテイナー決済',
            'moat': f'{clean_name}が実証したメールを無視する重役のガードを突破する圧倒的な開封率（35%超）、および地元店舗網との機動的な発注連携。',
            'arch': f'{clean_name}式フィジカルギフト・役員直撃アポ獲得配管',
            'pain': f'毎日何十通もの営業メールを即削除する多忙なCEO・役員の注意を引き、商談の場を確実にセッティングしたい営業チームの焦燥感（{clean_name}が解決する「{core_fact}」への対価支出）',
            'flaw': f'大手営業支援ツールが画一的なコールドメールや自動架電に依存し、役員の秘書やスパムフィルターに阻まれて門前払いされている死角（{clean_name}の突破領域）',
            'stealth': f'{clean_name}が実証した手動での初期クライアント獲得と高単価契約（{what_it_does[:35]}）',
            'checklist': [
                f'1. 標的役員の特定：高単価成約が見込める見込み客のオフィス所在地と近隣の優良ベーカリーを特定する',
                f'2. 大手の死角突破：全員が無視するデジタル営業メールを捨て、焼きたてのケーキを直接届けて秘書のガードを突破する',
                f'3. 現金回収配管の構築：サプライズ配送直後にフォロー連絡を入れ、35%の成約率で商談アポ獲得報酬を回収する'
            ]
        }

    elif archetype == 'SPECIALIZED_ANIMAL_CARE':
        tool_stack = [
            {'name': '専用訓練施設・犬舎設備', 'category': 'INFRASTRUCTURE', 'monthlyCost': 0, 'isCostUnconfirmed': True, 'purpose': f'{clean_name}の護衛訓練・飼育管理'},
            {'name': '銀行振込 / 前受手付金決済', 'category': 'PAYMENT', 'monthlyCost': 0, 'isCostUnconfirmed': True, 'purpose': f'{clean_name}の富裕層直接決済'}
        ]
        return {
            'archetype': archetype,
            'tool_stack': tool_stack,
            'stack': f'専用訓練牧場 × 優良血統ブリーディング施設 × 富裕層直接手渡しネットワーク × 銀行振込・前受金決済',
            'moat': f'{clean_name}の長期間の徹底した専従訓練による圧倒的な服従品質、富裕層コミュニティ内の強固な紹介信用、および代替不可能な職人技。',
            'arch': f'{clean_name}式超高単価使役犬育成・富裕層直販配管',
            'pain': f'莫大な資産や家族の安全を守るため、機械警備や一般ペットでは満たせない絶対的な護衛能力と忠誠心を求める富裕層の安全欲求（{clean_name}が解決する「{core_fact}」への対価支出）',
            'flaw': f'一般的なペットショップや警備会社が画一的な大量飼育や機械警備に依存し、専従訓練を施した最高品質の護衛犬（{clean_name}の提供価値）を個別に供給できない死角',
            'stealth': f'{clean_name}が実証した口コミ紹介と富裕層への直接納犬（{what_it_does[:35]}）',
            'checklist': [
                f'1. 優良血統の確保：厳選された血統のブリーディングを行い、牧場で徹底した服従・護衛訓練を開始する',
                f'2. 大手の死角突破：大手警備会社や量販ペット店が提供できない、個別家庭専用の最高水準の護衛能力を完成させる',
                f'3. 現金回収配管の構築：富裕層への直接手渡し納犬と紹介ネットワークを確立し、高額な予約手付金と残金銀行振込で回収する'
            ]
        }

    elif archetype == 'LOCAL_PROPERTY_MAINTENANCE':
        tool_stack = [
            {'name': '専用施工機材（白線塗装・高圧洗浄等）', 'category': 'HARDWARE', 'monthlyCost': 0, 'isCostUnconfirmed': True, 'purpose': f'{clean_name}の現場施工・高品質作業'},
            {'name': '銀行振込 / Square決済', 'category': 'PAYMENT', 'monthlyCost': 0, 'isCostUnconfirmed': True, 'purpose': f'{clean_name}の施工完了後即時回収'}
        ]
        return {
            'archetype': archetype,
            'tool_stack': tool_stack,
            'stack': f'専用施工機材 × 地元店舗・住民ダイレクト営業 × 現場施工・直接提供 × 銀行振込 / Square決済',
            'moat': f'{clean_name}が施工先不動産・店舗と築く強固な信頼関係、定期塗り替え・メンテナンスのリピート契約、および低初期投資による極小損益分岐点。',
            'arch': f'{clean_name}式地域密着現場施工・直接受託配管',
            'pain': f'設備の劣化や汚れによるトラブルを未然に防ぎたいが、大手業者に頼むと高額すぎると悩む施設オーナーや住民の保身と維持管理（{clean_name}が解決する「{core_fact}」への対価支出）',
            'flaw': f'大手総合建設・メンテナンス会社が高額な最低請負金額を設定し、小口の緊急施工や定期メンテ（{clean_name}の主戦場）を完全に見捨てている死角',
            'stealth': f'{clean_name}が実証したコールド営業・地元直販での初動獲得（{what_it_does[:35]}）',
            'checklist': [
                f'1. 施工機材と地域の特定：中古の専門機材を安価に確保し、劣化が放置された地元施設や店舗をリスト化する',
                f'2. 大手の死角突破：大手が見捨てる小口施工に特化し、低価格・即日対応の直接提案で競合を無力化する',
                f'3. 現金回収配管の構築：施工完了後の即時請求書決済を行い、施設管理会社との定期リピート契約へと繋げる'
            ]
        }

    elif archetype == 'FOOD_BEVERAGE':
        tool_stack = [
            {'name': 'Square POS / 現金決済', 'category': 'PAYMENT', 'monthlyCost': 0, 'isCostUnconfirmed': True, 'purpose': f'{clean_name}の店頭・出店即時決済'},
            {'name': '食材・包材卸売仕入れ網', 'category': 'SUPPLY_CHAIN', 'monthlyCost': 0, 'isCostUnconfirmed': True, 'purpose': f'{clean_name}の食材・資材調達'}
        ]
        return {
            'archetype': archetype,
            'tool_stack': tool_stack,
            'stack': f'出店・拠点スペース × POSレジ（Square / 現金） × 卸売食材仕入れ網 × 地域動線独占',
            'moat': f'{clean_name}独自の出店立地（常連・職人の固定動線）、中毒性のある秘伝レシピ、および朝・昼の行列による社会的証明。',
            'arch': f'{clean_name}式ロードサイド・店舗飲食直販配管',
            'pain': f'朝や昼の移動中・現場仕事の合間に、待たされずに出来立てで満足感の高い食事を手軽に入手したい顧客の食欲と時間制約（{clean_name}が解決する「{core_fact}」への対価支出）',
            'flaw': f'大手外食チェーンが高額な初期投資と画一的なセントラルキッチンに縛られ、極小スペースや柔軟な出店（{clean_name}の独占立地）に対応できない死角',
            'stealth': f'{clean_name}が実証した初期出店と口コミ行列の獲得（{what_it_does[:35]}）',
            'checklist': [
                f'1. 立地と需要の特定：幹線道路沿いや商業施設の遊休スペースを確保し、周辺の職人・住民の動線を特定する',
                f'2. 大手の死角突破：大手外食チェーンが出店できない小規模拠点に特化し、柔軟な特化メニューを提供する',
                f'3. 現金回収配管の構築：Squareレジと食材仕入れ網を敷き、日々の即時現金決済と口コミ行列ループを回す'
            ]
        }

    elif archetype == 'PHYSICAL_ARBITRAGE_RETAIL':
        tool_stack = [
            {'name': 'Amazon FBA / eBay', 'category': 'MARKETPLACE', 'monthlyCost': 0, 'isCostUnconfirmed': True, 'purpose': f'{clean_name}のマルチチャネル自動出品・配送'},
            {'name': 'Keepa / 独自価格差リサーチ', 'category': 'RESEARCH', 'monthlyCost': 0, 'isCostUnconfirmed': True, 'purpose': f'{clean_name}の利益商品スクリーニング'}
        ]
        return {
            'archetype': archetype,
            'tool_stack': tool_stack,
            'stack': f'{clean_name}専用仕入れ網 × Amazon FBA / eBay配管 × Keepa / 独自価格差リサーチ × 売上金自動入金口座',
            'moat': f'{clean_name}独自の安価仕入れサプライチェーン、蓄積された高評価セラーアカウント、および在庫回転率の徹底最適化。',
            'arch': f'{clean_name}式実業物販・価格差アービトラージ配管',
            'pain': f'実店舗を探し回る時間がなく、オンライン上で正規品や専門商品を今すぐ確実に入手したい顧客の需要（{clean_name}が解決する「{core_fact}」への対価支出）',
            'flaw': f'大手流通チェーンが地域店舗の過剰在庫や局所的な需要偏在に対応できず、機動的な特化流通（{clean_name}の展開領域）の隙間を放置している死角',
            'stealth': f'{clean_name}が実証した初期仕入れ・販売アプローチ（{what_it_does[:35]}）',
            'checklist': [
                f'1. 価格差商品の特定：Keepaや実地リサーチで流通価格差のあるニッチ商品を抽出し、仕入れルートを開拓する',
                f'2. 大手の死角突破：大手量販店が処分に困る局所在庫やニッチ商品を機動的に買い取り、オンライン市場へ流す',
                f'3. 現金回収配管の構築：FBAやeBayのフルフィルメント配管を敷き、売上金の自動入金ループを高速回転させる'
            ]
        }

    elif archetype == 'RENTAL_EVENT_SPACE':
        tool_stack = [
            {'name': 'レンタル備品保管拠点', 'category': 'INVENTORY', 'monthlyCost': 0, 'isCostUnconfirmed': True, 'purpose': f'{clean_name}の備品管理・保管'},
            {'name': 'Web予約フォーム・クレジット決済', 'category': 'PAYMENT', 'monthlyCost': 0, 'isCostUnconfirmed': True, 'purpose': f'{clean_name}の予約手付金自動回収'}
        ]
        return {
            'archetype': archetype,
            'tool_stack': tool_stack,
            'stack': f'レンタル備品倉庫 × トラック・配送網 × Web予約フォーム × 手付金・クレジット決済',
            'moat': f'{clean_name}が持つイベント会場・プランナーとの専属提携、週末の高稼働率、および償却済み機材による圧倒的高粗利。',
            'arch': f'{clean_name}式イベント備品貸出・高稼働レンタル配管',
            'pain': f'年数回の特別なイベントのために高価な機材や装飾を買い揃える無駄を避け、設営から手軽に任せたい幹事の労力削減（{clean_name}が解決する「{core_fact}」への対価支出）',
            'flaw': f'大手イベント会社が大型法人契約に偏重し、個人や中小規模のパーティー需要（{clean_name}の対応領域）を割高な料金で門前払いしている死角',
            'stealth': f'{clean_name}が実証したSNS発信・地元紹介による初動獲得（{what_it_does[:35]}）',
            'checklist': [
                f'1. 需要備品の特定：パーティーや結婚式で需要の高い機材・装飾を揃え、地域プランナーと提携する',
                f'2. 大手の死角突破：大手イベント会社が高額で見捨てる小規模パーティーに特化し、柔軟な設営パッケージを提供する',
                f'3. 現金回収配管の構築：予約手付金決済と週末配送配管を確立し、償却済み機材のレンタル粗利を回収する'
            ]
        }

    elif archetype == 'MEDIA_NEWSLETTER_ZINE':
        tool_stack = [
            {'name': 'Beehiiv / Substack', 'category': 'MARKETING', 'monthlyCost': 0, 'isCostUnconfirmed': True, 'purpose': f'{clean_name}のニュースレター読者配信'},
            {'name': 'Stripe / 銀行振込', 'category': 'PAYMENT', 'monthlyCost': 0, 'isCostUnconfirmed': True, 'purpose': f'{clean_name}のスポンサー広告費・購読料回収'}
        ]
        return {
            'archetype': archetype,
            'tool_stack': tool_stack,
            'stack': f'ニュースレター配信基盤（Beehiiv / Substack） × 地元スポンサー直接開拓 × 広告枠決済・請求書管理',
            'moat': f'{clean_name}が築いた超ニッチ・地元密着の熱狂的読者基盤、高い開封率、および地元スポンサーとの直接リレーション。',
            'arch': f'{clean_name}式特化メディア・地元スポンサー直収配管',
            'pain': f'アルゴリズムのノイズに埋もれず、自分に関係のある厳選された情報や地域トピックだけを確実に把握したい読者の情報飢餓（{clean_name}が解決する「{core_fact}」への対価支出）',
            'flaw': f'大手ポータルや全国紙が広域の一般ニュースしか扱えず、町単位のディープな話題やイベント情報（{clean_name}の独占領域）を完全に無視している死角',
            'stealth': f'{clean_name}が実証した泥臭い初期読者獲得と地元企業への広告営業（{what_it_does[:35]}）',
            'checklist': [
                f'1. 読者コミュニティの特定：地元住民や特定業界の読者が毎日読みたくなる一次情報・イベント情報をキュレーションする',
                f'2. 大手の死角突破：全国メディアが相手にしない地域店舗や地元企業に対し、高い開封率を誇るスポンサー枠を直接提案する',
                f'3. 現金回収配管の構築：配信基盤とStripe請求書を連携させ、毎号の広告枠完売と月額購読料を安定回収する'
            ]
        }

    elif archetype == 'CONTENT_VIDEO_CREATOR':
        tool_stack = [
            {'name': 'Premiere Pro / CapCut', 'category': 'PRODUCTION', 'monthlyCost': 0, 'isCostUnconfirmed': True, 'purpose': f'{clean_name}の高速動画編集'},
            {'name': 'YouTube / TikTok / Amazon Influencer', 'category': 'DISTRIBUTION', 'monthlyCost': 0, 'isCostUnconfirmed': True, 'purpose': f'{clean_name}の動画配信・収益化'}
        ]
        return {
            'archetype': archetype,
            'tool_stack': tool_stack,
            'stack': f'動画編集ソフト（Premiere / CapCut） × YouTube / TikTok / Amazon Influencer × アフィリエイト / 広告収益分配配管',
            'moat': f'{clean_name}による大量動画投稿での検索上位独占、購入直前の購買意欲が高い視聴者トラフィック、および制作プロセスの完全テンプレ化。',
            'arch': f'{clean_name}式動画コンテンツ量産・成果報酬分配配管',
            'pain': f'長文の説明文や怪しいレビューを読む手間を省き、購入前に1分で製品の実際の使用感や要点を動画で確認したい視聴者の時間短縮（{clean_name}が解決する「{core_fact}」への対価支出）',
            'flaw': f'大手制作会社が高額な制作費と長期の企画に縛られ、トレンドに合わせた即時動画量産（{clean_name}の高速供給）に追いつけない死角',
            'stealth': f'{clean_name}が実証したバイラル検証と高回転動画投稿（{what_it_does[:35]}）',
            'checklist': [
                f'1. 高需要トピックの特定：売れ筋商品やバズ動画のフックを分析し、視聴者が即座にクリックする企画を抽出する',
                f'2. 大手の死角突破：大手制作会社が手を出せない短尺・高回転の動画をテンプレ化し、毎日安定して投稿する',
                f'3. 現金回収配管の構築：プラットフォームの収益化プログラムとアフィリエイト配管を敷き、再生回数から現金を抜く'
            ]
        }

    elif archetype == 'DESKTOP_NATIVE_APP':
        tool_stack = [
            {'name': 'Swift / Tauri', 'category': 'FRAMEWORK', 'monthlyCost': 0, 'isCostUnconfirmed': True, 'purpose': f'{clean_name}のローカルネイティブ実行基盤'},
            {'name': 'Lemon Squeezy / Gumroad', 'category': 'PAYMENT', 'monthlyCost': 0, 'isCostUnconfirmed': True, 'purpose': f'{clean_name}の買い切りライセンス決済'}
        ]
        return {
            'archetype': archetype,
            'tool_stack': tool_stack,
            'stack': f'Swift / Tauriネイティブ開発基盤 × Lemon Squeezy / Gumroad買い切り決済 × ローカル暗号化ストレージ',
            'moat': f'{clean_name}独自のクラウド通信不要の超高速ローカル処理と、一度購入すれば半永久的に使用できる買い切りライセンスへの絶対的信頼。',
            'arch': f'{clean_name}式サブスク疲れ逆張り・完全買い切り直販配管',
            'pain': f'単機能ツールの利用のために毎月課金され続けるサブスクリプションへの強い嫌悪感と、買い切りソフトを求めるユーザーの防衛本能（{clean_name}が解決する「{core_fact}」への対価支出）',
            'flaw': f'大手ソフトウェアベンダーが一斉にARR最大化を狙って月額サブスク化へと舵を切り、シンプルで壊れない買い切り需要（{clean_name}が拾った領域）を完全に切り捨てた死角',
            'stealth': f'{clean_name}が実証したサブスク移行に怒る競合ユーザーの刈り取り（{what_it_does[:35]}）',
            'checklist': [
                f'1. サブスク疲れ市場の特定：毎月課金を強いる大手競合ツールを特定し、不満を持つヘビーユーザー層をあぶり出す',
                f'2. 大手の死角突破：大手SaaSが維持できない「完全買い切り・ローカル完結」の超軽量ネイティブアプリを開発する',
                f'3. 現金回収配管の構築：Lemon Squeezy決済とライセンスキー自動発行配管を敷き、買い切り前金総取りで現金を回収する'
            ]
        }

    elif archetype == 'REAL_AI_AGENT':
        tool_stack = [
            {'name': 'LLM API (OpenAI / Anthropic)', 'category': 'AI_MODEL', 'monthlyCost': 0, 'isCostUnconfirmed': True, 'purpose': f'{clean_name}の推論・テキスト生成エンジン'},
            {'name': 'GPU推論インフラ (Replicate / RunPod)', 'category': 'INFRASTRUCTURE', 'monthlyCost': 0, 'isCostUnconfirmed': True, 'purpose': f'{clean_name}の特化モデル実行'},
            {'name': 'Stripe Billing', 'category': 'PAYMENT', 'monthlyCost': 0, 'isCostUnconfirmed': True, 'purpose': f'{clean_name}のクレジット従量課金・サブスク'}
        ]
        return {
            'archetype': archetype,
            'tool_stack': tool_stack,
            'stack': f'LLM API (OpenAI/Anthropic) × GPU推論インフラ (Replicate/RunPod) × Next.js × Stripe Billing',
            'moat': f'{clean_name}独自の特化プロンプト設計、ドメイン特化ファインチューニング資産、およびユーザー生成履歴データ。',
            'arch': f'{clean_name}式特化AI推論・クレジット従量課金配管',
            'pain': f'プロの専門家や制作スタジオに依頼する高額な費用と納品待ち時間をゼロにし、即座に高品質な生成結果を得たい要求（{clean_name}が解決する「{core_fact}」への対価支出）',
            'flaw': f'大手AIベンダーが汎用チャットボットの提供に留まり、特定用途や一貫したアウトプット（{clean_name}の対象領域）に最適化された実用UIを提供していない死角',
            'stealth': f'{clean_name}が実証した初期プロトタイプ開発とコミュニティ獲得（{what_it_does[:35]}）',
            'checklist': [
                f'1. 特化プロンプトの特定：汎用AIでは失敗しやすい特定領域のワークフローを分解し、高精度プロンプトを構築する',
                f'2. 大手の死角突破：大手LLMベンダーが対応しない特定用途専用の直感UIを提供し、非エンジニアでも即座に使えるようにする',
                f'3. 現金回収配管の構築：Stripeのクレジット従量課金を敷き、API原価に健全な粗利を乗せて即時現金を回収する'
            ]
        }

    elif archetype == 'WEB_TOOL_SEO_DIRECTORY':
        tool_stack = [
            {'name': 'Next.js / 静的ホスティング', 'category': 'HOSTING', 'monthlyCost': 0, 'isCostUnconfirmed': True, 'purpose': f'{clean_name}の高速Web配信'},
            {'name': 'Google AdSense / Stripe', 'category': 'MONETIZATION', 'monthlyCost': 0, 'isCostUnconfirmed': True, 'purpose': f'{clean_name}の広告・掲載料回収'}
        ]
        return {
            'archetype': archetype,
            'tool_stack': tool_stack,
            'stack': f'Next.js / 静的サイト × 独自スクレイピングクローラー × SEO検索インデックス × Google AdSense / Stripe決済',
            'moat': f'{clean_name}が蓄積したロングテール検索流入の独占、高いドメイン権威、およびサーバーレスによる維持費極小構造。',
            'arch': f'{clean_name}式SEOロングテール・無料ツール集客配管',
            'pain': f'ネット上に散在するノイズから必要な情報や計算結果を手動で探す膨大な工数と、見落としによる機会損失の焦燥感（{clean_name}が解決する「{core_fact}」への対価支出）',
            'flaw': f'大手総合ポータルや大手求人サイトが画一的な情報掲載に終始し、ニッチな計算ツールや特化データベース（{clean_name}が提供する特化データ）に対応できていない死角',
            'stealth': f'{clean_name}が実証した自動スクレイピングと初期オーガニック流入の獲得（{what_it_does[:35]}）',
            'checklist': [
                f'1. 検索ボリュームの特定：競合が少なく月間数千回検索されるニッチな計算・検索キーワードを特定する',
                f'2. 大手の死角突破：ログイン不要で1秒で結果が出る超軽量ツールを公開し、大手ポータルの複雑な導線を出し抜く',
                f'3. 現金回収配管の構築：広告枠やプレミアム掲載のStripe決済を設置し、SEOオーガニック流入から自動で現金を抜く'
            ]
        }

    elif archetype == 'B2B_SERVICE_AGENCY':
        tool_stack = [
            {'name': 'LinkedIn / コールドメール営業ツール', 'category': 'MARKETING', 'monthlyCost': 0, 'isCostUnconfirmed': True, 'purpose': f'{clean_name}の経営者アプローチ'},
            {'name': 'Stripe / 銀行振込', 'category': 'PAYMENT', 'monthlyCost': 0, 'isCostUnconfirmed': True, 'purpose': f'{clean_name}の月額リテイナー回収'}
        ]
        return {
            'archetype': archetype,
            'tool_stack': tool_stack,
            'stack': f'業務管理ダッシュボード × LinkedIn / コールドメール営業配管 × クライアント専任納品 × 月額リテイナー / Stripe請求書決済',
            'moat': f'{clean_name}とクライアント経営者との強固な信頼関係、過去の圧倒的な納品実績、および高単価リテイナー契約による継続リピート紹介ループ。',
            'arch': f'{clean_name}式高単価業務代行・月額リテイナー直収配管',
            'pain': f'経営者や実務家が多忙で専門作業に手が回らず、外注先の品質やコミュニケーションコストに疲弊している業務ボトルネック（{clean_name}が解決する「{core_fact}」への対価支出）',
            'flaw': f'大手コンサルや大手代行会社が高額な初期費用と長期縛りを要求し、個人や中小企業が気軽に頼める機動的代行（{clean_name}のサービス枠）を放置している死角',
            'stealth': f'{clean_name}が実証した手動での初期クライアント獲得と高単価契約（{what_it_does[:35]}）',
            'checklist': [
                f'1. ボトルネックの特定：経営者が「やりたいが時間がなくて放置している」高単価業務をピンポイントで特定する',
                f'2. 大手の死角突破：大手代行会社が対応できない即応性と個別カスタマイズを提供し、コールドメールで直接提案する',
                f'3. 現金回収配管の構築：月額固定リテイナー契約を締結し、毎月自動更新のStripe請求書決済でキャッシュを固定化する'
            ]
        }

    elif archetype == 'DEV_TOOLS_OSS':
        tool_stack = [
            {'name': 'npm / GitHub Packages', 'category': 'PACKAGE', 'monthlyCost': 0, 'isCostUnconfirmed': True, 'purpose': f'{clean_name}のパッケージ配布'},
            {'name': 'Stripe / GitHub Sponsors', 'category': 'PAYMENT', 'monthlyCost': 0, 'isCostUnconfirmed': True, 'purpose': f'{clean_name}の商用ライセンス決済'}
        ]
        return {
            'archetype': archetype,
            'tool_stack': tool_stack,
            'stack': f'npm / GitHubリポジトリ × ドキュメントサイト × 開発者コミュニティ × Stripe / GitHub Sponsors',
            'moat': f'{clean_name}のGitHubスター・開発者コミュニティによる強固なネットワーク効果、開発現場への深い埋め込み、および乗り換え困難なコード資産。',
            'arch': f'{clean_name}式開発者ツール・ライセンス直販配管',
            'pain': f'車輪の再発明による膨大な開発工数と、自作コードのバグやメンテナンス負担に悩むエンジニアの工数削減（{clean_name}が解決する「{core_fact}」への対価支出）',
            'flaw': f'大手テック企業が自社エコシステムへの囲い込みを狙い、フレームワーク非依存で軽量な開発者ツール（{clean_name}の提供価値）を提供しない死角',
            'stealth': f'{clean_name}が実証したOSS公開と開発者コミュニティでの口コミ獲得（{what_it_does[:35]}）',
            'checklist': [
                f'1. 共通の技術課題の特定：世界中のエンジニアが自前実装で消耗しているライブラリやUIパーツを特定する',
                f'2. 大手の死角突破：巨大フレームワークの重厚な依存関係を排し、1行で導入できる極小コンポーネントをOSS公開する',
                f'3. 現金回収配管の構築：商用利用ライセンスや高度機能のStripe決済を敷き、開発チームから直接ライセンス料を徴収する'
            ]
        }

    else: # NICHE_B2B_SAAS
        tool_stack = [
            {'name': 'Next.js / React', 'category': 'FRONTEND', 'monthlyCost': 0, 'isCostUnconfirmed': True, 'purpose': f'{clean_name}のユーザー操作UI'},
            {'name': 'PostgreSQL / Supabase', 'category': 'DATABASE', 'monthlyCost': 0, 'isCostUnconfirmed': True, 'purpose': f'{clean_name}の業務データ保管'},
            {'name': 'Stripe Billing', 'category': 'PAYMENT', 'monthlyCost': 0, 'isCostUnconfirmed': True, 'purpose': f'{clean_name}の月額サブスク課金'}
        ]
        return {
            'archetype': archetype,
            'tool_stack': tool_stack,
            'stack': f'Next.js × Node.js / Python API × PostgreSQL × Stripe Billing × 各種クラウドAPI連携',
            'moat': f'{clean_name}が顧客の日常ワークフローと業務データに密結合することによる、不可逆な他社乗り換え障壁。',
            'arch': f'{clean_name}式業務特化クラウド・月額定額直収配管',
            'pain': f'複雑すぎる汎用システムの導入・運用コストや、日々の非効率な手作業による現場担当者の疲弊とミス（{clean_name}が解決する「{core_fact}」への対価支出）',
            'flaw': f'大手エンタープライズSaaSが高額かつ多機能すぎて使いこなせない中小企業（{clean_name}の顧客層）を門前払いしている構造的死角',
            'stealth': f'{clean_name}が実証した特定業務課題への直球アプローチ（{what_it_does[:35]}）',
            'checklist': [
                f'1. 業務の不満の特定：特定職種の担当者がスプレッドシート等で苦労している手作業ワークフローを特定する',
                f'2. 大手の死角突破：大手エンタープライズSaaSの過剰機能を削ぎ落とし、現場が1分で理解できる専用画面を提供する',
                f'3. 現金回収配管の構築：Stripeサブスクリプションを敷き、毎月自動更新の月額利用料でストック収益を確立する'
            ]
        }

def main():
    if not os.path.exists(TRANSLATIONS_FILE):
        print(f"Error: {TRANSLATIONS_FILE} not found")
        return

    with open(ENTITIES_FILE, 'r') as f:
        entities = json.load(f)

    with open(TRANSLATIONS_FILE, 'r') as f:
        translations = json.load(f)

    print(f"Loaded {len(entities)} entities, {len(translations)} translations.")

    # 名前重複解消マップの構築
    all_clean_names = [clean_company_name(e.get('name', '')) for e in entities]
    clean_counts = Counter(all_clean_names)

    updated_count = 0

    for e in entities:
        eid = e.get('id')
        if eid in PRESERVE_BESPOKE_IDS:
            continue

        if eid not in translations:
            continue

        trans = translations[eid]
        ja_text = trans.get('ja_text', '').strip()
        en_text = trans.get('en_text', '').strip()
        name = e.get('name', '')
        c_name = clean_company_name(name)
        # もしclean_nameが重複する場合は、固有のnameを採用して完全一意化
        clean_name = name if clean_counts[c_name] > 1 else c_name

        role = trans.get('role', '')
        tags = trans.get('tags', [])

        if not ja_text:
            continue

        what_it_does = clean_what_it_does(name, clean_name, ja_text)
        prof = build_bespoke_profile(name, clean_name, ja_text, en_text, role, tags, what_it_does)

        target_prey = prof['pain']
        structural_flaw = prof['flaw']
        stealth_entry = prof['stealth']
        toll_gate_setup = prof['arch']
        architecture_pattern = prof['arch']
        pipeline_stack = prof['stack']
        moat_description = prof['moat']
        checklist = prof['checklist']
        tool_stack = prof['tool_stack']

        revenue_prefix = ''
        m_rev = re.match(r'^(【[^】]+】)', e.get('tagline', ''))
        if m_rev:
            revenue_prefix = m_rev.group(1)

        tagline = f'{revenue_prefix}{name}：{what_it_does}。大手の死角を突き現金を直収する特化モデル。'
        description = f'{name}は、{what_it_does}を展開。無駄な多機能を排し、顧客の現場課題を直接解決する筋肉質モデル。'

        e['tagline'] = tagline
        e['description'] = description
        e['moatDescription'] = moat_description
        e['pipelineStack'] = pipeline_stack
        e['architecturePattern'] = architecture_pattern

        if 'operations' not in e or not isinstance(e['operations'], dict):
            e['operations'] = {}
        e['operations']['toolStack'] = tool_stack

        if 'essence' not in e or not isinstance(e['essence'], dict):
            e['essence'] = {}
        e['essence']['whatItDoes'] = what_it_does
        e['essence']['targetCustomer'] = target_prey
        e['essence']['painRelief'] = target_prey

        if 'lootBlueprint' not in e or not isinstance(e['lootBlueprint'], dict):
            e['lootBlueprint'] = {}
        lb = e['lootBlueprint']
        lb['targetPrey'] = target_prey
        lb['structuralFlaw'] = structural_flaw
        lb['stealthEntry'] = stealth_entry
        lb['tollGateSetup'] = toll_gate_setup
        lb['architecturePattern'] = architecture_pattern
        lb['pipelineStack'] = pipeline_stack
        lb['executionChecklist'] = checklist

        updated_count += 1

    print(f"Updated {updated_count} entities with bespoke facts from translations.")

    with open(OUTPUT_FILE, 'w') as f:
        json.dump(entities, f, indent=2, ensure_ascii=False)

    print("Saved updated entities-index.json.")

if __name__ == '__main__':
    main()

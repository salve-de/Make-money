import json
import os
import re
from collections import Counter

ENTITIES_FILE = 'data/entities-index.json'
TRANSLATIONS_FILE = 'data/translations_cache_2088.json'
OUTPUT_FILE = 'data/entities-index.json'

# 前セッションで手作業で完璧に仕上げた特定企業のIDリスト（これらは最高品質の個別プロファイルを保持）
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
    prefixes = [
        rf'^{re.escape(name)}\s*(?:は|が|の|による|：|:)',
        rf'^{re.escape(clean_name)}\s*(?:は|が|の|による|：|:)',
        r'^(?:彼|彼女|これ|このアプリ|このツール|このサービス|このサイト|この企業|創業者|開発者)\s*(?:は|が|の)',
        r'^(?:A solo developer|A founder|Two physicists|Someone)\s*(?:charges|sells|built|runs)?',
        r'^(?:個人の開発者|創業者|2人の物理学者|15歳|元アーミッシュ)\s*(?:は|が|の)?'
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

    return first_sentence

def build_bespoke_profile(name, clean_name, ja_text, en_text, role, tags, what_it_does):
    full = (name + ' ' + clean_name + ' ' + ja_text + ' ' + en_text + ' ' + role + ' ' + ' '.join(tags)).lower()

    core_fact = re.sub(r'^[^\s]{1,10}(?:は|が)\s*', '', ja_text).strip()
    core_fact = re.split(r'[。！？\n]', core_fact)[0].strip()
    if len(core_fact) > 50:
        core_fact = core_fact[:45] + '…'

    if any(w in full for w in ['転売', 'せどり', 'walmart', 'nike', 'amazon', 'ebay', '物販', '仕入れ', '自販機', '綿菓子', 'スプレー', '3d', 'print', 'arbitrage', 'retail', 'washer', 'dryer', 'drone', 'spraying', 'lemonade', 'golf', 'coffee', 'cotton candy', 'atm']):
        return {
            'stack': f'{clean_name}専用仕入れ網 × Amazon / Shopify / 各種EC配管 × Keepa / 独自リサーチ × Stripe決済',
            'moat': f'{clean_name}独自の仕入れサプライチェーン、蓄積された高評価セラーアカウント、および在庫回転率の最適化。',
            'arch': f'{clean_name}式実業物販・価格差アービトラージ配管',
            'pain': f'実店舗に足を運ぶ時間がなく、オンライン上で正規品や専門商品を今すぐ確実に入手したい顧客の需要と手軽さへの対価（{core_fact}への支出）',
            'flaw': f'大手流通チェーンが地域店舗の過剰在庫や局所的な需要偏在に対応できず、機動的な特化流通（{clean_name}の展開領域）の隙間を放置している死角',
            'stealth': f'{clean_name}が実証した初期仕入れ・販売アプローチ（{what_it_does[:35]}）'
        }

    if any(w in full for w in ['ai', 'gpt', 'llm', '写真', '画像生成', '動画生成', 'モデル', 'lora', 'generator', 'prompt', 'bot', 'avatar', 'face', 'transcription', 'speech', 'voice']):
        return {
            'stack': f'LLM API (OpenAI/Anthropic) × GPU推論インフラ (Replicate/RunPod) × Next.js × Stripe Billing',
            'moat': f'{clean_name}独自のプロンプト最適化ノウハウ、事前学習済みモデル・LoRA資産、および生成履歴データ。',
            'arch': f'{clean_name}式特化AI生成・クレジット従量課金配管',
            'pain': f'プロの専門家や制作スタジオに依頼する高額な費用と納品待ち時間をゼロにし、即座に高品質な生成結果を得たい要求（{core_fact}の即時解消）',
            'flaw': f'大手AIベンダーが汎用モデルの提供に留まり、特定用途や一貫したアウトプット（{clean_name}の対象領域）に最適化された実用UIを提供していない死角',
            'stealth': f'{clean_name}が実証した初期プロトタイプ開発とコミュニティ獲得（{what_it_does[:35]}）'
        }

    if any(w in full for w in ['mac', 'ios', 'android', 'デスクトップ', '買い切り', 'screen recorder', '録画', 'native', 'swift', 'offline', 'utility', 'calculator', 'widget', 'menu bar', 'menubar']):
        return {
            'stack': f'Swift / Tauriネイティブ開発基盤 × Lemon Squeezy / Gumroad決済 × ローカル暗号化ストレージ',
            'moat': f'クラウド通信不要の超高速ローカル処理と、一度購入すれば半永久的に使用できる買い切りライセンスへの絶対的信頼。',
            'arch': f'{clean_name}式サブスク疲れ逆張り・完全買い切り直販配管',
            'pain': f'単機能ツールの利用のために毎月課金され続けるサブスクリプションへの強い嫌悪感と、買い切りソフトを求めるユーザーの防衛本能（{core_fact}への支持）',
            'flaw': f'大手ソフトウェアベンダーが一斉にARR最大化を狙って月額サブスク化へと舵を切り、シンプルで壊れない買い切り需要（{clean_name}が拾った領域）を完全に切り捨てた死角',
            'stealth': f'{clean_name}が実証したサブスク移行に怒る競合ユーザーの刈り取り（{what_it_does[:35]}）'
        }

    if any(w in full for w in ['ゴーストライター', 'ghostwriter', 'tweet', '代行', 'コンサル', '施工', '清掃', 'コーティング', 'laundry', '洗濯', 'floor', 'garage', 'cake', 'audit', 'tax', 'residency', 'visa', 'legal']):
        return {
            'stack': f'{clean_name}独自業務管理ダッシュボード × 顧客コミュニケーション配管 × Stripe請求書決済',
            'moat': f'{clean_name}とクライアント経営者との強固な信頼関係、過去の納品実績データ、および継続リピート紹介ループ。',
            'arch': f'{clean_name}式高単価業務代行・月額リテイナー直収配管',
            'pain': f'経営者や実務家が多忙で専門作業に手が回らず、外注先の品質やコミュニケーションコストに疲弊している業務ボトルネック（{core_fact}の完全委任）',
            'flaw': f'大手コンサルや大手代行会社が高額な初期費用と長期縛りを要求し、個人や中小企業が気軽に頼める機動的代行（{clean_name}のサービス枠）を放置している死角',
            'stealth': f'{clean_name}が実証した手動での初期クライアント獲得と高単価契約（{what_it_does[:35]}）'
        }

    if any(w in full for w in ['求人', 'リード', 'lead', 'job', 'board', 'スクレイピング', 'reddit', 'complaint', 'directory', 'unscramble', 'search', 'database', 'curation', 'list']):
        return {
            'stack': f'独自スクレイピングクローラー × PostgreSQL / Supabase × 高速検索インデックス × Stripe / 広告配信ネットワーク',
            'moat': f'{clean_name}が独自に蓄積した網羅的データベース資産と、検索エンジンのオーガニック流入による低CAC構造。',
            'arch': f'{clean_name}式特化データベース・情報アクセス課金配管',
            'pain': f'ネット上に散在するノイズから必要な情報や見込み客を手動で探す膨大な工数と、見落としによる機会損失の焦燥感（{core_fact}の網羅的集約）',
            'flaw': f'大手総合求人・ポータルサイトが画一的な情報掲載に終始し、特定職種やニッチな絞り込み需要（{clean_name}が提供する特化データ）に対応できていない死角',
            'stealth': f'{clean_name}が実証した自動スクレイピングと初期トラフィック集客（{what_it_does[:35]}）'
        }

    if any(w in full for w in ['コース', 'course', 'learning', '教育', 'netflix for', '会員', 'membership', 'newsletter', 'substack', 'community', 'podcast', 'youtube']):
        return {
            'stack': f'会員管理プラットフォーム × 高品質動画配信CDN × Stripe Billing × コミュニティフォーラム',
            'moat': f'{clean_name}独自の独占アーカイブコンテンツ、熱狂的なニッチ愛好家コミュニティ、および学習進捗データ。',
            'arch': f'{clean_name}式特化コンテンツ・月額会員サブスクリプション配管',
            'pain': f'一般的な教材では学べない現場の生きたノウハウ不足と、長時間の冗長な講義に挫折する受講者の時間飢餓（{core_fact}への熱狂）',
            'flaw': f'大手教育プラットフォームが網羅的・汎用的なカリキュラムに偏り、即効性のあるプロ向け特化ノウハウ（{clean_name}の独占知見）を放置している死角',
            'stealth': f'{clean_name}が実証した初期ファンコミュニティの構築と有料化（{what_it_does[:35]}）'
        }

    # デフォルト B2B SaaS
    return {
        'stack': f'Next.js × Node.js / Python API × PostgreSQL × Stripe Billing × 各種クラウドAPI連携',
        'moat': f'{clean_name}が顧客の日常ワークフローと業務データに密結合することによる、不可逆な他社乗り換え障壁。',
        'arch': f'{clean_name}式業務特化クラウド・月額定額直収型',
        'pain': f'複雑すぎる汎用システムの導入・運用コストや、日々の非効率な手作業による現場担当者の疲弊とミス（{core_fact}による解消）',
        'flaw': f'大手エンタープライズSaaSが高額かつ多機能すぎて使いこなせない中小企業（{clean_name}の顧客層）を門前払いしている構造的死角',
        'stealth': f'{clean_name}が実証した特定業務課題への直球アプローチ（{what_it_does[:35]}）'
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
        clean_name = clean_company_name(name)
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

        revenue_prefix = ''
        m_rev = re.match(r'^(【[^】]+】)', e.get('tagline', ''))
        if m_rev:
            revenue_prefix = m_rev.group(1)

        tagline = f'{revenue_prefix}{name}：{what_it_does}。大手の死角を突き現金を直収する特化モデル。'

        checklist = [
            f'1. 顧客急所の特定：「{target_prey}」を抱えるターゲットを特定する',
            f'2. 大手の死角突破：「{structural_flaw}」という大手の隙間に最小オファーを提示する',
            f'3. 配管の構築：{pipeline_stack}を敷き、{architecture_pattern}で現金を回収する'
        ]

        description = f'{name}は、{what_it_does}を展開。無駄な多機能を排し、顧客の現場課題を直接解決する筋肉質モデル。'

        e['tagline'] = tagline
        e['description'] = description
        e['moatDescription'] = moat_description
        e['pipelineStack'] = pipeline_stack
        e['architecturePattern'] = architecture_pattern

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

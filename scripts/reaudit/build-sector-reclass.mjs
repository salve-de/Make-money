/**
 * 業種(sector)の作り直し: 出典つきの本文と SEC の SIC コードだけから分類し、data/reaudit/sector-reclass.json を作る。
 * entities-index.json は読むだけ。根拠が無い・はっきり当たらないものは UNKNOWN（sectorBasis なし＝ファイルに載せない）。
 *
 * 使い方: node scripts/reaudit/build-sector-reclass.mjs [--stats]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const idx = JSON.parse(readFileSync(resolve(ROOT, 'data/entities-index.json'), 'utf8'));

const U = (v) => v == null || v === '' || v === '未確認';

// ---- SIC 対応表（範囲で当てる。決まらない番号は本文へ回す） ----
const SIC_EXACT = {
  7370: 'NICHE_SAAS', 7371: 'NICHE_SAAS', 7372: 'NICHE_SAAS', 7373: 'NICHE_SAAS', 7374: 'NICHE_SAAS',
  7310: 'CONTENT_MEDIA', 7812: 'CONTENT_MEDIA', 7822: 'CONTENT_MEDIA', 7841: 'CONTENT_MEDIA',
  2711: 'CONTENT_MEDIA', 2721: 'CONTENT_MEDIA', 2731: 'CONTENT_MEDIA', 4832: 'CONTENT_MEDIA', 4841: 'CONTENT_MEDIA',
  6512: 'PHYSICAL_ASSET', 6513: 'PHYSICAL_ASSET', 6798: 'PHYSICAL_ASSET', 6531: 'PHYSICAL_ASSET',
  5812: 'LOCAL_SERVICES', 7011: 'LOCAL_SERVICES', 7200: 'LOCAL_SERVICES', 8000: 'LOCAL_SERVICES', 8200: 'LOCAL_SERVICES',
  6199: 'FINTECH_INFRA', 6141: 'FINTECH_INFRA', 6153: 'FINTECH_INFRA', 6199: 'FINTECH_INFRA', 6211: 'FINTECH_INFRA',
};
function sicSector(code) {
  const c = Number(code);
  if (!Number.isFinite(c)) return null;
  if (SIC_EXACT[c]) return SIC_EXACT[c];
  if (c >= 2000 && c <= 3999) return 'MONOPOLY_MFG'; // 製造業
  if (c >= 5000 && c <= 5999) return 'PHYSICAL_ASSET'; // 卸売・小売（在庫を持つ物販）
  if (c >= 6000 && c <= 6099) return 'FINTECH_INFRA';
  if (c >= 6100 && c <= 6299) return 'FINTECH_INFRA';
  return null; // 4700 旅行, 7340, 7380, 7389 などは SIC だけでは決まらない
}

// ---- 本文の規則。重み: 事業の形(3〜4) > 手段(1〜2) ----
// [sector, regex, weight, needsNoSoftwareForm]
// 「〜向け」の顧客側の語（例: ネットショップ向け、保険代理店向け）は先に取り除く。
// ソフトウェアの形（ツール・アプリ・API 等）が説明にあるときは、物販・地域・製造の語は採らない(strong 以外)。
const SW_FORM = /SaaS|API|ツール|アプリ|ソフトウェア|ソフト(?!ドリンク)|プラグイン|拡張機能|ダッシュボード|管理システム|スイート|ジェネレーター|プラットフォーム|マーケットプレイス|ウェブサービス|Webサービス|Webアプリ|サイト|ボット|SDK|クラウド|基盤|オープンソース|ライブラリ|計算(?:機|サイト)|エディタ/i;
const RULES = [
  ['FINTECH_INFRA', /決済(?:サービス|基盤|処理|代行|API|プロバイダ|事業)|送金(?:サービス|アプリ)?|銀行口座|ネオバンク|融資|貸付|暗号資産(?:の)?(?:取引|交換)|取引ボット|DeFi|ステーブルコイン|カード発行|与信|後払い|BNPL|保険金|保険会社|証券会社|ブロックチェーン基盤|payment processor|fintech/, 3, false],
  ['FINTECH_INFRA', /暗号資産|仮想通貨|スワップ|ウォレット|トークンの(?:作成|発行)/, 1, false],
  ['AI_AUTOMATION', /(?<![A-Za-z])AI(?![a-z])|AIエージェント|生成AI|LLM|機械学習|ChatGPT|GPT|Claude|自動化|文字起こし|画像生成|音声合成|チャットボット|プロンプト/, 3, false],
  ['MONOPOLY_MFG', /(?:を|の)(?:開発・)?製造|製造(?:・|し|する|業|メーカー)|工場|半導体|検査装置|製造装置|ハードウェア|ゲーム機|花札|生産ライン|金型/, 3, true],
  ['PHYSICAL_ASSET', /不動産(?:の)?(?:賃貸|売買|所有|投資で)|賃貸物件|民泊|土地を|中古車|転売|せどり|仕入れて|物販事業|通販|小売(?:企業|業|チェーン)|衣料品チェーン|倉庫を|コンテナ|自動販売機|コインランドリー|Amazon FBA|ドロップシッピング|ヨット|ATMを/, 3, true],
  ['LOCAL_SERVICES', /店舗を(?:運営|展開)|飲食店|レストラン|カフェ|美容室|サロン|整体|クリニック|歯科|清掃(?:業|サービス|会社)|ハウスクリーニング|配管工事|工務店|リフォーム|屋根工事|教室を|学習塾|葬儀|引越|草刈|造園|洗車|フィットネスジム|保育|介護|出張(?:サービス|で)|修理(?:を|業)|工事|施工|地域密着|フランチャイズ|ホテル|旅館|ブリトー/, 3, true],
  ['PHYSICAL_ASSET', /手作り|工房|受注生産|名入れ|枕を売る|アパレル|ジュエリー|サプリメント|Tシャツ|プリントオンデマンド|1商品EC|レプリカ|ハンドセット|電話を販売|プラスチック袋|物品|生鮮|レモネード/, 3, true],
  ['LOCAL_SERVICES', /蒸気洗浄|窓拭き|ピクニック|ファーマーズマーケット|ケータリング|フォトブース|ボクシングジム|ミニバス|大型バスを手配|出向いて|イベントを実施|カウンセリング|ヨガ|レンタル事業/, 3, true],
  ['CONTENT_MEDIA', /チャンネル|ニュースレター|ブログ(?:を|で|の運営)|メディア|出版|電子書籍|ポッドキャスト|番組|マガジン|情報サイト|解説(?:記事|サイト|ページ)|早見表|アフィリエイト|広告収入|広告で稼|AdSense|表示広告|オンラインコース|講座|YouTube|動画配信|音楽配信|映画(?:配信|の制作)|求人(?:サイト|ボード)|辞書|ジン(?:を|The)|ショッピングサイト|ゲームの(?:開発|配信)|比較サイト/i, 4, false],
  ['NICHE_SAAS', /SaaS|API(?!キー)|ツール|アプリ|ソフトウェア|ソフト(?!ドリンク)|プラグイン|拡張機能|ダッシュボード|管理システム|スイート|ジェネレーター|マーケットプレイス|クラウド|SDK|ウェブサービス|Webサービス|Webアプリ|計算(?:機|サイト)|プラットフォーム|オープンソース|予約|顧客管理|CRM|ファイル共有|素材(?:の)?ライブラリ|ライブラリ|ホスティング|アップロード|ダウンロード|iOS|Android|ブラウザ|アカウント|メールを送|QRコード|フィッシング|検出|プロキシ|ドメイン|Chrome|GitHub|Laravel|フレームワーク|UI部品|デザインシステム|稼働監視|監視サービス|解析サービス|DNS|VPN|クライアント|WordPress用テーマ|WordPressのテーマ|スターター|SEO・UX|Web解析|フォームの送信/i, 2, false],
  ['CONTENT_MEDIA', /ゲームサイト|パズルゲーム|遊べる|会員制コミュニティ|ライブ配信|動画の切り抜き/, 4, false],
];

// 本文に入れない文: 記事タイトルの告知・収益/金額の文・調査限界・リンク候補・更新日
const SKIP_SENT = /を公開している|記事更新日|外部リンク候補|公式ドメイン|転送される|独立確認なし|確認されていない|第三者の確認|未確認|取得できなかった|確認できず|記載なし|数値の記載はない|\$\d|売上は|営業利益|粗利/;

function corpus(x) {
  const m = x.reaudit?.method ?? '';
  const scripted = m === 'SCRIPTED_HONEST_REBUILD_V1';
  const e = x.essence ?? {};
  const primary = [];
  if (!scripted) {
    if (!U(e.whatItDoes)) primary.push(e.whatItDoes);
    if (!U(x.tagline)) primary.push(x.tagline);
    if (!U(x.description)) primary.push(x.description);
  }
  const second = [];
  for (const o of x.observations ?? []) if (typeof o === 'string') second.push(o);
  for (const o of x.observationsStream ?? []) {
    if (!o || typeof o.text !== 'string') continue;
    if (o.category === 'RESEARCH_LIMIT') continue;
    if (!o.sourceUrl) continue;
    second.push(o.text);
  }
  for (const c of x.evidenceCards ?? []) {
    if (c && c.type !== 'UNKNOWN_AUDIT' && typeof c.punchline === 'string' && c.punchline && c.sourceNote) second.push(c.punchline);
  }
  const clean = (arr) => arr.map((t) => t.replace(/\[出典[^\]]*\]/g, '').replace(/https?:\/\/\S+/g, '')).flatMap((t) => t.split(/[。\n]/)).map((s) => s.trim()).filter((s) => s && !SKIP_SENT.test(s));
  return { primary: clean(primary), second: clean(second) };
}

function score(sentences) {
  const s = {};
  const words = {};
  for (const raw of sentences) {
    const sent = raw.replace(/[^、。（）「」]{0,24}?向け(?:の|に|、|には)?/g, '');
    const sw = SW_FORM.test(sent);
    for (const [sec, re, w, gated] of RULES) {
      if (gated && sw) continue;
      const mm = sent.match(re);
      if (mm) {
        s[sec] = (s[sec] ?? 0) + w;
        (words[sec] ??= new Set()).add(mm[0]);
      }
    }
  }
  return { s, words };
}

const AGENCY = /受託|請け負|代行|コンサルティング|制作会社|代理店|コーチング|フリーランス|外注|制作スタジオ/;
function pick({ s, words }, agencyText = '') {
  const ent = Object.entries(s).sort((a, b) => b[1] - a[1]);
  if (!ent.length) return null;
  const [top, second] = ent;
  // 手段（ソフトウェア）だけでなく事業の形が別にあれば、形を優先する: SaaS 手がかりは他分野と並んだら負け
  let best = top;
  if (second && top[1] === second[1]) {
    if (top[0] === 'NICHE_SAAS') best = second;
    else if (second[0] === 'NICHE_SAAS') best = top;
    else return null;
  }
  // AI は「手段」にもなる。物販・メディア・金融など事業の形があるときは形を優先する
  if (best[0] === 'AI_AUTOMATION') {
    const other = ent.find(([k]) => k !== 'AI_AUTOMATION' && k !== 'NICHE_SAAS');
    if (other && other[1] >= best[1]) best = other;
  }
  const sec = best[0];
  if (sec === 'NICHE_SAAS' && agencyText && AGENCY.test(agencyText)) return null;
  return { sector: sec, hits: [...(words[sec] ?? [])].slice(0, 4) };
}

// ---- 規則で決まらない大手を、出典つき観察の語を読んで決めたもの（note に根拠の語）。UNKNOWN は観察に事業の中身が無い、または8分類に当たらない ----
const MANUAL = {
  ent_apple_Q6M2R8TZ: ['MONOPOLY_MFG', 'SOURCED_DESCRIPTION', '観察: 製造はアジアの外部委託先と供給網に依存、売上のうち Services は109,158百万ドル(残りは製品)'],
  ent_nintendo_J5R8M2QX: ['MONOPOLY_MFG', 'SOURCED_DESCRIPTION', '観察: 花札製造が起源、Switchプラットフォーム売上が1,050,296百万円(売上の大半)'],
  ent_tsmc_J6V2C8QK: ['MONOPOLY_MFG', 'SOURCED_DESCRIPTION', '観察: ウェハ売上・年間生産能力(12インチ換算)'],
  ent_visa_H3M8T1QZ: ['FINTECH_INFRA', 'SOURCED_DESCRIPTION', '観察: 発行処理・コアバンキングへ拡張(Pismo買収)。顧客インセンティブ控除の決済網'],
  ent_paypal_H3K7M2QX: ['FINTECH_INFRA', 'SOURCED_DESCRIPTION', '観察: transaction revenues・TPV(決済総額)・加盟店アカウント'],
  ent_block_J8P4V6RN: ['FINTECH_INFRA', 'SOURCED_DESCRIPTION', '観察: Bitcoin ecosystem 売上を含む決済・金融の事業構成'],
  ent_plaid_K5R9T3LM: ['FINTECH_INFRA', 'SOURCED_DESCRIPTION', '観察: 9,000超のフィンテックと12,000超の金融機関を接続'],
  ent_coinbase_M7Q2W8HF: ['FINTECH_INFRA', 'SOURCED_DESCRIPTION', '観察: transaction revenue が純収益の約59%、機関投資家向けデリバティブ'],
  ent_adyen_B2Q8N5LV: ['FINTECH_INFRA', 'SOURCED_DESCRIPTION', '観察: 処理量1,394.3十億EUR、一つの決済プラットフォーム'],
  ent_svb_Z5M8Q2RL: ['FINTECH_INFRA', 'SOURCED_DESCRIPTION', '観察: 預金173.1十億USD、FDICのレシーバー(銀行)'],
  ent_salesforce_L4N8Q2VM: ['NICHE_SAAS', 'SOURCED_DESCRIPTION', '観察: Subscription and support 売上が請求の90%超、年間前払い'],
  ent_hubspot_P7K3M9QW: ['NICHE_SAAS', 'SOURCED_DESCRIPTION', '観察: subscription revenue が売上の約98%、顧客288,706社'],
  ent_atlassian_C7L2W9HM: ['NICHE_SAAS', 'SOURCED_DESCRIPTION', '観察: Cloud・Data Center・Marketplace 売上、Server売上ゼロ'],
  ent_servicenow_R8K4P1VX: ['NICHE_SAAS', 'SOURCED_DESCRIPTION', '観察: subscription 売上が全売上の97%'],
  ent_okta_R6M2V8QK: ['NICHE_SAAS', 'SOURCED_DESCRIPTION', '観察: Subscription 売上が全体の98%、ACV顧客'],
  ent_crowdstrike_P9L4W2SN: ['NICHE_SAAS', 'SOURCED_DESCRIPTION', '観察: Subscription 売上が全体の95%'],
  ent_paloalto_T5N8C3QW: ['NICHE_SAAS', 'SOURCED_DESCRIPTION', '観察: Subscription and support 売上、ARR'],
  ent_mongodb_J7R2K9VX: ['NICHE_SAAS', 'SOURCED_DESCRIPTION', '観察: Subscription 売上が約96.8%、RPO'],
  ent_datadog_X8L2P6QK: ['NICHE_SAAS', 'SOURCED_DESCRIPTION', '観察: ARR10万ドル以上の顧客がARRの90%、残存履行義務'],
  ent_twilio_H3K8P1RM: ['NICHE_SAAS', 'SOURCED_DESCRIPTION', '観察: 開発者向け通信API、Messaging・Voice の使用量連動収益'],
  ent_pepsico_K3V7N1QM: ['MONOPOLY_MFG', 'SOURCED_DESCRIPTION', '観察: 売上構成は飲料42%・便利食品58%、原材料高で利益圧迫'],
  ent_honeywell_Y7Q3M9LK: ['MONOPOLY_MFG', 'SOURCED_DESCRIPTION', '観察: Aerospace Technologies・Industrial Automation・Building Automation の売上構成'],
  ent_caterpillar_N4V8P2QS: ['MONOPOLY_MFG', 'SOURCED_DESCRIPTION', '観察: Machinery, Power & Energy 売上、製造コスト・関税の影響'],
  ent_lockheed_S8K4R1VP: ['MONOPOLY_MFG', 'SOURCED_DESCRIPTION', '観察: Aeronautics・Missiles and Fire Control・Space 等の売上、契約バックログ'],
  ent_toyota_W4K8M2QN: ['MONOPOLY_MFG', 'SOURCED_DESCRIPTION', '観察: 車両販売台数約959.5万台'],
  ent_ferrari_F8N2L6KM: ['MONOPOLY_MFG', 'SOURCED_DESCRIPTION', '観察: 車両とレースを扱うブランド、EBITマージン約29.5%'],
  ent_samsung_X2M7Q4LP: ['MONOPOLY_MFG', 'SOURCED_DESCRIPTION', '観察: 白黒テレビの量産から拡大、DRAMシェア34.0%'],
  ent_amd_F8Q3L6TK: ['MONOPOLY_MFG', 'SOURCED_DESCRIPTION', '観察: 半導体(Data Center・Client)、全ウェハーを第三者ファウンドリに依存'],
  ent_nike_C8V1M6QS: ['MONOPOLY_MFG', 'SOURCED_DESCRIPTION', '観察: Footwear66%・Apparel29%、製造は独立契約メーカーのフットウェア97工場'],
  ent_asml_Q7N3K9VW: ['MONOPOLY_MFG', 'SOURCED_DESCRIPTION', '観察: EUV出荷・売上認識48台、光学カラムの供給者への持分・融資'],
  ent_homedepot_M4R7C2VW: ['PHYSICAL_ASSET', 'SOURCED_DESCRIPTION', '観察: 店舗数2,359とSRSの専門流通拠点1,250超'],
  ent_monotaro_V2K7N4RS: ['PHYSICAL_ASSET', 'SOURCED_DESCRIPTION', '観察: 間接資材サイト、粗利99,636百万円(物販)'],
  ent_expedia_F2V8Q6KM: ['UNKNOWN', null, ''],
  ent_baidu_W3R9Q5LN: ['UNKNOWN', null, ''],
  ent_microsoft_V9P3L7KD: ['UNKNOWN', null, ''],
  ent_zume_E6Q1W7RP: ['UNKNOWN', null, ''],
  ent_walmart_F5N8Q2LK: ['PHYSICAL_ASSET', 'SOURCED_DESCRIPTION', '観察: 10,771 retail units と379 distribution facilities を保有'],
  ent_jdcom_N7L4P1RX: ['PHYSICAL_ASSET', 'SOURCED_DESCRIPTION', '観察: JD Retail の営業利益、フルフィルメント費用88.2十億元'],
  ent_zozo_H9Q3M5LK: ['PHYSICAL_ASSET', 'SOURCED_DESCRIPTION', '観察: ファッションEC と ZOZOBASE 物流センター(公式沿革)'],
  ent_evergrande_C5M9R2QK: ['PHYSICAL_ASSET', 'SOURCED_DESCRIPTION', '観察: 1997年に最初の住宅プロジェクト、契約負債RMB721bn(不動産開発)'],
  ent_starbucks_L2Q9W4RM: ['LOCAL_SERVICES', 'SOURCED_DESCRIPTION', '観察: Company-operated stores 売上と店舗数40,990(直営21,514・ライセンス19,476)'],
  ent_uber_T4M8Q2LK: ['LOCAL_SERVICES', 'SOURCED_DESCRIPTION', '観察: 配車・Eats・貨物、都市ごとの許認可とドライバー報酬'],
  ent_doordash_N7Q3L8VM: ['LOCAL_SERVICES', 'SOURCED_DESCRIPTION', '観察: 加盟店・消費者・配達員を接続、配達員報酬'],
  ent_capcom_H2N6R8QW: ['CONTENT_MEDIA', 'SOURCED_DESCRIPTION', '観察: ゲーム事業、家庭用ゲーム販売本数51.87百万本'],
  ent_spotify_P9V4L6KD: ['CONTENT_MEDIA', 'SOURCED_DESCRIPTION', '観察: Premium加入者290百万人・MAU751百万人(購読型配信)'],
  ent_roblox_K8Q2M5VN: ['CONTENT_MEDIA', 'SOURCED_DESCRIPTION', '観察: developer exchange fees(開発者向け還元)を含むユーザー生成型の体験配信'],
  ent_quibi_B4M8R2TZ: ['CONTENT_MEDIA', 'SOURCED_DESCRIPTION', '観察: コンテンツ配信権をRokuが取得、加入者向けにQuibiを提供'],
  ent_ryanair_F1L7C3QW: ['UNKNOWN', null, ''],
  ent_booking_S2H7M5QK: ['UNKNOWN', null, ''],
  ent_airbnb_C7N2V5RX: ['UNKNOWN', null, ''],
  ent_moviepass_C9L5N1VK: ['UNKNOWN', null, ''],
  ent_mailchimp_B8Q3L6VZ: ['UNKNOWN', null, ''],
  ent_juicero_D2H6S8WM: ['UNKNOWN', null, ''],
  ent_intuit_B4X8N1QP: ['UNKNOWN', null, ''],
  ent_sonygroup_V7K3P9LM: ['UNKNOWN', null, ''],
  ent_theranos_H3L7Q2XM: ['UNKNOWN', null, ''],
  ent_ftxtrading_J8N4V6PK: ['UNKNOWN', null, ''],
  ent_celsius_V8Q4L1MN: ['UNKNOWN', null, ''],
  ent_zoom_R2V6K8MN: ['UNKNOWN', null, ''],
  ent_cloudflare_M5Q9T1RK: ['UNKNOWN', null, ''],
  ent_nvidia_Z6Q2M8RK: ['UNKNOWN', null, ''],
  ent_mercadolibre_N4D6S1YK: ['UNKNOWN', null, ''],
  ent_etsy_H6M2Q9RK: ['UNKNOWN', null, ''],
  ent_ebay_C8Q4M1VN: ['UNKNOWN', null, ''],
  ent_unionpacific_K6M1R8TW: ['UNKNOWN', null, ''],
  ent_fedex_Q2L7V5MN: ['UNKNOWN', null, ''],
  ent_loreal_C4V7P1QS: ['UNKNOWN', null, ''],
  ent_recruit_C6L1P8QZ: ['UNKNOWN', null, ''],
  ent_tencent_J8R2V6QN: ['UNKNOWN', null, ''],
  ent_sea_T6K2M8QV: ['UNKNOWN', null, ''],
  ent_petscom_W3R7M1QK: ['UNKNOWN', null, ''],
  ent_webvan_N8Q4L2RM: ['UNKNOWN', null, ''],
  ent_betterplace_R5C2M8QW: ['UNKNOWN', null, ''],
  ent_lordstownmotors_P7K3D9ZS: ['UNKNOWN', null, ''],
  ent_birdglobal_V4M8T2QY: ['UNKNOWN', null, ''],
  ent_convoy_P9L4W6TC: ['UNKNOWN', null, ''],
  ent_katerra_R2Q8M5VN: ['UNKNOWN', null, ''],
  ent_beepi_C7L1N9WK: ['UNKNOWN', null, ''],
};

const out = {};
const stat = { before: {}, after: {}, unknown: 0, changed: 0 };
const changed = [];
for (const x of idx) {
  stat.before[x.sector] = (stat.before[x.sector] ?? 0) + 1;
  let res = null;
  let manualHit = false;
  const sic = x.reaudit?.secExtraction;
  if (MANUAL[x.id]) {
    const [sector, source, note] = MANUAL[x.id];
    res = sector === 'UNKNOWN' ? null : { sector, basis: { source, note } };
    manualHit = true;
  }
  if (!res && !manualHit && sic?.secSicCode) {
    const sec = sicSector(sic.secSicCode);
    if (sec) res = { sector: sec, basis: { source: 'SEC_SIC', note: `SIC ${sic.secSicCode} ${sic.secSicDescription}` } };
  }
  if (!res && !manualHit) {
    const c = corpus(x);
    let p = pick(score(c.primary), c.primary.join('。'));
    let from = '主要説明文';
    if (!p) {
      const noPrimarySignal = Object.keys(score(c.primary).s).length === 0;
      if (noPrimarySignal) {
        // 観察だけが根拠のとき: 同じ分野の強い語(重み3以上)が、別々の2文以上にあるものだけ採る
        const cnt = {};
        for (const sent of c.second) {
          const one = score([sent]);
          for (const [sec, w] of Object.entries(one.s)) if (w >= 3) cnt[sec] = (cnt[sec] ?? 0) + 1;
        }
        const good = Object.entries(cnt).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]);
        if (good.length && (good.length === 1 || good[0][1] > good[1][1])) {
          const sc = score(c.second);
          p = { sector: good[0][0], hits: [...(sc.words[good[0][0]] ?? [])].slice(0, 4) };
        }
        from = '出典つき観察';
      }
    }
    if (p) res = { sector: p.sector, basis: { source: 'SOURCED_DESCRIPTION', note: `${from}の語: ${p.hits.join('・')}` } };
  }
  const sector = res ? res.sector : 'UNKNOWN';
  stat.after[sector] = (stat.after[sector] ?? 0) + 1;
  if (res) out[x.id] = { sector: res.sector, sectorBasis: res.basis };
  else out[x.id] = { sector: 'UNKNOWN' };
  if (sector !== x.sector) changed.push([x.id, x.name, x.sector, sector, res?.basis.note ?? '']);
}
writeFileSync(resolve(ROOT, 'data/reaudit/sector-reclass.json'), JSON.stringify(out, null, 1) + '\n');
if (process.argv.includes('--stats')) {
  console.log('before', stat.before);
  console.log('after', stat.after);
  console.log('changed', changed.length);
  writeFileSync('/tmp/x/changed.json', JSON.stringify(changed));
}

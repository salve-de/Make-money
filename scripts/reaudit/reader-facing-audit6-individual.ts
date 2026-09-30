/**
 * audit6 の個別修正。出典は各レコードの observations に記録済みの Indie Hackers 掲載説明文、
 * および 2026-09-30 に WebFetch で確認した公式ページ（下記コメント）。
 * 何度実行しても同じ結果になるよう、値を代入するだけで足し算をしない。
 */
type AnyRecord = Record<string, unknown>;
export interface Helpers {
  stash: (e: AnyRecord, path: string, before: unknown) => void;
  bump: (k: string, n?: number) => void;
  canon: (v: unknown) => string;
  rec: (v: unknown) => AnyRecord;
}

function getAt(e: AnyRecord, path: string): unknown {
  return path.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as AnyRecord)[k] : undefined), e);
}
function setAt(e: AnyRecord, path: string, val: unknown, h: Helpers, tag: string): void {
  const keys = path.split('.');
  let o: AnyRecord = e;
  for (const k of keys.slice(0, -1)) {
    if (!o[k] || typeof o[k] !== 'object') return;
    o = o[k] as AnyRecord;
  }
  const last = keys[keys.length - 1];
  if (!(last in o)) return;
  if (h.canon(o[last]) === h.canon(val)) return;
  h.stash(e, path, o[last]);
  o[last] = val;
  h.bump(tag);
}
/** 配列の要素を「含む文字列」で探して置換（無ければ何もしない）。 */
function replaceInStrings(v: unknown, from: string | RegExp, to: string): unknown {
  if (typeof v === 'string') return v.replace(from, to);
  if (Array.isArray(v)) return v.map((x) => replaceInStrings(x, from, to));
  if (v && typeof v === 'object') {
    const o: AnyRecord = {};
    for (const [k, x] of Object.entries(v as AnyRecord)) o[k] = replaceInStrings(x, from, to);
    return o;
  }
  return v;
}
function rewrite(e: AnyRecord, path: string, from: string | RegExp, to: string, h: Helpers, tag: string): void {
  const cur = getAt(e, path);
  if (cur === undefined) return;
  const next = replaceInStrings(cur, from, to);
  if (h.canon(cur) !== h.canon(next)) setAt(e, path, next, h, tag);
}
/** evidenceCards / observationsStream / observations / unknownsNotes 全体に文字列置換をかける。 */
function rewriteAll(e: AnyRecord, from: string | RegExp, to: string, h: Helpers, tag: string): void {
  for (const p of ['evidenceCards', 'observationsStream', 'observations', 'unknownsNotes']) rewrite(e, p, from, to, h, tag);
}

/** 助詞始まり・「…するモデル」の翻訳崩れ。tagline は名詞句/文の1文、description は同文＋句点。 */
const COPY: Record<string, string> = {
  ent_crazysnak3360_61b53eb7ed3b: 'Crazy Snak3 360 は、クラシックなスネークを、速くて混沌としたモダンなアーケード体験に作り直すゲーム',
  ent_whoislookupapi_352a26af275a: '構造化されたWHOIS/RDAPとライブDNSのデータを開発者向けAPIで引き、ログイン後のダッシュボードで設定したドメインの変更を監視できる',
  ent_imaginevid_be248fead324: '商品写真、キャンペーンの概要、参考素材を、主要なAIモデルで、有料のソーシャル広告用クリエイティブや商品動画の複数パターンに変える。1つのワークスペースで完結する',
  ent_getsflow_663806467850: 'Getsflow は、会社ごとに業務のやり方が違うのに、多くの企業が画一的で融通の利かないソフトに自社の手順を合わせさせられている状況を変えるために作っている',
  ent_careersuite_bce4819eea63: 'CareerSuite AI は、履歴書の出来が悪いことや古いキャリア支援ツールのせいで、多くの資格ある人が就職の機会を失っていると気づいて作った',
  ent_claimhit_413feded2870: 'ClaimHit は、AIと技術的な証拠を使って、特許から製品までの分析を速める。知財の専門家が、該当しうる製品を見つけ、ライセンス、権利行使、ポートフォリオ向けのクレームチャートを作るのを助ける',
  ent_ziranofinance_2d2ff30e9bbb: 'Zirano Finance は、誰もが大事だと知っているのに、ほとんど誰も楽しんでやらない簿記の雑務があるから作った。創業者に、財務状況をリアルタイムで平易な言葉で示す',
  ent_verbalizedsamplingpromptbook_80faca257232: 'スタンフォードの Verbalized Sampling の研究を30以上の実行できるプロンプトにまとめ、開発者がAIのモード崩壊をすぐ直して本来の創造性を引き出せるようにする',
  ent_gaeilgeoir_907c08fd6754: 'Gaeilgeoir AI は、アイルランド語を話すことを、誰でもいつでもできるようにするために作られた。学習者が間違いを恐れずに実際の会話で自信と流暢さを身につけられる場をめざす',
  ent_quiturl_822151a025af: 'QuitURL は、既存のURL短縮ツールが高すぎる、機能が限られている、プライバシーや柔軟性に欠けると見て取り組んでいる。マーケター、クリエイター、事業者向けに、より賢く手頃な選択肢をめざす',
  ent_muzicgenerator_50ddba3e04ed: 'MuzicGenerator は、音楽づくりをアイデアを入力するのと同じくらい簡単にしたくて作った。AIにより、音楽の素人でも数分でプロっぽい曲が作れるようになったとしている',
  ent_simplyfound_ce5d07a434c7: 'GEO（生成AI向けの可視性）を、すべての人に教え、実現できるようにする',
  ent_nexavoxa_fac08da37251: 'NexaVoxa は、AI音声エージェントで複雑な電話のやり取りを自動化する。顧客サポート、見込み客の育成、予約設定、営業アウトリーチを対象にしている',
  ent_automatenexuscrm_089f3cdfc6fc: 'AI搭載のCRM。事業者とユーザーがデータとプライバシーを完全に管理できるようにしながら、顧客との関係を変えるとしている。オールインワンのCRMと自称',
  ent_bookingpilot_0a25a160777c: '独立系の宿泊・接客業向けに、大企業のような面倒なしで大企業並みの効率を出せる、外せない標準の技術基盤になることをめざす',
  ent_replymer_e81030318dd0: 'Replymer は、ほとんどの優れた製品は誰の目にも触れないままだと考えて作った。実際の会話の中での人間が書く返信で、製品が見つかるようにする',
  ent_hullomatchmaking_1f0f14df8b1e: 'Hullo は、今どきの出会い系アプリが相性ではなく利用の継続を最適化していると見て、AIならコンテンツの推薦以上のことができると考えて作っている',
  ent_predimail_33f2ec8d19da: 'PREDIMAIL は、多くのAIメールツールは書くのを速くするだけで、何を言うべきかは分からせてくれないと考えて作った。過去のやり取りや社内の知識をAIにつなぐ',
  ent_fixmyspeakers_f532e99e5415: 'Apple Watch の水抜き機能と同じ考え方で、特定の音を出し、その音波でスマホのスピーカーに入った水を押し出す',
  ent_urbansecretsfacemasks_0bf3db5d0350: 'Urban Secrets は、体と心に栄養を与える製品で、自然の美しさと力を届ける。製品は100%ビーガン、動物実験なし、環境に持続可能とうたう',
  ent_safarigrowth_dd53c53abcc8: 'SafariGrowth は、ミッションを持つ小さな会社の成長を助けるために作られた。消費者の価値観と合わない旧来の大企業に有利な状況を変えたいという',
  ent_thesovereigngrowthengine_7a85e1ae2010: '自動化したロジックで「手作業の罠」を解く。2026年は忙しさそのものが仕組みの失敗だとして、高度な効率を優先し、クリエイターをシステム設計者にすることを掲げる',
  'ent_freelancercommandcenter-fcc_af9782a9bb22': 'FCC は、フリーランスが多すぎるバラバラのツールで仕事を回していると見て、顧客、案件、時間、請求書、書類、フォローアップを1つのシステムで管理できるようにするために作られた',
  ent_webnovelai_d1e8192af49b: 'WebnovelAI.io は、AI搭載の執筆アシスタントとして、長編小説やウェブ小説を書くために設計された創作プラットフォーム',
  ent_hdstudio_50f10c717ae7: 'コーディングも設定も手間もなしに、誰でもWebサイトやアプリを手早く作れるようにする。アイデアから公開までを、困った時に頼れるチームつきで速く進められるとしている',
  ent_sendapi_f25f78db5dbb: 'SendAPI は、WhatsApp、SMS、メールを別々のアカウントで管理する手間を、1つのAPIキー、1つのダッシュボード、3チャネル共通の定額料金でなくすとしている',
  ent_elyfornoville_5d862c8c8903: '本人は、プロジェクトづくりで一定の目標に到達しようとしており、それを公開することで意欲を保つ、と説明している',
  ent_programmaticseoresourcepack_4b7547015894: 'Programmatic SEO Resource Pack は、資金を絞った創業者やマーケターが、SEOに最適化した質の高いページを少ない手間で大量に作り、自然検索の流入を得られるようにするために作っている',
  ent_latexaccessibilitychecker_dc0f1670e226: 'ADA Title II 対応。司法省の2024年規則は、公立大学を含む州・地方政府機関にWCAG 2.1 AAを求める。学位論文、博士論文、機関がホストする学術誌の投稿物、授業資料が対象',
  ent_reviewtycoon_9a4d9c969082: '自社のレビューソフトを15年運用した経験を、SaaSとして世に出す',
  ent_smorescience_a4a015c63fb0: 'STEM分野で活躍する優れた女性たちの物語が、少女たちの読む本や雑誌に載っていない。Smore はその物語を伝え、少女たちがSTEMに残るよう励ますために作られた',
  ent_jobhuntr_10ecc2d891e8: 'ブラウザの自動化で、ネット中の求人に応募していくツール',
};

export const INDIVIDUAL_FIXES: Record<string, (e: AnyRecord, h: Helpers) => void> = {};

for (const [id, text] of Object.entries(COPY)) {
  INDIVIDUAL_FIXES[id] = (e, h) => {
    setAt(e, 'tagline', text, h, 'B15 tagline');
    setAt(e, 'description', `${text}。`, h, 'B15 description');
  };
}
const prev = (id: string, f: (e: AnyRecord, h: Helpers) => void) => {
  const base = INDIVIDUAL_FIXES[id];
  INDIVIDUAL_FIXES[id] = (e, h) => { if (base) base(e, h); f(e, h); };
};
const UNK = '未確認';

// B-13 個別: 掲載日・発言日が分かるものは年に直し、分からないものは補足を付ける。
prev('ent_freelancegps_55b0b9333a63', (e, h) => rewriteAll(e, '「今年指導した人たちの売上', '「2022年に指導した人たちの売上', h, 'B13 freelancegps'));
prev('ent_socialplanner_7c1b32009bfb', (e, h) => rewriteAll(e, '「今年7,000超の顧客が乗り換えた」', '「今年（記事掲載時点）7,000超の顧客が乗り換えた」', h, 'B13 socialplanner'));
prev('ent_wynter_562c3567', (e, h) => rewriteAll(e, '今年は240万ドルの見込み', '2023年は240万ドルの見込み', h, 'B13 wynter'));

// D: Circle。https://circle.so/pricing（2026-09-30 WebFetch）: Circle Plus はカスタム料金、月$99・最初の30日無料は Email Hub。
prev('ent_circl_b9', (e, h) => {
  rewriteAll(e, 'Circle Plusは月99ドルの追加(最初の30日は無料)と記載', 'Email Hubは月99ドルの追加(最初の30日は無料)、Circle Plusはカスタム料金と記載', h, 'D circle plus');
  rewriteAll(e, '2年間に300万ドル超を稼いだ', '2年間に300万ドルを稼いだ', h, 'D circle 300万');
  rewriteAll(e, '2020年初めに', '2020年に', h, 'D circle 2020');
  setAt(e, 'tagline', 'コミュニティ、講座、イベントを自社ブランドでまとめて運営できるプラットフォーム。2020年創業で、公式は160人超の完全リモートの会社と表示している', h, 'D circle tagline');
  setAt(e, 'essence.painRelief', UNK, h, 'D painRelief');
});
// D: Lasertec。https://www.lasertec.co.jp/company/profile/（WebFetch）: 「昭和35年7月」設立、従業員数・上場市場の記載なし。
prev('ent_corp64_8d1e2f', (e, h) => {
  rewriteAll(e, '創業を1960年7月、本社を横浜（神奈川県）、資本金9.31億円と記載している', '設立を昭和35年（1960年）7月、本社を横浜市港北区新横浜、資本金を9億3,100万円と記載している', h, 'D lasertec founded');
  rewriteAll(e, /日本語版Wikipediaは、設立を1962年8月13日、/g, '日本語版Wikipediaは、', h, 'D lasertec wiki date');
  setAt(e, 'targetPainWallet', UNK, h, 'D targetPainWallet');
  setAt(e, 'essence.targetCustomer', UNK, h, 'D targetCustomer');
  setAt(e, 'essence.painRelief', UNK, h, 'D painRelief');
});
prev('ent_jobhuntr_10ecc2d891e8', (e, h) => {
  setAt(e, 'screening.initialTeamPass', null, h, 'D initialTeamPass');
});
// getsflow / urbansecrets は COPY で処理。
// skya。https://skya.one/（WebFetch）: 「From $59/mo・agencies from $239/mo」。運営会社名 Pvt. Ltd. は確認できず。
prev('ent_skya_3934f91eab56', (e, h) => {
  rewriteAll(e, /Skyram Technologies Pvt\. Ltd\.の運営表示。?/g, '', h, 'D skya company');
  rewriteAll(e, /Skyram Technologies Pvt\. Ltd\.と記載する。?/g, '', h, 'D skya company');
  rewriteAll(e, /Skyram Technologies Pvt\. Ltd\.の運営/g, '運営', h, 'D skya company');
  rewriteAll(e, /、?生成AI回答の追跡や改善案を案内するが売上実額はない/g, '、生成AI回答の追跡や改善案を案内する。IH収益欄は月$1MMと表示（本人入力・未検証）', h, 'D skya IH');
  rewriteAll(e, /売上実額はない/g, 'IH収益欄は月$1MMと表示（本人入力・未検証）', h, 'D skya IH');
  setAt(e, 'description', '公式トップはChatGPT、Gemini、Perplexity、Google AIがブランドについて何を述べるか、競合や改善点を調べると案内。料金は月$59から（代理店は月$239から）、登録不要の無料レポートと7日間の無料試用を掲載。', h, 'D skya description');
});
// 36paths: www.36paths.com は名前解決できない（curl / dig で応答なし、2026-09-30）。
prev('ent_36paths_84aa15ef3672', (e, h) => {
  setAt(e, 'screening.capitalStatus', 'unknown', h, 'D capitalStatus');
  setAt(e, 'temporal.currentViabilityAnalysis', '未確認', h, 'D 36paths viability');
  const un = Array.isArray(e.unknownsNotes) ? (e.unknownsNotes as string[]) : null;
  const note = '公式サイト（www.36paths.com）は2026-09時点で開けない（ドメインの名前解決ができない）';
  if (un && !un.includes(note)) { h.stash(e, 'unknownsNotes', [...un]); un.push(note); h.bump('D 36paths note'); }
});
prev('ent_headscal_70194a0e', (e, h) => {
  setAt(e, 'scale', 'UNKNOWN', h, 'D scale');
  setAt(e, 'country', UNK, h, 'D country');
  setAt(e, 'essence.painRelief', UNK, h, 'D painRelief');
  setAt(e, 'tagline', 'Tailscaleの制御サーバーを自分の環境で動かすための、オープンソースの実装。自己ホスト利用者や愛好家を想定している', h, 'D headscale tagline');
  setAt(e, 'description', 'Tailscaleの通信で要になる制御サーバーを、自分の環境で動かせるようにしたオープンソースの実装。クライアント間のWireGuard公開鍵の交換、IPアドレスの割り当て、利用者ごとの境界の設定、広告された経路の公開などを受け持つ。機能の範囲は狭く、一つのTailscaleネットワークを想定している。ソフトウェアはBSD 3条項ライセンス。', h, 'D headscale description');
});
prev('ent_replicate_047db2', (e, h) => {
  rewrite(e, 'temporal.currentViabilityAnalysis', /、独立企業としての規模は現在と異なる可能性がある/g, '', h, 'D replicate viability');
  setAt(e, 'scale', 'UNKNOWN', h, 'D scale');
});
prev('ent_fluxaimusicvideogenerator_3f17303822ba', (e, h) => {
  rewriteAll(e, '旧名称との運営上の関係・売上は未確認', 'flux-ai.io は flyne.ai へ転送される（2026-09確認）。運営上の関係・売上は未確認', h, 'D flux redirect');
  rewriteAll(e, '旧Flux AI名と転送先Flyne AIの運営主体の関係', 'flux-ai.io と転送先 flyne.ai の運営主体の関係', h, 'D flux redirect');
  setAt(e, 'targetPainWallet', UNK, h, 'D targetPainWallet');
  setAt(e, 'essence.targetCustomer', UNK, h, 'D targetCustomer');
  setAt(e, 'temporal.currentViabilityAnalysis', 'flux-ai.io は 2026-09-29 に flyne.ai の音楽動画ページへ転送され、転送先のページ本文は確認できた。契約・実利用・現在の収益性は検証していない。', h, 'D flux viability');
});
prev('ent_swishmac_3d8b19', (e, h) => {
  setAt(e, 'targetPainWallet', UNK, h, 'D targetPainWallet');
  setAt(e, 'essence.targetCustomer', UNK, h, 'D targetCustomer');
  setAt(e, 'essence.painRelief', UNK, h, 'D painRelief');
  setAt(e, 'country', UNK, h, 'D country');
  setAt(e, 'founder', UNK, h, 'D founder');
  setAt(e, 'temporal.foundedYear', 0, h, 'D foundedYear');
});
prev('ent_energos_96dbbcbf4d10', (e, h) => {
  setAt(e, 'pnl.dataSnapshotPeriod', '未確認（Indie Hackers の収益欄は本人入力・未検証で、売上としては使わない）', h, 'D energos snapshot');
  rewriteAll(e, /この収益欄は裏付けが無いため、売上としては扱っていない。?/g, 'Indie Hackers の収益欄は本人入力・未検証で、売上としては使わない。', h, 'D energos note');
  rewriteAll(e, /収益ページは月\$10,000（2025-04-29最終更新、掲載者の自己申告・独立検証なし）と表示。?/g, 'Indie Hackers の収益欄に月$10,000（2025-04-29最終更新、本人入力・未検証）', h, 'D energos card');
});
prev('ent_scopeleads_e3d6106039d3', (e, h) => {
  rewrite(e, 'description', '営業活動で最も大変だった部分を製品にしたと説明し', '仕事で最も嫌だった部分（見込み客探し）を製品にしたと説明し', h, 'D scopeleads');
});
prev('ent_ebizfacts_adrianeschwagergrowthassistantagency11millio_3cb0911b87ce', (e, h) => {
  rewrite(e, 'pnl.revenueLabel', '（年間売上）', '（ARR・年間経常収益）', h, 'D adrian ARR');
  setAt(e, 'tagline', 'タレントエージェンシーを3年で年$11M（ARR）に育てたと、eBiz Factsの記事が紹介している', h, 'D adrian tagline');
});
prev('ent_insyghtful_e33d2877a526', (e, h) => {
  setAt(e, 'screening.initialTeamPass', null, h, 'D initialTeamPass');
});

for (const [prefix, fn] of [
  ['ent_lemonsqueezy_958b91', (e: AnyRecord, h: Helpers) => rewriteAll(e, 'Stripeが昨年Lemon Squeezyを買収した後', 'Stripeが2024年にLemon Squeezyを買収した後', h, 'B13 lemonsqueezy')],
  ['ent_fillout_addeb7', (e: AnyRecord, h: Helpers) => rewriteAll(e, '『昨年から黒字』', '『昨年（記事掲載時点）から黒字』', h, 'B13 fillout')],
] as Array<[string, (e: AnyRecord, h: Helpers) => void]>) {
  prev(prefix, fn);
}

// B-1 の行削除で IH 掲載説明の引用が消えたレコードは、金額部分を除いた引用を観測に戻す（説明欄の出典）。
const QUOTES: Record<string, string> = {
  'ent_bitcoininvestmentearn3-dailyprofit_5c89b5a3ae05': 'I have personally tested this platform.',
  ent_lumiadhdcompanion_c4b529b54d81: 'Therapy has a 3-6 month waitlist.',
};
for (const [id, q] of Object.entries(QUOTES)) {
  prev(id, (e, h) => {
    const obs = Array.isArray(e.observations) ? (e.observations as string[]) : null;
    const line = `Indie Hackersの掲載説明は「${q}」（金額を含む続きは省略）。`;
    if (obs && !obs.some((o) => typeof o === 'string' && o.startsWith('Indie Hackersの掲載説明は「') && !o.includes('〔金額未確認〕'))) {
      h.stash(e, 'observations', [...obs]); obs.unshift(line); h.bump('B1 quote restored');
    }
  });
}

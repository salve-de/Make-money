import { parseStrategyRequest, parseSynthesizedIdeas } from '@/shared/strategy-schema';
import { NextRequest, NextResponse } from 'next/server';
import { INSTITUTIONAL_ENTITIES, findInstitutionalEntity } from '@/platform/data/mockLedgerData';
import { SynthesizedIdea, StrategyChatMessage } from '@/platform/types/terminal';
import { queryD1, executeD1, batchD1 } from '@/lib/storage/d1';
import { verifyFirebaseIdToken } from '@/lib/firebase/server';
import { readJsonBody, RequestBodyTooLargeError } from '@/lib/api/input';
import { getRuntimeEnvValue } from '@/lib/runtime/cloudflare';

export const dynamic = 'force-dynamic';
const MAX_STRATEGY_REQUEST_BYTES = 1 * 1024 * 1024;
const MAX_GEMINI_RESPONSE_CHARS = 128 * 1024;
const SAFETY_BOUNDARY_NOTICE = '公開事例は事実の記録として扱い、実行案は法令・各サービス規約・相手の同意を前提にします。根拠が不足する数値は未確認のまま検証します。';

// Historical source data can mention abusive or terms-violating growth tactics.
// Those descriptions may remain in the research ledger, but generated advice
// must never turn them into instructions.
const PROHIBITED_GUIDANCE_PATTERNS = [
  /自演|なりすまし|別人を装/iu,
  /dm爆撃|迷惑dm|スパム(?:送信|dm)/iu,
  /不正(?:な)?スクレイピング|無断(?:取得|転載|連絡)/iu,
  /規約(?:の)?(?:隙間|抜け道|回避)|terms?.{0,12}(?:bypass|evasion)/iu,
  /直取引(?:を)?(?:封鎖|妨害|禁止)/iu,
  /sockpuppet|fake\s*account|spam\s*dm|unauthorized\s*scrap/iu,
];

function containsProhibitedGuidance(value: unknown): boolean {
  if (typeof value === 'string') {
    const normalized = value.replace(/[\s　]+/gu, '');
    return PROHIBITED_GUIDANCE_PATTERNS.some((pattern) => pattern.test(value) || pattern.test(normalized));
  }
  if (Array.isArray(value)) return value.some(containsProhibitedGuidance);
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some(containsProhibitedGuidance);
  }
  return false;
}

function sanitizeGeneratedText(value: string): string {
  return containsProhibitedGuidance(value)
    ? '公開事例に規約・法令違反につながる記述が含まれるため、許可を得た正規の手段へ置き換えて検証します。'
    : value;
}

function sanitizeSynthesizedIdeas(ideas: SynthesizedIdea[]): SynthesizedIdea[] {
  return ideas.map((idea) => ({
    ...idea,
    dimensionLabel: sanitizeGeneratedText(idea.dimensionLabel),
    title: sanitizeGeneratedText(idea.title),
    targetPainWallet: sanitizeGeneratedText(idea.targetPainWallet),
    structuralArbitrage: sanitizeGeneratedText(idea.structuralArbitrage),
    requiredTools: idea.requiredTools.map((tool) => ({
      ...tool,
      name: sanitizeGeneratedText(tool.name),
      purpose: sanitizeGeneratedText(tool.purpose),
    })),
    first100TractionPlaybook: idea.first100TractionPlaybook.map(sanitizeGeneratedText),
    userNoteInspiration: sanitizeGeneratedText(idea.userNoteInspiration),
  }));
}

function boundedGeminiText(text: string): string {
  if (!text || text.length > MAX_GEMINI_RESPONSE_CHARS) throw new Error('Gemini response exceeded the safety limit');
  return text;
}

// =========================================================================
// 内蔵アナリスト推論エンジン（Fallback Analyst Engine）
// Gemini APIキー未設定時でも、実在22社のデータとユーザーメモから高精度な3次元アイデアを即時合成
// =========================================================================
function generateFallbackSynthesis(
  selectedEntityIds: string[],
  notes: Record<string, { content: string; updatedAt: string }>
): SynthesizedIdea[] {
  const chosenEntities = INSTITUTIONAL_ENTITIES.filter((e) =>
    selectedEntityIds.includes(e.id)
  );
  const relevantEntities = chosenEntities.length > 0 ? chosenEntities : INSTITUTIONAL_ENTITIES.slice(0, 3);
  
  // ユーザーのメモを統合
  const noteTexts = selectedEntityIds
    .map((id) => notes[id]?.content)
    .filter(Boolean) as string[];
  const combinedUserNote = noteTexts.join(' / ') || '特記事項なし（保存銘柄の構造を掛け合わせ）';

  const primaryEntity = relevantEntities[0] || INSTITUTIONAL_ENTITIES[0];
  const secondaryEntity = relevantEntities[1] || INSTITUTIONAL_ENTITIES[1] || primaryEntity;

  // 1. 本能ハック型（サバンナOS）: 損失回避・怠惰・虚栄心を直撃する即効型
  const idea1: SynthesizedIdea = {
    id: `idea_savanna_${Date.now()}_1`,
    dimension: 'SAVANNA_INSTINCT',
    dimensionLabel: '① 本能ハック型（サバンナOS）',
    title: `${primaryEntity.name}の手口転用: 【${primaryEntity.targetPainWallet || '顧客の防衛本能'}】を突く高単価マイクロ代行`,
    targetPainWallet: `${primaryEntity.targetPainWallet || '企業の保身・損失回避'} × ユーザー着目点（${combinedUserNote.slice(0, 40)}...）`,
    structuralArbitrage: `顧客が避けたい損失を、${primaryEntity.strategy.blindspot}の公開事例から読み解く。対象業界の許可された接点で小さく検証し、成約・提供時間・原価を記録してから拡大する。`,
    projectedMonthlyProfitJpy: Math.round(primaryEntity.pnl.operatingProfit * 0.25) || 1200000,
    operatingMargin: 78,
    requiredTools: [
      { name: primaryEntity.operations.toolStack[0]?.name || 'Next.js + Stripe', monthlyCostJpy: 4500, purpose: '集金およびフロントエンド' },
      { name: primaryEntity.operations.toolStack[1]?.name || 'Make / Supabase', monthlyCostJpy: 3000, purpose: 'バックエンド・通知の完全無人化' },
      { name: 'Resend / Google Workspace', monthlyCostJpy: 2000, purpose: '直販コールドアプローチ用配管' }
    ],
    first100TractionPlaybook: [
      `初期10人は広告を広く買わず、告知が許可された業界コミュニティと紹介経由で対象企業へ個別に提案`,
      `範囲・料金・解約条件を明記した小規模有料パイロットを提示し、同意を得た初期事例を3件確保`,
      `顧客の許可を得たビフォーアフター数値だけを出典付きで公開し、同業からの問い合わせにつなげる`,
    ],
    sourceEntityIds: [primaryEntity.id],
    userNoteInspiration: combinedUserNote.slice(0, 100),
  };

  // 2. 構造・胴元型（メタ・アーキテクチャ）: 他人の欲望を燃料にする手数料モデル
  const idea2: SynthesizedIdea = {
    id: `idea_meta_${Date.now()}_2`,
    dimension: 'META_ARCHITECT',
    dimensionLabel: '② 構造・胴元型（メタ・アーキテクチャ）',
    title: `${primaryEntity.name} × ${secondaryEntity.name}交差型: 【${secondaryEntity.sector}領域】の決済・仲介水門モデル`,
    targetPainWallet: `買い手と売り手の双方が抱える「取引の摩擦・信用コスト」から常時1〜3%の通行税を徴収`,
    structuralArbitrage: `${primaryEntity.name}の集客構造と${secondaryEntity.name}の継続利用の理由を比較し、買い手と売り手の双方が条件を確認できる仲介を設計する。取引履歴は同意の範囲で保存し、いつでも持ち出せる形にする。`,
    projectedMonthlyProfitJpy: Math.round((primaryEntity.pnl.operatingProfit + secondaryEntity.pnl.operatingProfit) * 0.15) || 2400000,
    operatingMargin: 84,
    requiredTools: [
      { name: 'Stripe Connect', monthlyCostJpy: 0, purpose: '自動エスクロー送金・手数料中抜き' },
      { name: 'Cloudflare Workers / D1', monthlyCostJpy: 3500, purpose: 'データ管理の参考構成（月額は仮の予算）' },
      { name: 'Airtable / Retool', monthlyCostJpy: 6000, purpose: '胴元用バックオフィス・監視コンソール' }
    ],
    first100TractionPlaybook: [
      `売り手側の上位20社へ、初期手数料と送客条件を公開したうえで参加を募る`,
      `買い手が読む業界掲示板・コミュニティの掲載規則に従い、出典付き相場比較データを提供する`,
      `取引後も連絡先とデータを双方が持ち出せるようにし、透明な手数料と同意ベースの連絡を運用する`,
    ],
    sourceEntityIds: [primaryEntity.id, secondaryEntity.id],
    userNoteInspiration: combinedUserNote.slice(0, 100),
  };

  // 3. 逆張り・盲点型（コペルニクス的転回）: 大手の自爆（カニバリ）を突く奇襲モデル
  const idea3: SynthesizedIdea = {
    id: `idea_contrarian_${Date.now()}_3`,
    dimension: 'CONTRARIAN_BLINDSPOT',
    dimensionLabel: '③ 逆張り・盲点型（コペルニクス的転回）',
    title: `既存大手の自爆（カニバリ）直撃: 【業界常識の真逆】を突く超高密度ソロSaaS`,
    targetPainWallet: `大手SaaSの高額な年間固定費と使わない多機能に疲弊した中小企業の現金`,
    structuralArbitrage: `大手の多機能・高額プランと、対象顧客が実際に使う最小機能を比較する。月額・解約条件・データ持ち出しを明記した特化版を作り、価格と継続率の実測で優位性を確かめる。`,
    projectedMonthlyProfitJpy: 1800000,
    operatingMargin: 89,
    requiredTools: [
      { name: 'Next.js 16 + Tailwind CSS', monthlyCostJpy: 0, purpose: '極限の表示速度・直感UI' },
      { name: 'OpenAI / Anthropic API', monthlyCostJpy: 15000, purpose: 'コア処理のAPIラッピング' },
      { name: 'Lemon Squeezy / Stripe', monthlyCostJpy: 0, purpose: 'グローバル即時決済' }
    ],
    first100TractionPlaybook: [
      `競合大手の解約ページ・不満が集まるXの検索クエリ（「○○ 高すぎる」「○○ 解約したい」）を常時監視`,
      `「大手○○の複雑な機能を全て捨て、この1画面だけに絞った特化ツール」としてピンポイントに対抗訴求`,
      `Product HuntやRedditなど掲載規則が明確な場で、比較表と出典を添えたローンチ記事を公開`
    ],
    sourceEntityIds: [primaryEntity.id],
    userNoteInspiration: combinedUserNote.slice(0, 100),
  };

  return [idea1, idea2, idea3];
}

// =========================================================================
// 内蔵チャット推論エンジン（Fallback Analyst Sparring）
// 冷徹なCTO・金融アナリスト視点によるシャープな壁打ち
// =========================================================================
function generateFallbackChatResponse(
  userQuery: string,
  contextEntityId?: string,
  notes?: Record<string, { content: string; updatedAt: string }>
): { content: string; suggestedActionPrompts: string[] } {
  const entity = findInstitutionalEntity(contextEntityId || '') || INSTITUTIONAL_ENTITIES[0];
  const userNote = contextEntityId && notes ? notes[contextEntityId]?.content : '';

  const q = userQuery.toLowerCase();

  let reply = '';
  let prompts = [
    '初期100人の集客を元手0円で完結させる具体的な手順は？',
    '大手が同じ機能をローンチしてきた場合の防衛線は？',
    'このビジネスモデルの月額固定費を1万円以下に抑える配管構成は？'
  ];

  if (q.includes('集客') || q.includes('顧客') || q.includes('マーケ') || q.includes('トラクション')) {
    reply = `広告の前に、${entity.name}の初動（${sanitizeGeneratedText(entity.strategy.initialTraction[0] || '公開記録にある初期施策')}）を出発点に、告知が許可された正規の接点を絞って検証します。広告費を固定で抱えず、反応と成約を測れる小規模な提案から始めるのが安全です。\n\n` +
      `やることはシンプルです。${sanitizeGeneratedText(entity.targetPainWallet || '困り果てている見込み客')}が日常的に不満を述べる場所を、掲載規則と連絡の同意条件まで確認して選び、「その面倒な作業を肩代わりする提案」を明確に伝えます。\n\n` +
      `最初の3件で、成約率・提供時間・原価を記録します。数字が再現すれば、同じ許可済み経路を少しずつ広げられます。\n\n` +
      `いま想定しているターゲット客は、具体的にどんな場所にいそうな人たちですか？`;
    prompts = [
      '直接アプローチで返信率を跳ね上げる最初の1行の作り方は？',
      '初期のお客さんに熱烈なファンになってもらう仕掛けは？',
      '最初の3人に買ってもらうための価格設定はどう決める？'
    ];
  } else if (q.includes('競合') || q.includes('真似') || q.includes('大手') || q.includes('防壁') || q.includes('moat')) {
    reply = `競合や大手への備えは、真似されないと決めつけず、${entity.name}の防壁（${sanitizeGeneratedText(entity.strategy.moatDescription)}）を検証可能な要素へ分解することです。\n\n` +
      `それは、「お客さんの過去データや日々の業務の記録」を握ってしまうことです。使い込むほどデータが溜まり、他社へ乗り換えること自体が面倒になる仕組みを最初から仕込んでおけば、後から真似されてもお客さんは逃げられません。\n\n` +
      `真似されることを恐れるより、お客さんが「もうこれなしでは仕事にならない」と感じるポイントを1つ作ることに集中してください。\n\n` +
      `いま考えているアイデアで、お客さんが手放せなくなる核になりそうな部分はどこですか？`;
    prompts = [
      'お客さんが二度と手放せなくなる仕掛けの具体例は？',
      '大手が絶対に参入できない「ニッチな隙間」の見つけ方は？',
      '後から真似されても負けないためのスピード勝負のやり方は？'
    ];
  } else if (q.includes('費用') || q.includes('コスト') || q.includes('ツール') || q.includes('原価') || q.includes('スタック')) {
    reply = `固定費は、実際の利用量と契約条件を確認しながら小さく始めます。${entity.name}の公開数値（粗利率${entity.pnl.grossMargin}%、営業利益率${entity.pnl.operatingMargin}%）は対象期間と範囲を確認してから参考にしてください。\n\n` +
      `無料枠・従量課金・決済手数料を並べ、1件あたりの原価と月間固定費を分けて表にします。料金や利用量が未確認なら推定値と明記し、売れた時だけ費用が発生する構成でも、サポート・返金・税金を含めて損益を確認します。\n\n` +
      `最初から大きく作らず、上限を決めた検証予算で需要と原価を同時に測るのが現実的です。\n\n` +
      `いまのアイデアで、一番お金がかかりそうだと心配している部分はどこですか？`;
    prompts = [
      '決済手数料以外にかかる隠れコストをゼロにする方法は？',
      '年間一括払いで前金をまとめて回収する料金プランは？',
      '最初から黒字を維持するための価格設定のコツは？'
    ];
  } else {
    reply = `面白い着眼点です。需要の強さは、${sanitizeGeneratedText(entity.targetPainWallet || 'お客さんが日々抱えている切実な面倒や損')}を、実際に何人がどの頻度で解決したいかで確かめます。\n\n` +
      `大掛かりな開発を急がず、既存の道具を2〜3個組み合わせた試作品を小さく出し、価格・成約・提供時間・原価を記録します。損失上限を先に決め、未確認の売上や利益は実績として扱いません。\n\n` +
      `${userNote ? '保存メモは入力値として参照しました。具体的な手順は許可済みの正規チャネルで検証します。' : ''}\n\n` +
      `いま考えているイメージは、まずは自分の手で泥臭く小さく始める形ですか？ それとも最初から自動で回る仕組みを目指していますか？`;
  }

  return { content: `${reply.trim()}\n\n${SAFETY_BOUNDARY_NOTICE}`, suggestedActionPrompts: prompts.map(sanitizeGeneratedText) };
}

interface GeminiApiResponse {
  text: string;
  sources?: Array<{ title: string; url: string }>;
}

// =========================================================================
// Gemini API による高度推論（APIキー存在時）
// 最安運用: 必要時のみ Google Search Grounding を有効化
// =========================================================================
async function callGeminiApi(
  prompt: string,
  apiKey: string,
  enableSearch: boolean = false
): Promise<GeminiApiResponse> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  const requestBody: Record<string, unknown> = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 2048,
    },
  };

  // リアルタイム検索AIが必要な場合のみGoogle検索ツールを有効化（完全無料枠運用・最安化）
  if (enableSearch) {
    requestBody.tools = [{ googleSearch: {} }];
  }

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!resp.ok) {
    throw new Error(`Gemini API returned status ${resp.status}`);
  }

  const data = await resp.json();
  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text || '';

  // Google Search Grounding の参照元（URL・タイトル）の抽出
  const sources: Array<{ title: string; url: string }> = [];
  const groundingChunks = candidate?.groundingMetadata?.groundingChunks;
  if (Array.isArray(groundingChunks)) {
    for (const chunk of groundingChunks) {
      if (chunk?.web?.uri) {
        sources.push({
          title: chunk.web.title || chunk.web.uri,
          url: chunk.web.uri,
        });
      }
    }
  }

  return { text, sources: sources.length > 0 ? sources : undefined };
}

/**
 * リアルタイム検索の必要性を判定する最安防衛フィルター
 * ユーザーが最新トレンドや競合調査を求めている場合のみ検索をONにし、通信コストと遅延を極小化
 */
function shouldEnableLiveSearch(query: string): boolean {
  const q = query.toLowerCase();
  const searchKeywords = [
    '最新', '今', 'いま', 'トレンド', '競合', '調査', '検索', '最近', 'ググ',
    'sns', 'twitter', 'xで', 'reddit', '相場', '価格', 'ニュース', 'リリース',
    '評判', '事例', 'いくら', '儲かって', '現状', '市場'
  ];
  return searchKeywords.some((keyword) => q.includes(keyword));
}

async function persistIdeas(userId: string | null, ideas: SynthesizedIdea[]): Promise<boolean> {
  if (!userId) return false;
  try {
    await batchD1(ideas.map((idea) => ({ sql: 'INSERT INTO synthesized_ideas(id,user_id,payload) VALUES(?,?,?) ON CONFLICT(user_id,id) DO NOTHING', params: [idea.id, userId, JSON.stringify(idea)] })));
    return true;
  } catch { return false; }
}
async function persistMessage(userId: string | null, conversationId: string | undefined, message: StrategyChatMessage): Promise<boolean> {
  if (!userId) return false;
  try {
    const result = await executeD1('INSERT INTO chat_messages(id,user_id,conversation_id,role,content,context_entity_id,suggested_prompts,sources) VALUES(?,?,?,?,?,?,?,?)', [crypto.randomUUID(), userId, conversationId || crypto.randomUUID(), message.role, message.content, message.contextEntityId ?? null, JSON.stringify(message.suggestedActionPrompts ?? []), JSON.stringify(message.sources ?? [])]);
    return result.changes === 1;
  } catch { return false; }
}

export async function POST(req: NextRequest) {
  try {
    let body;
    try { body = parseStrategyRequest(await readJsonBody(req, MAX_STRATEGY_REQUEST_BYTES)); }
    catch (error) {
      if (error instanceof RequestBodyTooLargeError) return NextResponse.json({ error: 'Request body is too large' }, { status: 413 });
      return NextResponse.json({ error: 'Invalid strategy request' }, { status: 400 });
    }
    const auth = req.headers.get('authorization');
    const user = auth?.startsWith('Bearer ') ? await verifyFirebaseIdToken(auth.slice(7)) : null;
    if (auth && !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = user?.uid ?? null;
    const apiKey = await getRuntimeEnvValue('GEMINI_API_KEY') || await getRuntimeEnvValue('GOOGLE_GENERATIVE_AI_API_KEY');
    if (apiKey && !user) return NextResponse.json({ error: 'Authentication is required for AI analysis' }, { status: 401 });

    // 1. アイデア合成リクエスト (SYNTHESIZE)
    if (body.action === 'SYNTHESIZE') {
      const payload = body;
      const { selectedEntityIds, notes } = payload;

      // Gemini APIが利用可能な場合はAI推論を試みる
      if (apiKey) {
        try {
          const entitiesData = INSTITUTIONAL_ENTITIES.filter((e) =>
            selectedEntityIds.includes(e.id)
          );
          const prompt = `
あなたは冷徹な金融アナリスト兼最高技術責任者（CTO）です。起業ポエムや綺麗事、ワークシートを100%排除し、実在企業のP&L・手口とユーザーメモから独自の高収益ビジネスアイデアを3つ生成してください。

【対象企業データ】:
${JSON.stringify(entitiesData.map(e => ({ name: e.name, ticker: e.ticker, profit: e.pnl.operatingProfit, margin: e.pnl.operatingMargin, moat: e.strategy.moatDescription, blindspot: e.strategy.blindspot, tools: e.operations.toolStack, traction: e.strategy.initialTraction })), null, 2)}

【ユーザーのアナリストメモ（考察）】:
${JSON.stringify(notes, null, 2)}

【ユーザーの好み・関心プロファイル（保存・閲覧履歴より自動算出）】:
${payload.userProfile?.profileSummary || '完全1人運営、粗利80%超モデルに関心'}

【出力要件】:
以下の3つの次元でアイデアをJSON配列として返してください。Markdownコードブロックは不要、純粋なJSONのみ。
1. SAVANNA_INSTINCT (本能ハック型): 顧客の損失回避・怠惰・虚栄心を突く即効モデル
2. META_ARCHITECT (構造・胴元型): 取引手数料や水門を握る独占モデル
3. CONTRARIAN_BLINDSPOT (逆張り・盲点型): 大手の自爆（カニバリ）を突く奇襲モデル

【安全と根拠の境界】
- 法令・各サービス規約に反する手順、自作自演、迷惑DM、不正取得・不正スクレイピング、直取引の妨害、誤認表示は提案しない。
- 実行案は、正規チャネル、相手の明示同意、透明な料金・解約条件、データの持ち出し可能性を前提にする。
- 公開事実・推定・未確認を区別し、根拠のない売上・利益・成功保証を出力しない。

スキーマ:
[
  {
    "id": "idea_1",
    "dimension": "SAVANNA_INSTINCT",
    "dimensionLabel": "① 本能ハック型（サバンナOS）",
    "title": "...",
    "targetPainWallet": "...",
    "structuralArbitrage": "...",
    "projectedMonthlyProfitJpy": 1500000,
    "operatingMargin": 80,
    "requiredTools": [{"name": "...", "monthlyCostJpy": 3000, "purpose": "..."}],
    "first100TractionPlaybook": ["ステップ1", "ステップ2", "ステップ3"],
    "sourceEntityIds": ["ent_..."],
    "userNoteInspiration": "..."
  }
]
`;
          const rawResponse = await callGeminiApi(prompt, apiKey);
          const cleanJson = boundedGeminiText(rawResponse.text).replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = parseSynthesizedIdeas(JSON.parse(cleanJson));
          if (Array.isArray(parsed) && parsed.length > 0) {
            const ideas = sanitizeSynthesizedIdeas(parsed);
            const persisted = await persistIdeas(userId, ideas);
            return NextResponse.json({ success: true, ideas, engine: 'gemini', persisted });
          }
        } catch (geminiErr) {
          console.warn('Gemini API synthesis failed, falling back to internal analyst engine:', geminiErr);
        }
      }

      // フォールバック推論エンジン
      const ideas = sanitizeSynthesizedIdeas(generateFallbackSynthesis(selectedEntityIds, notes));
      return NextResponse.json({ success: true, ideas, engine: 'fallback_internal', persisted: await persistIdeas(userId, ideas) });
    }

    // 2. 対話壁打ちリクエスト (CHAT)
    if (body.action === 'CHAT') {
      const payload = body;
      const { messages, contextEntityId, notes, conversationId } = payload;
      const lastUserMessage = messages[messages.length - 1]?.content || '';

      // リアルタイム検索の要否を自動判定（最安運用: 必要な時のみGoogle検索を発動）
      const enableSearch = shouldEnableLiveSearch(lastUserMessage);

      // Only the authenticated owner's notes can enter their prompt.
      let dbAccumulatedNotes = '';
      if (userId) {
        try {
          const rows = await queryD1('SELECT entity_id,content FROM analyst_notes WHERE user_id=? ORDER BY updated_at DESC LIMIT 20', [userId], (raw) => {
            const row = raw as Record<string, unknown>;
            if (typeof row.entity_id !== 'string' || typeof row.content !== 'string') throw new Error('Invalid analyst note');
            return { entityId: row.entity_id, content: row.content };
          });
          dbAccumulatedNotes = rows.map((note) => `[銘柄: ${note.entityId}]: ${note.content}`).join('\n');
        } catch { /* User-supplied notes remain available if saved notes cannot be read. */ }
      }

      if (apiKey) {
        try {
          const entity = findInstitutionalEntity(contextEntityId || '');
          const clientNote = contextEntityId && notes ? notes[contextEntityId]?.content || '' : '';
          const allNotesContext = [clientNote, dbAccumulatedNotes].filter(Boolean).join('\n\n');

          const prompt = `
あなたは世界最高峰の頭脳を持つ、頼もしい事業パートナーです。
難しいカタカナ用語（ROI、LTV、セグメント等）や小難しい熟語は一切使わず、誰でも1秒でわかる平易な日本語で、曖昧に濁さずズバッと核心を言い切ってください。

【対話スタンス】
1. 「どこが面白いと思ったの？」のようなオウム返しや質問返し（思考停止のカウンセラーごっこ）は完全厳禁です。
2. ユーザーのアイデアを否定したり、特定の型（大手の打倒など）に無理やり押し込めないでください。
3. ユーザーの発言を受け取ったら、即座に「その着眼点がなぜ素晴らしいのか」を平易な言葉で言語化し、一段深い視点や具体的な突破口を足して、1歩進めたボールを打ち返してください。
4. メガネをクイクイさせて「リスクがあります」「慎重に」と冷や水を浴びせる減点パトロールは厳禁です。どうやれば手堅く勝てるかの活路を力強く示してください。
5. 「【結論: ...】」などのロボット定型句は不要です。頼りがいと確信に満ちたプロフェッショナルとして自然に対話してください。
${enableSearch ? '6. Google検索から得られた最新の市場・競合・トレンド情報を自然に織り交ぜて回答してください。' : ''}

【安全と根拠の境界】
法令・各サービス規約に反する手順、自作自演、迷惑DM、不正取得・不正スクレイピング、直取引の妨害、誤認表示は提案しないでください。実行案は正規チャネル、相手の明示同意、透明な料金・解約条件、データの持ち出し可能性を前提にしてください。公開事実・推定・未確認を区別し、根拠のない成功保証や売上・利益の断定は避けてください。

【あなたの手元にある裏帳簿データ（参考実例）】:
${entity ? JSON.stringify({ name: entity.name, pnl: entity.pnl, moat: entity.strategy.moatDescription, traction: entity.strategy.initialTraction, stack: entity.operations.toolStack, painWallet: entity.targetPainWallet }) : '全銘柄データ保有'}

【DBおよび直近から蓄積されたアナリストメモ（ユーザーの視点）】:
${allNotesContext || '特記事項なし'}

【ユーザーの好み・関心プロファイル（保存・閲覧履歴より自動算出）】:
${payload.userProfile?.profileSummary || '完全1人運営、粗利80%超モデルに関心'}

【これまでの対話履歴】:
${messages.map(m => `${m.role}: ${m.content}`).join('\n')}

回答の最後に、次に深掘りできる自然な問いや選択肢を「PROMPTS:」に続けて3行（改行区切り）で示してください。
`;
          const rawResponse = await callGeminiApi(prompt, apiKey, enableSearch);
          const parts = boundedGeminiText(rawResponse.text).split('PROMPTS:');
          const replyContent = `${sanitizeGeneratedText(parts[0].trim())}\n\n${SAFETY_BOUNDARY_NOTICE}`.trim();
          const promptLines = parts[1]
            ? parts[1].split('\n').map(l => sanitizeGeneratedText(l.replace(/^[0-9\.\-\*\s]+/, '').trim())).filter(Boolean)
            : [
                '初期100人の集客を元手0円で完結させる具体的な手順は？',
                '大手が同じ機能をローンチしてきた場合の防衛線は？',
                'このビジネスモデルの月額固定費を1万円以下に抑える配管構成は？'
              ];

          const assistantMsg: StrategyChatMessage = {
            id: `msg_${Date.now()}`,
            role: 'assistant',
            content: replyContent,
            timestamp: new Date().toISOString(),
            contextEntityId,
            suggestedActionPrompts: promptLines.slice(0, 3),
            sources: rawResponse.sources,
            isSearchUsed: enableSearch && Boolean(rawResponse.sources && rawResponse.sources.length > 0),
          };

          const persisted = await persistMessage(userId, conversationId, assistantMsg);

          return NextResponse.json({
            success: true,
            message: assistantMsg,
            engine: 'gemini',
            persisted,
          });
        } catch (geminiErr) {
          console.warn('Gemini API chat failed, falling back to internal analyst engine:', geminiErr);
        }
      }

      // フォールバック推論エンジン
      const { content, suggestedActionPrompts } = generateFallbackChatResponse(lastUserMessage, contextEntityId, notes);
      const assistantMsg: StrategyChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content,
        timestamp: new Date().toISOString(),
        contextEntityId,
        suggestedActionPrompts,
      };

      return NextResponse.json({ success: true, message: assistantMsg, engine: 'fallback_internal', persisted: await persistMessage(userId, conversationId, assistantMsg) });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: unknown) {
    console.error('Strategy Chat API error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

import type { UserProfilePayload } from '@/shared/strategy';
import { parseStrategyRequest, parseSynthesizedIdeas } from '@/shared/strategy-schema';
import { NextRequest, NextResponse } from 'next/server';
import { INSTITUTIONAL_ENTITIES } from '@/platform/data/mockLedgerData';
import { SynthesizedIdea, StrategyChatMessage } from '@/platform/types/terminal';
import { db, analystNotes, chatMessages, synthesizedIdeas } from '@/db';
import { desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// =========================================================================
// 内蔵アナリスト推論エンジン（Fallback Analyst Engine）
// Gemini APIキー未設定時でも、実在22社のデータとユーザーメモから高精度な3次元アイデアを即時合成
// =========================================================================
function generateFallbackSynthesis(
  selectedEntityIds: string[],
  notes: Record<string, { content: string; updatedAt: string }>,
  userProfile?: UserProfilePayload
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
    structuralArbitrage: `顧客は「得をしたい」ではなく「損をして恥をかきたくない」という恐怖で即決する。${primaryEntity.strategy.blindspot}の手法を他産業へスライドさせ、競合の稟議を無力化して即金回収する。`,
    projectedMonthlyProfitJpy: Math.round(primaryEntity.pnl.operatingProfit * 0.25) || 1200000,
    operatingMargin: 78,
    requiredTools: [
      { name: primaryEntity.operations.toolStack[0]?.name || 'Next.js + Stripe', monthlyCostJpy: 4500, purpose: '集金およびフロントエンド' },
      { name: primaryEntity.operations.toolStack[1]?.name || 'Make / Supabase', monthlyCostJpy: 3000, purpose: 'バックエンド・通知の完全無人化' },
      { name: 'Resend / Google Workspace', monthlyCostJpy: 2000, purpose: '直販コールドアプローチ用配管' }
    ],
    first100TractionPlaybook: [
      `初期10人は広告を一切打たず、${primaryEntity.strategy.initialTraction[0] || 'ターゲット企業の担当者へ直接DM'}で泥臭く個別接触`,
      `「返金保証付き・成果報酬テスト」を提示して相手のリスクを0にし、初期事例（Case Study）を3件確保`,
      `獲得した顧客のビフォーアフター数値をそのままX/LinkedInで公開し、同業他社の焦燥感を煽ってインバウンド獲得`
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
    structuralArbitrage: `プレイヤーとして汗をかかず、${primaryEntity.name}の集客構造と${secondaryEntity.name}の囲い込み（ロックイン）を融合。取引データが溜まるほど他社乗り換えが不可能になる重力場を構築する。`,
    projectedMonthlyProfitJpy: Math.round((primaryEntity.pnl.operatingProfit + secondaryEntity.pnl.operatingProfit) * 0.15) || 2400000,
    operatingMargin: 84,
    requiredTools: [
      { name: 'Stripe Connect', monthlyCostJpy: 0, purpose: '自動エスクロー送金・手数料中抜き' },
      { name: 'Cloudflare Workers / Neon DB', monthlyCostJpy: 3500, purpose: '従量課金ゼロ・超低遅延データ管理' },
      { name: 'Airtable / Retool', monthlyCostJpy: 6000, purpose: '胴元用バックオフィス・監視コンソール' }
    ],
    first100TractionPlaybook: [
      `売り手側（供給側）の上位20社に対し、初期手数料0%＋独占送客の条件で裏合意を締結し在庫・リソースを囲い込み`,
      `買い手側が日々巡回している業界掲示板・コミュニティへ、最も生々しい相場比較データを無料投下してトラフィックを強奪`,
      `最初の取引が発生した瞬間から、両者の連絡先を独自システム内に幽閉して直取引を封鎖`
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
    structuralArbitrage: `大手企業は既存の売上基盤と高単価プランを維持しなければ自滅するため、この「超単機能・月額即時解約可能」な破格モデルには絶対に追随できない。大手の弱点を逆手に取った完全防壁。`,
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
      `Product HuntおよびRedditの関連サブレディットへ、大手への怒りを代弁するローンチ記事を投下`
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
  notes?: Record<string, { content: string; updatedAt: string }>,
  userProfile?: UserProfilePayload
): { content: string; suggestedActionPrompts: string[] } {
  const entity = INSTITUTIONAL_ENTITIES.find((e) => e.id === contextEntityId) || INSTITUTIONAL_ENTITIES[0];
  const userNote = contextEntityId && notes ? notes[contextEntityId]?.content : '';
  const profileHint = userProfile?.profileSummary ? `\n\n【あなたの関心傾向】: ${userProfile.profileSummary}` : '';

  const q = userQuery.toLowerCase();

  let reply = '';
  let prompts = [
    '初期100人の集客を元手0円で完結させる具体的な手順は？',
    '大手が同じ機能をローンチしてきた場合の防衛線は？',
    'このビジネスモデルの月額固定費を1万円以下に抑える配管構成は？'
  ];

  if (q.includes('集客') || q.includes('顧客') || q.includes('マーケ') || q.includes('トラクション')) {
    reply = `集客で広告を打つのは絶対に避けてください。${entity.name}の初動（${entity.strategy.initialTraction[0]}）が証明している通り、最初は「広告費ゼロの直接アプローチ」が最も手堅く、最も早く結果が出ます。\n\n` +
      `やるべきことはシンプルです。${entity.targetPainWallet || '困り果てている見込み客'}が日常的に不満を吐いている場所（Xの検索、業界掲示板、Q&Aサイト）を特定し、「その面倒な作業を今すぐ肩代わりするツールを作りました」と1対1で連絡を取るだけです。\n\n` +
      `最初の3人に買ってもらえれば、その利用実績をそのまま使って次の30人を獲りにいけます。一番手堅いルートです。\n\n` +
      `いま想定しているターゲット客は、具体的にどんな場所にいそうな人たちですか？`;
    prompts = [
      '直接アプローチで返信率を跳ね上げる最初の1行の作り方は？',
      '初期のお客さんに熱烈なファンになってもらう仕掛けは？',
      '最初の3人に買ってもらうための価格設定はどう決める？'
    ];
  } else if (q.includes('競合') || q.includes('真似') || q.includes('大手') || q.includes('防壁') || q.includes('moat')) {
    reply = `競合や大手に真似される心配は無用です。${entity.name}の防壁（${entity.strategy.moatDescription}）を見れば明らかな通り、参入されないための決定的な急所があります。\n\n` +
      `それは、「お客さんの過去データや日々の業務の記録」を握ってしまうことです。使い込むほどデータが溜まり、他社へ乗り換えること自体が面倒になる仕組みを最初から仕込んでおけば、後から真似されてもお客さんは逃げられません。\n\n` +
      `真似されることを恐れるより、お客さんが「もうこれなしでは仕事にならない」と感じるポイントを1つ作ることに集中してください。\n\n` +
      `いま考えているアイデアで、お客さんが手放せなくなる核になりそうな部分はどこですか？`;
    prompts = [
      'お客さんが二度と手放せなくなる仕掛けの具体例は？',
      '大手が絶対に参入できない「ニッチな隙間」の見つけ方は？',
      '後から真似されても負けないためのスピード勝負のやり方は？'
    ];
  } else if (q.includes('費用') || q.includes('コスト') || q.includes('ツール') || q.includes('原価') || q.includes('スタック')) {
    reply = `固定費は月額数千円以下に抑えてください。これが絶対に失敗しない鉄則です。${entity.name}も月次粗利率${entity.pnl.grossMargin}%、営業利益率${entity.pnl.operatingMargin}%という驚異的な手残りを叩き出していますが、使っているツールは誰でも使えるものばかりです。\n\n` +
      `画面の公開は無料枠のツール、データベースも無料枠、決済は売れた時だけ手数料（約3.6%）が引かれる仕組みを使えば、毎月の固定費はほぼゼロで済みます。\n\n` +
      `固定費がゼロなら、毎月1件でも売れれば即黒字ですし、万が一うまくいかなくても金銭的なダメージは完全ゼロです。最初からお金をかけて作る必要は1ミリもありません。\n\n` +
      `いまのアイデアで、一番お金がかかりそうだと心配している部分はどこですか？`;
    prompts = [
      '決済手数料以外にかかる隠れコストをゼロにする方法は？',
      '年間一括払いで前金をまとめて回収する料金プランは？',
      '最初から黒字を維持するための価格設定のコツは？'
    ];
  } else {
    reply = `すごくいい着眼点です。間違いなく強い需要があります。\n\n` +
      `このアイデアが強い理由はシンプルで、${entity.targetPainWallet || 'お客さんが日々抱えている切実な面倒や損'}を、直接スパッと解決できる構造になっているからです。\n\n` +
      `大掛かりな開発は一切不要で、既存の便利な道具を2〜3個組み合わせるだけで、今夜にも動くプロトタイプが完成します。失うものは数千円と数日間の作業時間だけです。破滅するリスクはゼロです。\n\n` +
      `${userNote ? `メモにあった「${userNote.slice(0, 40)}...」という視点も、まさにこの急所を突いています。` : ''}\n\n` +
      `いま考えているイメージは、まずは自分の手で泥臭く小さく始める形ですか？ それとも最初から自動で回る仕組みを目指していますか？`;
  }

  return { content: reply, suggestedActionPrompts: prompts };
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

export async function POST(req: NextRequest) {
  try {
    let body;
    try { body = parseStrategyRequest(await req.json()); }
    catch { return NextResponse.json({ error: 'Invalid strategy request' }, { status: 400 }); }
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

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
          const cleanJson = rawResponse.text.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = parseSynthesizedIdeas(JSON.parse(cleanJson));
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Neon DBが利用可能な場合は非同期で永続化
            if (db) {
              try {
                for (const idea of parsed) {
                  db.insert(synthesizedIdeas).values({
                    id: idea.id || `idea_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                    userId: 'guest',
                    dimension: idea.dimension,
                    dimensionLabel: idea.dimensionLabel,
                    title: idea.title,
                    targetPainWallet: idea.targetPainWallet,
                    structuralArbitrage: idea.structuralArbitrage,
                    projectedMonthlyProfitJpy: idea.projectedMonthlyProfitJpy || 0,
                    operatingMargin: idea.operatingMargin || 0,
                    requiredTools: idea.requiredTools || [],
                    first100TractionPlaybook: idea.first100TractionPlaybook || [],
                    sourceEntityIds: idea.sourceEntityIds || [],
                    userNoteInspiration: idea.userNoteInspiration || null,
                  }).catch((err) => console.warn('Neon synthesized idea insert warning:', err));
                }
              } catch (dbErr) {
                console.warn('Neon DB async sync failed:', dbErr);
              }
            }
            return NextResponse.json({ success: true, ideas: parsed, engine: 'gemini' });
          }
        } catch (geminiErr) {
          console.warn('Gemini API synthesis failed, falling back to internal analyst engine:', geminiErr);
        }
      }

      // フォールバック推論エンジン
      const ideas = generateFallbackSynthesis(selectedEntityIds, notes, payload.userProfile);
      return NextResponse.json({ success: true, ideas, engine: 'fallback_internal' });
    }

    // 2. 対話壁打ちリクエスト (CHAT)
    if (body.action === 'CHAT') {
      const payload = body;
      const { messages, contextEntityId, notes, conversationId } = payload;
      const lastUserMessage = messages[messages.length - 1]?.content || '';

      // リアルタイム検索の要否を自動判定（最安運用: 必要な時のみGoogle検索を発動）
      const enableSearch = shouldEnableLiveSearch(lastUserMessage);

      // Neon DBから過去の蓄積メモを抽出（DB接続時）
      let dbAccumulatedNotes: string = '';
      if (db) {
        try {
          const fetchedNotes = await db.select().from(analystNotes).limit(20);
          if (fetchedNotes && fetchedNotes.length > 0) {
            dbAccumulatedNotes = fetchedNotes
              .map((n) => `[銘柄: ${n.entityId}]: ${n.content}`)
              .join('\n');
          }
        } catch (dbReadErr) {
          console.warn('Neon DB notes query skipped:', dbReadErr);
        }
      }

      if (apiKey) {
        try {
          const entity = INSTITUTIONAL_ENTITIES.find((e) => e.id === contextEntityId);
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
          const parts = rawResponse.text.split('PROMPTS:');
          const replyContent = parts[0].trim();
          const promptLines = parts[1]
            ? parts[1].split('\n').map(l => l.replace(/^[0-9\.\-\*\s]+/, '').trim()).filter(Boolean)
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

          // Neon DBへ非同期で対話ログを蓄積
          if (db) {
            try {
              const activeConvId = conversationId || `conv_session_${Date.now()}`;
              db.insert(chatMessages).values({
                id: assistantMsg.id,
                conversationId: activeConvId,
                role: 'assistant',
                content: assistantMsg.content,
                contextEntityId: contextEntityId || null,
                suggestedPrompts: assistantMsg.suggestedActionPrompts || null,
                sources: assistantMsg.sources || null,
              }).catch((e) => console.warn('Neon chat message insert warning:', e));
            } catch (dbSaveErr) {
              console.warn('Neon DB message save skipped:', dbSaveErr);
            }
          }

          return NextResponse.json({
            success: true,
            message: assistantMsg,
            engine: 'gemini',
          });
        } catch (geminiErr) {
          console.warn('Gemini API chat failed, falling back to internal analyst engine:', geminiErr);
        }
      }

      // フォールバック推論エンジン
      const { content, suggestedActionPrompts } = generateFallbackChatResponse(lastUserMessage, contextEntityId, notes, payload.userProfile);
      const assistantMsg: StrategyChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content,
        timestamp: new Date().toISOString(),
        contextEntityId,
        suggestedActionPrompts,
      };

      return NextResponse.json({ success: true, message: assistantMsg, engine: 'fallback_internal' });
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

import { NextRequest, NextResponse } from 'next/server';
import { INSTITUTIONAL_ENTITIES } from '@/platform/data/mockLedgerData';
import { SynthesizedIdea, StrategyChatMessage } from '@/platform/types/terminal';

export const dynamic = 'force-dynamic';

interface SynthesisPayload {
  action: 'SYNTHESIZE';
  selectedEntityIds: string[];
  notes: Record<string, { content: string; updatedAt: string }>;
}

interface ChatPayload {
  action: 'CHAT';
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  contextEntityId?: string;
  synthesizedIdeas?: SynthesizedIdea[];
  notes?: Record<string, { content: string; updatedAt: string }>;
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
  notes?: Record<string, { content: string; updatedAt: string }>
): { content: string; suggestedActionPrompts: string[] } {
  const entity = INSTITUTIONAL_ENTITIES.find((e) => e.id === contextEntityId) || INSTITUTIONAL_ENTITIES[0];
  const userNote = contextEntityId && notes ? notes[contextEntityId]?.content : '';

  const q = userQuery.toLowerCase();

  let reply = '';
  let prompts = [
    '初期100人の集客を元手0円で完結させる具体的な手順は？',
    '大手が同じ機能をローンチしてきた場合の防衛線は？',
    'このビジネスモデルの月額固定費を1万円以下に抑える配管構成は？'
  ];

  if (q.includes('集客') || q.includes('顧客') || q.includes('マーケ') || q.includes('トラクション')) {
    reply = `集客で広告を打つのは一番やっちゃいけない悪手だね。${entity.name}の初動（${entity.strategy.initialTraction[0]}）がまさにそうだったように、最初は「広告費ゼロの直接接触」が最強に効く。\n\n` +
      `要するに、${entity.targetPainWallet || '困り果てている意思決定者'}が愚痴を吐いている現場（Xの検索、掲示板、業界の口コミ）を特定して、「あなたのその痛みを今すぐ止めるプロトタイプを作りました」と1対1で持ち込むのが最短。\n\n` +
      `3人に買ってもらえたら、その実績画面をそのまま使って次の30人を獲りにいく。いま考えてるターゲット層って、具体的にどこに生息してる人たち？`;
    prompts = [
      'コールドDMで返信率を跳ね上げる最初の1行の作り方は？',
      '初期顧客をファンにして口コミを起こす仕掛けは？',
      '最初の3人に売るための価格設定（お試し価格）はどう決める？'
    ];
  } else if (q.includes('競合') || q.includes('真似') || q.includes('大手') || q.includes('防壁') || q.includes('moat')) {
    reply = `大手が真似してくる恐怖はめちゃくちゃ分かる。でも、${entity.name}の防壁（${entity.strategy.moatDescription}）を見れば分かる通り、実は大手には「手を出したくても出せない構造的な理由」があるんだよね。\n\n` +
      `大手が高単価プランを持っている場合、安くて小回りの利く特化プランを出すと、自社の客を奪う「共食い（カニバリ）」になるから社内稟議が絶対に下りない。そこが俺たちの無傷の聖域になる。\n\n` +
      `加えて、客の過去データや業務フローをガッチリ握っちゃえば（スイッチングコスト）、後から真似されても客は乗り換えられない。いま考えてるアイデアで、客が「もう他に移れない」と感じるポイントってどこになりそう？`;
    prompts = [
      '顧客が二度と解約できなくなる仕組みの具体例は？',
      '大手が見逃さざるを得ない「ニッチの狙い目」を特定するには？',
      '後発の個人に真似されないためのスピード勝負の仕掛けは？'
    ];
  } else if (q.includes('費用') || q.includes('コスト') || q.includes('ツール') || q.includes('原価') || q.includes('スタック')) {
    reply = `固定費は極限までケチるのが正解だね。${entity.name}も月次粗利率は${entity.pnl.grossMargin}%、営業利益率は${entity.pnl.operatingMargin}%という驚異的な数字を出してるけど、使ってる配管は驚くほどシンプル。\n\n` +
      `フロントは無料枠のVercel、DBはSupabase、決済はStripe（手数料3.6%のみ）、自動化はMakeで組めば、月額コストは数千円以下に抑えられる。\n\n` +
      `固定費がほぼゼロなら、毎月1件でも売れれば即黒字だし、最悪失敗しても痛手はゼロ。いまのアイデアで、一番コストがかかりそうだと不安に思ってる部分ってどこ？`;
    prompts = [
      '決済手数料以外に発生する隠れコストの防ぎ方は？',
      '前金一括払いでキャッシュフローをプラスにする課金体系は？',
      '初月から黒字化するためのプライシング戦略は？'
    ];
  } else {
    reply = `その着眼点、すごく面白いね。大手が自社の本丸を守るために放置している「${entity.name}」の領域と完全に同じ構造が見える。\n\n` +
      `要するに「${entity.targetPainWallet || '顧客が抱える切実な損失恐怖'}」を直接解決する形だから、相手は値切らずに即日財布を開く可能性が極めて高い。\n\n` +
      `大掛かりな開発をしなくても、既存ツールを2〜3個繋ぐだけで今夜プロトタイプが動くし、最悪でも失うのは数千円と数日間の時間だけ（破滅確率は完全ゼロ）。\n\n` +
      `${userNote ? `メモにあった「${userNote.slice(0, 40)}...」という視点もまさにこの急所を突いている。` : ''}\n\n` +
      `いま頭にあるイメージって、まずは1人で泥臭く初動を刈り取る形？ それとも最初から半自動の仕組みにする形？`;
  }

  return { content: reply, suggestedActionPrompts: prompts };
}

// =========================================================================
// Gemini API による高度推論（APIキー存在時）
// =========================================================================
async function callGeminiApi(prompt: string, apiKey: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
      },
    }),
  });

  if (!resp.ok) {
    throw new Error(`Gemini API returned status ${resp.status}`);
  }

  const data = await resp.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    // 1. アイデア合成リクエスト (SYNTHESIZE)
    if (body.action === 'SYNTHESIZE') {
      const payload = body as SynthesisPayload;
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
          const cleanJson = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return NextResponse.json({ success: true, ideas: parsed, engine: 'gemini' });
          }
        } catch (geminiErr) {
          console.warn('Gemini API synthesis failed, falling back to internal analyst engine:', geminiErr);
        }
      }

      // フォールバック推論エンジン
      const ideas = generateFallbackSynthesis(selectedEntityIds, notes);
      return NextResponse.json({ success: true, ideas, engine: 'fallback_internal' });
    }

    // 2. 対話壁打ちリクエスト (CHAT)
    if (body.action === 'CHAT') {
      const payload = body as ChatPayload;
      const { messages, contextEntityId, notes } = payload;
      const lastUserMessage = messages[messages.length - 1]?.content || '';

      if (apiKey) {
        try {
          const entity = INSTITUTIONAL_ENTITIES.find((e) => e.id === contextEntityId);
          const prompt = `
あなたは世界最高峰の頭脳を持つ知的な事業パートナー（チーフ参謀）です。
ユーザーと対等かつ頼もしい仲間として、ビジネスの壁打ち（アイデアの具体化・勝算の向上）を行います。

【最重要: パス＆ムーブの原則】
1. 「どこが面白いと思ったの？」のようなオウム返し・質問返し（思考停止のカウンセラーごっこ）は完全厳禁です。
2. ユーザーのアイデアや着眼点を絶対に否定したり、特定の型（小手先のSaaSやハック等）に無理やり押し込めないでください。
3. ユーザーの発言を受け取ったら、即座に「その着眼点の面白さや隠れた本質」を言語化し、一段深い視点や具体例（実在の事例、数字、構造）を1つ足して、1歩先へ進めたボールを打ち返してください。
4. メガネをクイクイさせて「リスクがあります」「慎重に」と冷や水を浴びせる減点パトロールは厳禁です。どうやれば大手を出し抜いて勝てるかの活路を一緒に探ってください。
5. 「【結論: ...】」や長大な箇条書きなどの硬直したロボット定型句は不要です。知性と熱量を持った生身の天才共同創業者のように、自然体でテンポよく対話してください。

【あなたの手元にある裏帳簿データ】:
${entity ? JSON.stringify({ name: entity.name, pnl: entity.pnl, moat: entity.strategy.moatDescription, traction: entity.strategy.initialTraction, stack: entity.operations.toolStack, painWallet: entity.targetPainWallet }) : '全銘柄データ保有'}

【ユーザーのアナリストメモ】:
${contextEntityId && notes ? notes[contextEntityId]?.content || '' : ''}

【これまでの対話履歴】:
${messages.map(m => `${m.role}: ${m.content}`).join('\n')}

回答の最後に、次に深掘りできる鋭利で自然な問い・選択肢を「PROMPTS:」に続けて3行（改行区切り）で示してください。
`;
          const rawResponse = await callGeminiApi(prompt, apiKey);
          const parts = rawResponse.split('PROMPTS:');
          const replyContent = parts[0].trim();
          const promptLines = parts[1]
            ? parts[1].split('\n').map(l => l.replace(/^[0-9\.\-\*\s]+/, '').trim()).filter(Boolean)
            : [
                '初期100人の集客を元手0円で完結させる具体的な手順は？',
                '大手が同じ機能をローンチしてきた場合の防衛線は？',
                'このビジネスモデルの月額固定費を1万円以下に抑える配管構成は？'
              ];

          return NextResponse.json({
            success: true,
            message: {
              id: `msg_${Date.now()}`,
              role: 'assistant',
              content: replyContent,
              timestamp: new Date().toISOString(),
              contextEntityId,
              suggestedActionPrompts: promptLines.slice(0, 3),
            },
            engine: 'gemini',
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

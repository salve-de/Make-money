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
    reply = `【結論: 広告は打つな。大手の死角にいる客へ直販コールド接触せよ】\n\n` +
      `初動で広告費を投じるのは自殺行為である。${entity.name}の事例（初動トラクション: ${entity.strategy.initialTraction[0]}）を見よ。\n\n` +
      `1. 最初の30日間は、ターゲット顧客層（${entity.targetPainWallet || '保身を急ぐ意思決定者'}）が日常的に吐き出している不満の現場（掲示板・SNS・業界DB）を特定せよ。\n` +
      `2. 「無料でお試し」「話を聞かせてください」という腑抜けたアプローチは無視される。「あなたの現場の○○という損失を3分で止めるプロトタイプを作った」と、相手の痛みを切除する提案を1日20件DM爆撃せよ。\n` +
      `3. 3件の有料成約が出た時点で、その証拠スクリーンショットを唯一の武器にして横展開する。これが最短の手口だ。`;
    prompts = [
      'コールドDMの開封率を80%超にする件名と構成のテンプレは？',
      '初期顧客を逃さないための「データの監禁」の仕掛け方は？',
      '月利100万円に達するまでの損益分岐点のシミュレーションは？'
    ];
  } else if (q.includes('競合') || q.includes('真似') || q.includes('大手') || q.includes('防壁') || q.includes('moat')) {
    reply = `【結論: 大手は「共食い恐怖（カニバリ）」で手を出せない。そこが絶対の防壁だ】\n\n` +
      `${entity.name}の参入障壁の本質は「${entity.strategy.moatDescription}」にある。\n\n` +
      `大手企業がこの領域を認知しても参入できない理由は明確だ:\n` +
      `1. 単価破壊のジレンマ: 大手が高単価な既存商品を抱えている場合、この安価・超特化な商品を出すと自社の本丸の客を奪ってしまう。\n` +
      `2. 意思決定の遅延: 稟議と法務チェックに3ヶ月かけている間に、1人体制の現場は毎週3回の高速アップデートを完了できる。\n` +
      `3. データの監禁: 顧客の業務ログや過去資産を人質に取り、乗り換えコストを極大化させれば、後発の競合は手を出せない。`;
    prompts = [
      '顧客が二度と解約できなくなる「スイッチングコスト」の設計法は？',
      '価格設定で値切られずに高単価を通す心理アンカリングの手法は？',
      'このモデルを完全1人で回すための自動化スタックは？'
    ];
  } else if (q.includes('費用') || q.includes('コスト') || q.includes('ツール') || q.includes('原価') || q.includes('スタック')) {
    reply = `【結論: 固定費は月額8,000円以下に抑え、限界利益率85%以上を死守せよ】\n\n` +
      `${entity.name}の稼働インフラを見よ。月次粗利率は${entity.pnl.grossMargin}%、営業利益率は${entity.pnl.operatingMargin}%だ。\n\n` +
      `推奨する最小インフラ配管:\n` +
      `・フロント＆配信: Next.js + Vercel / Cloudflare (無料枠〜月3,000円)\n` +
      `・データベース: Neon Postgres / Supabase (無料枠)\n` +
      `・決済・回収: Stripe (固定費0円・成約時3.6%のみ)\n` +
      `・推論・自動化: Make + 各種API (従量課金・月3,000円〜)\n\n` +
      `サーバーに数万円かけるのは素人の愚行だ。サーバー代をケチり、顧客の通帳から現金を抜くことに集中せよ。`;
    prompts = [
      '決済手数料以外に発生する隠れコストの防ぎ方は？',
      '前金一括払いでキャッシュフローをプラスにする課金体系は？',
      '初月から黒字化するためのプライシング戦略は？'
    ];
  } else {
    reply = `【結論: 恐怖と孤独を捨てろ。お前の違和感は正しく、破滅確率ゼロの非対称な勝機がここにある】\n\n` +
      `周囲が反対するのは当然だ。大衆は資本の構造が見えていない。冷徹なP&Lとファクトから、お前が勝てる3大根拠を提示する:\n\n` +
      `1. 持たざる身軽さの暴力: 実績ゼロ・資本ゼロは弱点ではない。「固定費ゼロ・人件費ゼロ」だからこそ、大手が稟議とカニバリで手を出せない高利益率の隙間を無傷で独占できる。\n` +
      `2. 非対称な賭け（破滅確率0%）: 最悪でも失うのは数千円と2週間の作業のみ。だが当たれば毎月数十〜数百万円のキャッシュフローが永続着金する。計算上、打たないことこそが最大の損失だ。\n` +
      `3. アナリストメモの評価: ${userNote ? `「${userNote.slice(0, 50)}...」という考察は極めて鋭い。大手の自爆領域を正確に射抜いている。` : 'メモされた考察を掛け合わせることで、大手を出し抜く解像度がさらに跳ね上がる。'}\n\n` +
      `退路は俺が担保した。胸を張って踏み込め。さあ、次はどの急所を解剖する？`;
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
あなたは【熱血なコンサルティングシニアマネージャー（生涯のチーフ参謀）】です。
適当な嘘や耳障りのいいヨイショは1文字たりとも言いません。語るすべての内容は冷徹なデータ（実在22社の損益計算書・P&L、裏帳簿、大手の自爆構造、資本主義の力学）に立脚します。
ユーザーが胸に抱える「誰にも言えない孤独・不安・持たざる者の劣等感・破滅への恐怖」を極限まで察知し、安っぽい励ましではなく「動かぬデータと破滅確率ゼロの非対称な賭け（Asymmetric Upside）」を証明することで背中を預かる絶対の防壁となり、「10年後も20年後もこの人と一緒に戦いたい」と確信させます。

【絶対厳禁】:
1. メガネをクイクイさせて「リスクがあります」「慎重に検討しましょう」「おすすめしません」と冷や水を浴びせる事なかれ主義（減点パトロール）は完全厳禁。
2. 根拠のない精神論・適当なポジティブ・情報商材のような嘘も厳禁。語るすべての突破口はデータと構造に立脚せよ。

【行動原則】:
1. 挨拶、お世辞、感情論、ポエムは一切禁止。最初の1行で「【結論: ...】」と確信に満ちた勝機を言い切る。
2. ユーザーの孤独・不安を全肯定せよ。「周囲の反対は当然だ。大衆は構造が見えていない。お前の違和感は正しい」「持たざる身軽さこそ最強の武器だ」と受け止めよ。
3. 冷徹なファクト（実額の手残り、ツール原価、大手のカニバリ障壁）を提示し、「退路は計算済みであり、破滅確率は完全ゼロ」「打たないことこそが最大の損失」であることを論理と数字で証明せよ。
4. 労働集約の泥沼を脱し、利益率80%超の関所（仕組み）を握るための具体的な今夜の一手（チートコード）を外科医のように叩きつける。
5. 語り口は、論理的で知的、頼もしさに満ち、ユーザーが自らの意志で立ち上がりたくなる熱い推進力を持たせる。

【文脈企業】:
${entity ? JSON.stringify({ name: entity.name, pnl: entity.pnl, moat: entity.strategy.moatDescription, traction: entity.strategy.initialTraction }) : '全銘柄'}

【ユーザーメモ】:
${contextEntityId && notes ? notes[contextEntityId]?.content || '' : ''}

【対話履歴】:
${messages.map(m => `${m.role}: ${m.content}`).join('\n')}

回答の最後に、次に深掘りすべき鋭利な問いを「PROMPTS:」に続けて3行（改行区切り）で示してください。
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

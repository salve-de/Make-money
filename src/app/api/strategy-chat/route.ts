import { readerContextText } from '@/shared/display-text';
import { parseStrategyRequest, parseSynthesizedIdeas } from '@/shared/strategy-schema';
import { NextRequest, NextResponse } from 'next/server';
import { CatalogUnavailableError, findReleaseEntity, readReleaseSummaries } from '@/lib/company-access/catalog-release';
import { filterToCatalog, isCatalogId } from '@/shared/catalog-membership';
import { SynthesizedIdea, StrategyChatMessage, FinancialEntity } from '@/platform/types/terminal';
import { queryD1, executeD1, batchD1 } from '@/lib/storage/d1';
import { verifyFirebaseIdToken } from '@/lib/firebase/server';
import { readJsonBody, RequestBodyTooLargeError } from '@/lib/api/input';
import { getRuntimeEnvValue } from '@/lib/runtime/cloudflare';
import { consumeRequestRateLimit } from '@/lib/security/rate-limit';
import { boundedGeminiText, callGeminiApi } from '@/lib/strategy/gemini';
import { sanitizeGeneratedText, sanitizeSynthesizedIdeas } from '@/lib/strategy/guidance-safety';

export const dynamic = 'force-dynamic';
const MAX_STRATEGY_REQUEST_BYTES = 1 * 1024 * 1024;
// 生成AI（Gemini）は呼ぶたびに費用が出る。ログインした本人ごとに、1時間あたりの回数を絞る。
const AI_CALL_LIMIT = 60;
const AI_CALL_WINDOW_MS = 60 * 60 * 1000;
const SAFETY_BOUNDARY_NOTICE = '公開事例は事実の記録として扱い、実行案は法令・各サービス規約・相手の同意を前提にします。根拠が不足する数値は未確認のまま検証します。';

/** 公開目録にある事例だけ。目録に無い ID は無かった扱い。 */
async function findCatalogEntity(id: string | undefined): Promise<FinancialEntity | null> {
  return id && isCatalogId(id) ? findReleaseEntity(id) : null;
}

// =========================================================================
// 内蔵アナリスト推論エンジン（Fallback Analyst Engine）
// Gemini APIキー未設定時でも、実在22社のデータとユーザーメモから高精度な3次元アイデアを即時合成
// =========================================================================
function generateFallbackSynthesis(
  selectedEntityIds: string[],
  notes: Record<string, { content: string; updatedAt: string }>,
  catalog: FinancialEntity[],
): SynthesizedIdea[] {
  const chosenEntities = filterToCatalog(catalog).filter((e) =>
    selectedEntityIds.includes(e.id)
  );
  if (catalog.length === 0) throw new CatalogUnavailableError('Catalog is empty');
  const relevantEntities = chosenEntities.length > 0 ? chosenEntities : catalog.slice(0, 3);
  
  // ユーザーのメモを統合
  const noteTexts = selectedEntityIds
    .map((id) => notes[id]?.content)
    .filter(Boolean) as string[];
  const combinedUserNote = noteTexts.join(' / ') || '特記事項なし（保存銘柄の構造を掛け合わせ）';

  const primaryEntity = relevantEntities[0];
  const secondaryEntity = relevantEntities[1] || catalog[1] || primaryEntity;

  // 1. 本能工夫型（人間の防衛本能・衝動）: 損失回避・怠惰・虚栄心を直撃する即効型
  const idea1: SynthesizedIdea = {
    id: `idea_savanna_${Date.now()}_1`,
    dimension: 'SAVANNA_INSTINCT',
    dimensionLabel: '① 本能工夫型（人間の防衛本能・衝動）',
    title: `${primaryEntity.name}を参考にした小規模な有料パイロット案`,
    targetPainWallet: `利用者のメモ（${combinedUserNote.slice(0, 40)}...）`,
    structuralArbitrage: `${primaryEntity.name}の出典付きの記録を起点に、対象業界の許可された接点で小さく検証し、成約・提供時間・原価を記録してから拡大する。`,
    projectedMonthlyProfitJpy: 1200000,
    operatingMargin: 78,
    requiredTools: [
      { name: 'Next.js + Stripe', monthlyCostJpy: 4500, purpose: '集金およびフロントエンド' },
      { name: 'Make / Supabase', monthlyCostJpy: 3000, purpose: 'バックエンド・通知の完全無人化' },
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

  // 3. 逆張り・盲点型（コペルニクス的転回）: 大手の自爆（既存売上の共食い）を突く奇襲モデル
  const idea3: SynthesizedIdea = {
    id: `idea_contrarian_${Date.now()}_3`,
    dimension: 'CONTRARIAN_BLINDSPOT',
    dimensionLabel: '③ 逆張り・盲点型（コペルニクス的転回）',
    title: `既存大手の自爆（既存売上の共食い）直撃: 【業界常識の真逆】を突く超高密度ソロSaaS`,
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
async function generateFallbackChatResponse(
  userQuery: string,
  contextEntityId?: string,
): Promise<{ content: string; suggestedActionPrompts: string[] }> {
  const entity = await findCatalogEntity(contextEntityId);
  const prompts = ['収益の仕組みを教えて', '利用ツールと費用を教えて', '初期の顧客獲得を教えて', '競争上の特徴を教えて'];
  if (!entity) return { content: '相談する事例を選択してください。', suggestedActionPrompts: [] };

  const q = userQuery.toLowerCase();
  // 事例の記録は entity.reader（出典つきの事実・数値・未確認）だけを使う
  const kinds: Array<NonNullable<typeof entity.reader>['facts'][number]['kind']> =
    /費用|コスト|ツール|原価|スタック/.test(q) ? ['TOOL']
      : /競合|真似|大手|防壁|moat|競争/.test(q) ? ['OTHER', 'EVENT']
        : /集客|顧客獲得|マーケ|トラクション/.test(q) ? ['CHANNEL']
          : ['DESCRIPTION', 'PRICING'];
  const context = readerContextText(entity.name, entity.reader, kinds);
  return {
    content: `${context ? sanitizeGeneratedText(context) : `${entity.name}の出典付きの記録はまだありません。`}`,
    suggestedActionPrompts: prompts,
  };
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
    const configuredApiKey = await getRuntimeEnvValue('GEMINI_API_KEY') || await getRuntimeEnvValue('GOOGLE_GENERATIVE_AI_API_KEY');
    if (configuredApiKey && !user) return NextResponse.json({ error: 'Authentication is required for AI analysis' }, { status: 401 });
    // 回数を数えられない間は、費用がかかる生成AIを呼ばず、内蔵の推論に切り替える。上限を超えたら 429。
    let apiKey = configuredApiKey;
    if (configuredApiKey && user) {
      let allowed = false;
      try {
        allowed = await consumeRequestRateLimit(req, 'strategy-chat-ai', { limit: AI_CALL_LIMIT, windowMs: AI_CALL_WINDOW_MS, subject: user.uid });
      } catch {
        apiKey = undefined;
        allowed = true;
      }
      if (!allowed) {
        const retryAfter = Math.ceil((AI_CALL_WINDOW_MS - (Date.now() % AI_CALL_WINDOW_MS)) / 1000);
        return NextResponse.json({ error: 'Too many AI requests' }, { status: 429, headers: { 'Retry-After': String(retryAfter) } });
      }
    }

    // 1. アイデア合成リクエスト (SYNTHESIZE)
    if (body.action === 'SYNTHESIZE') {
      const payload = body;
      const { selectedEntityIds, notes } = payload;

      // Gemini APIが利用可能な場合はAI推論を試みる
      if (apiKey) {
        try {
          const entitiesData = (await Promise.all(selectedEntityIds.map(findCatalogEntity)))
            .filter((e): e is FinancialEntity => e !== null);
          const prompt = `
あなたは事業調査を支援するアナリストです。選ばれた事例と利用者のメモから、根拠の範囲を保った企画仮説を3つ作ってください。利用者の目的や条件が明示されていない場合は、予算・運営人数・利益目標を勝手に設定しないでください。

【対象企業データ】:
${entitiesData.map((e) => readerContextText(e.name, e.reader) ?? `事例: ${e.name}（出典付きの記録なし）`).join('\n\n')}

【ユーザーのアナリストメモ（考察）】:
${JSON.stringify(notes, null, 2)}

【利用者の目的・条件】:
このリクエストでは明示されていません。保存・閲覧履歴から好みや目的を推定せず、今回の依頼、選択した事例、入力されたメモだけを起点にしてください。予算、運営人数、利益目標も勝手に補わないでください。

【出力要件】:
以下の3つの次元でアイデアをJSON配列として返してください。Markdownコードブロックは不要、純粋なJSONのみ。
1. SAVANNA_INSTINCT (本能工夫型): 顧客の損失回避・怠惰・虚栄心を突く即効モデル
2. META_ARCHITECT (構造・胴元型): 取引手数料や水門を握る独占モデル
3. CONTRARIAN_BLINDSPOT (逆張り・盲点型): 大手の自爆（既存売上の共食い）を突く奇襲モデル

【安全と根拠の境界】
- 法令・各サービス規約に反する手順、自作自演、迷惑DM、不正取得・不正スクレイピング、直取引の妨害、誤認表示は提案しない。
- 実行案は、正規チャネル、相手の明示同意、透明な料金・解約条件、データの持ち出し可能性を前提にする。
- 公開事実・推定・未確認を区別し、根拠のない売上・利益・成功保証を出力しない。

スキーマ:
[
  {
    "id": "idea_1",
    "dimension": "SAVANNA_INSTINCT",
    "dimensionLabel": "① 本能工夫型（人間の防衛本能・衝動）",
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
      const ideas = sanitizeSynthesizedIdeas(generateFallbackSynthesis(selectedEntityIds, notes, await readReleaseSummaries()));
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
          const entity = await findCatalogEntity(contextEntityId);
          const clientNote = contextEntityId && notes ? notes[contextEntityId]?.content || '' : '';
          const allNotesContext = [clientNote, dbAccumulatedNotes].filter(Boolean).join('\n\n');

          const prompt = `
あなたは事業調査を支援するアナリストです。自然で読みやすい日本語で、利用者の質問に直接答えてください。必要な専門用語は短く説明し、判断に使える情報を具体的に整理してください。

【対話スタンス】
1. 利用者が明示した目的・条件を優先し、書かれていない目標や事情を推測で固定しないでください。
2. 公開事実、報告値、推定、未確認を区別し、数字や成功可能性を根拠なしに断定しないでください。
3. 推奨を出すときは、根拠・成立条件・主要な代替案を添えてください。証拠が弱い場合も、結論を放棄せず暫定案と撤回条件を示してください。
4. 不足情報が結論を大きく変える場合に限って、短い確認質問を一つしてください。それ以外は前提を明記して進めてください。
5. お世辞や成功保証を使わず、自然で率直な文体にしてください。
${enableSearch ? '6. Google検索から得られた最新の市場・競合・トレンド情報を自然に織り交ぜて回答してください。' : ''}

【安全と根拠の境界】
法令・各サービス規約に反する手順、自作自演、迷惑DM、不正取得・不正スクレイピング、直取引の妨害、誤認表示は提案しないでください。実行案は正規チャネル、相手の明示同意、透明な料金・解約条件、データの持ち出し可能性を前提にしてください。公開事実・推定・未確認を区別し、根拠のない成功保証や売上・利益の断定は避けてください。

【出典付きの事例記録（参考実例）】:
${entity ? (readerContextText(entity.name, entity.reader) ?? `事例: ${entity.name}（出典付きの記録なし）`) : '事例は選択されていません'}

【DBおよび直近から蓄積されたアナリストメモ（ユーザーの視点）】:
${allNotesContext || '特記事項なし'}

【利用者の目的・条件】:
このリクエストでは明示されていません。保存・閲覧履歴から好みや目的を推定せず、今回の依頼、選択した事例、入力されたメモだけを起点にしてください。予算、運営人数、利益目標も勝手に補わないでください。

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
                'この案を支える登録情報と、確認できていない点を分けてください。',
                '想定する顧客や運営条件が変わると、どこを見直す必要がありますか？',
                '最小の試し方と、続けるか見直すかの判断材料を整理してください。'
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
      const { content, suggestedActionPrompts } = await generateFallbackChatResponse(lastUserMessage, contextEntityId);
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
    if (err instanceof CatalogUnavailableError) return NextResponse.json({ error: 'Catalog temporarily unavailable' }, { status: 503 });
    // 内部のエラー文（保存先の名前や接続情報を含みうる）は返さず、ログにだけ残す。
    console.error('Strategy Chat API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

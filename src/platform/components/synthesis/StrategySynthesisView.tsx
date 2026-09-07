'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { FinancialEntity, SynthesizedIdea, StrategyChatMessage } from '../../types/terminal';
import { 
  Send, 
  Bot, 
  User, 
  CheckSquare, 
  Square, 
  Layers, 
  ArrowRight, 
  RotateCcw, 
  FileText,
  Activity,
  Cpu,
  Bookmark
} from 'lucide-react';

interface StrategySynthesisViewProps {
  allEntities: FinancialEntity[];
  bookmarkedIds: Set<string>;
  notes: Record<string, { entityId: string; content: string; updatedAt: string }>;
  onSaveNote: (entityId: string, content: string) => void;
  currency: 'JPY' | 'USD';
  initialContextEntityId?: string | null;
}

export const StrategySynthesisView: React.FC<StrategySynthesisViewProps> = ({
  allEntities,
  bookmarkedIds,
  notes,
  onSaveNote,
  currency,
  initialContextEntityId,
}) => {
  // 保存銘柄（もし保存がなければ代表的3社をデフォルト表示）
  const savedEntities = useMemo(() => {
    const list = allEntities.filter((e) => bookmarkedIds.has(e.id));
    if (list.length > 0) return list;
    return allEntities.slice(0, 3);
  }, [allEntities, bookmarkedIds]);

  // 合成対象としてチェックされている企業ID群
  const [selectedEntityIds, setSelectedEntityIds] = useState<Set<string>>(() => {
    const initial = new Set(savedEntities.map((e) => e.id));
    if (initialContextEntityId && allEntities.some((e) => e.id === initialContextEntityId)) {
      initial.add(initialContextEntityId);
    }
    return initial;
  });

  // 編集中のアクティブ銘柄（左ペインでメモを入力・フォーカス中のもの）
  const [activeEditingEntityId, setActiveEditingEntityId] = useState<string>(
    initialContextEntityId || savedEntities[0]?.id || allEntities[0]?.id
  );

  // 合成アイデア一覧
  const [synthesizedIdeas, setSynthesizedIdeas] = useState<SynthesizedIdea[]>([]);
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [activeConsoleTab, setActiveConsoleTab] = useState<'IDEAS' | 'CHAT'>('IDEAS');

  // チャットログ
  const [chatMessages, setChatMessages] = useState<StrategyChatMessage[]>([
    {
      id: 'init_1',
      role: 'assistant',
      content: '実在企業の裏帳簿データ（P&L・手口・盲点）と、あなたが保存した銘柄・メモをスタンバイしました。\n\nいま頭にあるアイデア、業界の違和感、あるいは気になっている疑問など、何でも気軽にぶつけてください。否定せず、どうすれば勝てるか一緒に具体化していきましょう。',
      timestamp: new Date().toISOString(),
      suggestedActionPrompts: [
        '初期100人の集客を元手0円で完結させる具体的な手順は？',
        '大手が同じ機能をローンチしてきた場合の防衛線は？',
        'このビジネスモデルの月額固定費を1万円以下に抑える配管構成は？'
      ],
    }
  ]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isChatSending, setIsChatSending] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const toggleSelectEntity = (id: string) => {
    setSelectedEntityIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatMoney = (yen: number) => {
    if (currency === 'USD') {
      const usd = Math.round(yen / 150);
      if (usd >= 1000000) return `$${(usd / 1000000).toFixed(1)}M`;
      if (usd >= 1000) return `$${(usd / 1000).toFixed(0)}k`;
      return `$${usd}`;
    }
    if (yen >= 100000000) return `¥${(yen / 100000000).toFixed(1)}億`;
    if (yen >= 10000) return `¥${Math.round(yen / 10000)}万`;
    return `¥${yen.toLocaleString()}`;
  };

  // アイデア合成の実行
  const handleSynthesize = async () => {
    if (selectedEntityIds.size === 0) return;
    setIsSynthesizing(true);
    try {
      const res = await fetch('/api/strategy-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SYNTHESIZE',
          selectedEntityIds: Array.from(selectedEntityIds),
          notes,
        }),
      });
      const data = await res.json();
      if (data.ideas && Array.isArray(data.ideas)) {
        setSynthesizedIdeas(data.ideas);
        setActiveConsoleTab('IDEAS');
        // チャットにも報告を追加
        setChatMessages((prev) => [
          ...prev,
          {
            id: `msg_${Date.now()}`,
            role: 'assistant',
            content: `【多次元アイデア合成完了】\n選択された${selectedEntityIds.size}銘柄の財務構造とあなたのアナリストメモを交差させ、3つの別次元アプローチ（本能ハック型／構造胴元型／逆張り型）を抽出した。「アイデア調書」タブにて損益見込・ツール構成・初動手順を確認せよ。`,
            timestamp: new Date().toISOString(),
            suggestedActionPrompts: [
              'この中で一番初期費用が安く初動が速いアイデアはどれか？',
              '本能ハック型アイデアの初動ゲリラ戦法をさらに具体化せよ',
              '構造・胴元型モデルで決済手数料を抜く際の法的注意点は？'
            ]
          }
        ]);
      }
    } catch (e) {
      console.error('Synthesis failed:', e);
    } finally {
      setIsSynthesizing(false);
    }
  };

  // チャット送信
  const handleSendMessage = async (queryText?: string) => {
    const textToSend = queryText || chatInput;
    if (!textToSend.trim() || isChatSending) return;

    const userMsg: StrategyChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toISOString(),
      contextEntityId: activeEditingEntityId,
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setIsChatSending(true);

    try {
      const res = await fetch('/api/strategy-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CHAT',
          messages: [...chatMessages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          contextEntityId: activeEditingEntityId,
          synthesizedIdeas,
          notes,
        }),
      });
      const data = await res.json();
      if (data.message) {
        setChatMessages((prev) => [...prev, data.message]);
      }
    } catch (e) {
      console.error('Chat error:', e);
      setChatMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: '【通信エラー】アナリストエンジンとの接続に失敗した。再試行せよ。',
          timestamp: new Date().toISOString(),
        }
      ]);
    } finally {
      setIsChatSending(false);
    }
  };

  // 特定アイデアを深掘りチャットに持ち込む
  const handleDrilldownIdea = (idea: SynthesizedIdea) => {
    setActiveConsoleTab('CHAT');
    const prompt = `「${idea.title}」（${idea.dimensionLabel}）について深掘りしたい。人質にする財布「${idea.targetPainWallet}」に対し、大手が真似できない理由と、最初の3件を有料成約させる泥臭い実録ステップを冷徹に指南せよ。`;
    handleSendMessage(prompt);
  };

  const activeEntity = allEntities.find((e) => e.id === activeEditingEntityId) || savedEntities[0];

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-[#060709] text-zinc-300 font-sans">
      
      {/* =================================================================== */}
      {/* 左ペイン: 保存銘柄 ＆ アナリスト極秘メモ（インプット資材） */}
      {/* =================================================================== */}
      <div className="w-full md:w-[380px] lg:w-[420px] shrink-0 border-b md:border-b-0 md:border-r border-white/[0.08] flex flex-col bg-[#07080B] overflow-hidden">
        
        {/* ヘッダー */}
        <div className="p-3 border-b border-white/[0.06] bg-[#090A0E] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="font-mono text-xs font-bold text-white tracking-wider">
              INPUT_ASSETS: 保存銘柄 ＆ 考察
            </span>
          </div>
          <span className="font-mono text-[10px] text-zinc-500">
            {selectedEntityIds.size} / {savedEntities.length} 選択中
          </span>
        </div>

        {/* 銘柄一覧 ＆ メモ入力 */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-white/10">
          <div className="text-[11px] text-zinc-400 leading-relaxed font-sans pb-1">
            保存した銘柄の裏帳簿データに独自の着眼点（メモ）を掛け合わせることで、AIが競合の死角を突く独自ビジネスモデルを抽出します。
          </div>

          {savedEntities.map((ent) => {
            const isSelected = selectedEntityIds.has(ent.id);
            const isFocused = activeEditingEntityId === ent.id;
            const currentNote = notes[ent.id]?.content || '';

            return (
              <div
                key={ent.id}
                onClick={() => setActiveEditingEntityId(ent.id)}
                className={`p-3 rounded border transition-all cursor-pointer ${
                  isFocused
                    ? 'bg-[#0E1017] border-white/[0.2] shadow-lg ring-1 ring-white/10'
                    : 'bg-[#0A0B0F] border-white/[0.06] hover:border-white/[0.12]'
                }`}
              >
                {/* 銘柄ヘッダー */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectEntity(ent.id);
                      }}
                      className="text-zinc-400 hover:text-white transition-colors"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Square className="w-4 h-4 text-zinc-600" />
                      )}
                    </button>
                    <span className="font-mono text-xs font-bold text-white truncate">
                      {ent.ticker}
                    </span>
                    <span className="text-[11px] text-zinc-400 truncate">
                      {ent.name}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-emerald-400 font-bold shrink-0">
                    月利{formatMoney(ent.pnl.operatingProfit)} (率{ent.pnl.operatingMargin}%)
                  </span>
                </div>

                {/* 突いた盲点 */}
                <div className="text-[10px] font-mono text-zinc-500 mb-2 truncate">
                  盲点: {ent.strategy.blindspot}
                </div>

                {/* アナリスト極秘メモ入力欄 */}
                <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 mb-1">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3 text-zinc-400" />
                      あなたの独自考察・転用メモ
                    </span>
                    {currentNote && (
                      <span className="text-emerald-400/80 text-[9px]">保存済</span>
                    )}
                  </div>
                  <textarea
                    rows={isFocused ? 3 : 2}
                    value={currentNote}
                    onChange={(e) => onSaveNote(ent.id, e.target.value)}
                    placeholder="例: このAPIラッパーを士業の契約書レビューに応用できないか？ 初期の自演集客手法をXで再現する..."
                    className="w-full bg-[#060709] border border-white/[0.08] focus:border-white/[0.25] rounded p-2 text-[11px] font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none transition-colors resize-none leading-relaxed"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* 下部アクションバー: 合成トリガー */}
        <div className="p-3 border-t border-white/[0.08] bg-[#090A0E] shrink-0">
          <button
            onClick={handleSynthesize}
            disabled={isSynthesizing || selectedEntityIds.size === 0}
            className="w-full py-2.5 px-4 rounded bg-white/[0.1] hover:bg-white/[0.16] border border-white/[0.2] text-white font-mono text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-[0.99]"
          >
            <Cpu className="w-4 h-4 text-emerald-400" />
            {isSynthesizing ? (
              <span>多次元アイデアを合成中...</span>
            ) : (
              <span>選択 {selectedEntityIds.size} 銘柄とメモから独自アイデアを合成</span>
            )}
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 右ペイン: メインコンソール（アイデア調書 ＆ 冷徹な壁打ちチャット） */}
      {/* =================================================================== */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#060709]">
        
        {/* コンソール上部バー */}
        <div className="border-b border-white/[0.08] bg-[#08090D] p-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveConsoleTab('IDEAS')}
              className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all ${
                activeConsoleTab === 'IDEAS'
                  ? 'bg-white/[0.12] text-white border border-white/[0.2]'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              独自アイデア調書 ({synthesizedIdeas.length}件)
            </button>
            <button
              onClick={() => setActiveConsoleTab('CHAT')}
              className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all ${
                activeConsoleTab === 'CHAT'
                  ? 'bg-white/[0.12] text-white border border-white/[0.2]'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              戦略壁打ちチャット
            </button>
          </div>

          {activeEntity && (
            <div className="hidden sm:flex items-center gap-1.5 font-mono text-[10px] text-zinc-500 bg-white/[0.03] px-2.5 py-1 rounded border border-white/[0.06]">
              <span className="text-zinc-400">連動銘柄:</span>
              <span className="text-white font-bold">{activeEntity.ticker}</span>
              <span>({activeEntity.name})</span>
            </div>
          )}
        </div>

        {/* タブコンテンツ */}
        <div className="flex-1 overflow-hidden relative">

          {/* ============================================================= */}
          {/* 【タブ 1】 独自アイデア調書一覧 */}
          {/* ============================================================= */}
          {activeConsoleTab === 'IDEAS' && (
            <div className="h-full overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10">
              {synthesizedIdeas.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
                  <div className="w-12 h-12 rounded bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-500 mb-4">
                    <Layers className="w-6 h-6 text-zinc-400" />
                  </div>
                  <h3 className="font-mono text-sm font-bold text-white mb-2">
                    独自アイデアは未生成です
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans mb-6">
                    左ペインの保存銘柄にチェックを入れ、考察メモを入力して「独自アイデアを合成」を実行してください。サバンナOS・メタ構造・逆張りの3次元から即時抽出されます。
                  </p>
                  <button
                    onClick={handleSynthesize}
                    disabled={isSynthesizing}
                    className="py-2 px-4 rounded bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.15] text-white font-mono text-xs transition-colors cursor-pointer"
                  >
                    今すぐデフォルト銘柄から合成する
                  </button>
                </div>
              ) : (
                <div className="space-y-6 max-w-4xl mx-auto">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                    <div>
                      <h3 className="font-mono text-sm font-bold text-white">
                        SYNTHESIZED_ARBITRAGE_DOSSIERS
                      </h3>
                      <span className="text-[11px] text-zinc-500 font-mono">
                        保存企業の裏帳簿 × あなたの考察メモから抽出された多次元ビジネスモデル
                      </span>
                    </div>
                    <button
                      onClick={handleSynthesize}
                      disabled={isSynthesizing}
                      className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-white transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      再合成
                    </button>
                  </div>

                  {synthesizedIdeas.map((idea, idx) => (
                    <div
                      key={idea.id}
                      className="bg-[#090A0E] border border-white/[0.08] rounded p-5 space-y-4 shadow-xl"
                    >
                      {/* アイデア上部ヘッダー */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
                        <div>
                          <span className="font-mono text-[10px] text-zinc-400 bg-white/[0.06] px-2 py-0.5 rounded border border-white/[0.08] inline-block mb-1.5">
                            {idea.dimensionLabel}
                          </span>
                          <h4 className="text-sm font-bold text-white font-sans">
                            {idea.title}
                          </h4>
                        </div>

                        {/* 財務サマリー */}
                        <div className="flex items-center gap-3 shrink-0 font-mono">
                          <div className="text-right">
                            <span className="text-[9px] text-zinc-500 block">想定月次手残り</span>
                            <span className="text-xs font-bold text-emerald-400 tabular-nums">
                              {formatMoney(idea.projectedMonthlyProfitJpy)}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] text-zinc-500 block">想定営業利益率</span>
                            <span className="text-xs font-bold text-zinc-200 tabular-nums">
                              {idea.operatingMargin}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 狙う財布 ＆ 構造的歪み */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="bg-[#060709] p-3 rounded border border-white/[0.04]">
                          <span className="font-mono text-[10px] text-zinc-500 block mb-1">
                            人質にする財布・痛みの実態
                          </span>
                          <p className="text-zinc-300 text-[11px] leading-relaxed">
                            {idea.targetPainWallet}
                          </p>
                        </div>
                        <div className="bg-[#060709] p-3 rounded border border-white/[0.04]">
                          <span className="font-mono text-[10px] text-zinc-500 block mb-1">
                            突く市場の歪み・大手の自爆死角
                          </span>
                          <p className="text-zinc-300 text-[11px] leading-relaxed">
                            {idea.structuralArbitrage}
                          </p>
                        </div>
                      </div>

                      {/* 推奨ツールスタック */}
                      <div>
                        <span className="font-mono text-[10px] text-zinc-500 block mb-1.5">
                          最小稼働インフラ・配管構成
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {idea.requiredTools.map((tool, tIdx) => (
                            <div
                              key={tIdx}
                              className="bg-white/[0.02] border border-white/[0.04] p-2 rounded text-[11px] font-mono"
                            >
                              <div className="text-white font-bold truncate">{tool.name}</div>
                              <div className="text-zinc-500 text-[10px] truncate">{tool.purpose}</div>
                              <div className="text-emerald-400/80 text-[10px] mt-0.5">
                                月{formatMoney(tool.monthlyCostJpy)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 初動100人泥臭い手順 */}
                      <div>
                        <span className="font-mono text-[10px] text-zinc-500 block mb-1.5">
                          初動100人獲得の客観的ゲリラ戦法
                        </span>
                        <ul className="space-y-1 text-[11px] text-zinc-400 font-sans">
                          {idea.first100TractionPlaybook.map((step, sIdx) => (
                            <li key={sIdx} className="flex items-start gap-2">
                              <span className="font-mono text-[10px] text-zinc-500 shrink-0">
                                0{sIdx + 1}.
                              </span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* アクションボタン: 壁打ちに送る */}
                      <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between">
                        <span className="text-[10px] font-mono text-zinc-500 truncate">
                          着火剤メモ: {idea.userNoteInspiration || '保存銘柄データ'}
                        </span>
                        <button
                          onClick={() => handleDrilldownIdea(idea)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-xs font-mono text-white transition-colors cursor-pointer"
                        >
                          <span>このアイデアを壁打ちする</span>
                          <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============================================================= */}
          {/* 【タブ 2】 戦略壁打ちチャットコンソール */}
          {/* ============================================================= */}
          {activeConsoleTab === 'CHAT' && (
            <div className="h-full flex flex-col overflow-hidden">
              
              {/* メッセージスクロール領域 */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
                {chatMessages.map((msg) => {
                  const isAssistant = msg.role === 'assistant';
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-3 max-w-3xl ${
                        isAssistant ? 'mr-auto' : 'ml-auto flex-row-reverse'
                      }`}
                    >
                      {/* アバター */}
                      <div
                        className={`w-7 h-7 rounded shrink-0 flex items-center justify-center font-mono text-xs ${
                          isAssistant
                            ? 'bg-white/[0.06] border border-white/[0.1] text-emerald-400'
                            : 'bg-white/[0.15] border border-white/[0.2] text-white'
                        }`}
                      >
                        {isAssistant ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      </div>

                      {/* 本文吹き出し */}
                      <div className="space-y-2 min-w-0 max-w-2xl">
                        <div
                          className={`p-3.5 rounded border text-xs leading-relaxed font-sans whitespace-pre-wrap ${
                            isAssistant
                              ? 'bg-[#0A0B0F] border-white/[0.08] text-zinc-200'
                              : 'bg-white/[0.08] border-white/[0.15] text-white'
                          }`}
                        >
                          {msg.content}
                        </div>

                        {/* サジェストプロンプト */}
                        {isAssistant && msg.suggestedActionPrompts && msg.suggestedActionPrompts.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {msg.suggestedActionPrompts.map((promptText, pIdx) => (
                              <button
                                key={pIdx}
                                onClick={() => handleSendMessage(promptText)}
                                className="text-[10px] font-mono text-zinc-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] px-2.5 py-1 rounded transition-colors text-left cursor-pointer"
                              >
                                {promptText}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {isChatSending && (
                  <div className="flex gap-3 max-w-3xl mr-auto">
                    <div className="w-7 h-7 rounded shrink-0 flex items-center justify-center bg-white/[0.06] border border-white/[0.1] text-emerald-400">
                      <Activity className="w-4 h-4 animate-spin" />
                    </div>
                    <div className="p-3 rounded bg-[#0A0B0F] border border-white/[0.08] text-xs font-mono text-zinc-400">
                      アナリスト推論中...
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* チャット入力バー */}
              <div className="p-3 md:p-4 border-t border-white/[0.08] bg-[#08090D] shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2 max-w-3xl mx-auto"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="アイデアの壁打ち・大手の死角・最小固定費について質問（Shift+Enterで改行）..."
                    className="flex-1 bg-[#060709] border border-white/[0.1] focus:border-white/[0.25] rounded p-2.5 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || isChatSending}
                    className="p-2.5 rounded bg-white/[0.1] hover:bg-white/[0.18] border border-white/[0.15] text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

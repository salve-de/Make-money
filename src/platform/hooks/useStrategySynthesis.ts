'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { FinancialEntity, SynthesizedIdea, StrategyChatMessage } from '../types/terminal';
import { buildUserInterestProfile, UserInterestProfile } from '../utils/userProfile';

interface UseStrategySynthesisProps {
  allEntities: FinancialEntity[];
  bookmarkedIds: Set<string>;
  viewedEntityIds?: string[];
  notes: Record<string, { entityId: string; content: string; updatedAt: string }>;
  currency: 'JPY' | 'USD';
  initialContextEntityId?: string | null;
}

export function useStrategySynthesis({
  allEntities,
  bookmarkedIds,
  viewedEntityIds = [],
  notes,
  currency,
  initialContextEntityId,
}: UseStrategySynthesisProps) {
  const [conversationId] = useState<string>(() => `conv_${Date.now()}`);

  // ユーザーの保存銘柄 ＆ 閲覧履歴から「好み・関心傾向」を自動プロファイリング
  const userProfile = useMemo<UserInterestProfile>(() => {
    return buildUserInterestProfile(allEntities, bookmarkedIds, viewedEntityIds);
  }, [allEntities, bookmarkedIds, viewedEntityIds]);

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
      content: '実在企業の財務・戦略データ（売上原価・手残り率・現場ツール・大手の盲点）をスタンバイしました。\n\nいま考えている事業アイデア（例: ○○業界向けSaaS、○○の自動化代行など）を1行投げてみてください。大手の自爆構造に巻き込まれないか、利益率80%を叩き出す勝ち筋、月数千円で組める最小稼働インフラを冷徹に検証します。',
      timestamp: new Date().toISOString(),
      suggestedActionPrompts: [
        '町工場の受発注・紙図面をLINEとOCRで自動化する代行モデル',
        '士業向けに契約書の定型チェックをAPIラッピングで提供するマイクロSaaS',
        '不動産会社向けに図面をノーコードで自動補正するツール'
      ],
    }
  ]);
  const [chatInput, setChatInput] = useState<string>('');
  const [ideaInput, setIdeaInput] = useState<string>('');
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
          userProfile,
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
            content: `【多次元アイデア合成完了】\n選択された${selectedEntityIds.size}銘柄の財務構造と、あなたの閲覧・保存傾向（${userProfile.profileSummary.slice(0, 50)}...）を掛け合わせ、3つの別次元アプローチ（本能工夫型／構造胴元型／逆張り型）を抽出しました。「アイデア調書」タブにて損益見込・ツール構成・初動手順を確認してください。`,
            timestamp: new Date().toISOString(),
            suggestedActionPrompts: [
              'この中で一番初期費用が安く初動が速いアイデアはどれか？',
              '本能工夫型アイデアの初動ゲリラ戦法をさらに具体化せよ',
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
      // Event handler: the message ID is created when the user sends, never during render.
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
          conversationId,
          messages: [...chatMessages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          contextEntityId: activeEditingEntityId,
          synthesizedIdeas,
          notes,
          userProfile,
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

  return {
    userProfile,
    savedEntities,
    selectedEntityIds,
    toggleSelectEntity,
    activeEditingEntityId,
    setActiveEditingEntityId,
    synthesizedIdeas,
    isSynthesizing,
    activeConsoleTab,
    setActiveConsoleTab,
    chatMessages,
    chatInput,
    setChatInput,
    ideaInput,
    setIdeaInput,
    isChatSending,
    messagesEndRef,
    formatMoney,
    handleSynthesize,
    handleSendMessage,
    handleDrilldownIdea,
    activeEntity,
  };
}

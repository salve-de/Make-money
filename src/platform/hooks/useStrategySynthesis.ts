'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { FinancialEntity, SynthesizedIdea, StrategyChatMessage } from '../types/terminal';
import { useAuth } from '@/context/AuthContext';

interface UseStrategySynthesisProps {
  allEntities: FinancialEntity[];
  bookmarkedIds: Set<string>;
  notes: Record<string, { entityId: string; content: string; updatedAt: string }>;
  currency: 'JPY' | 'USD';
  initialContextEntityId?: string | null;
}

export function useStrategySynthesis({
  allEntities,
  bookmarkedIds,
  notes,
  currency,
  initialContextEntityId,
}: UseStrategySynthesisProps) {
  const { token } = useAuth();
  const [conversationId] = useState<string>(() => `conv_${Date.now()}`);

  // 保存銘柄（もし保存がなければ代表的3社をデフォルト表示）
  const savedEntities = useMemo(() => {
    const list = allEntities.filter((e) => bookmarkedIds.has(e.id) || e.id === initialContextEntityId);
    if (bookmarkedIds.size > 0 || initialContextEntityId) return list;
    return allEntities.slice(0, 3);
  }, [allEntities, bookmarkedIds, initialContextEntityId]);

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

  const touchedSelection = useRef(false);
  useEffect(() => {
    if (touchedSelection.current) return;
    setSelectedEntityIds(new Set([
      ...savedEntities.map((entity) => entity.id),
      ...(initialContextEntityId ? [initialContextEntityId] : []),
    ]));
  }, [savedEntities, initialContextEntityId]);

  // 合成アイデア一覧
  const [synthesizedIdeas, setSynthesizedIdeas] = useState<SynthesizedIdea[]>([]);
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [activeConsoleTab, setActiveConsoleTab] = useState<'IDEAS' | 'CHAT'>('IDEAS');

  // チャットログ
  const [chatMessages, setChatMessages] = useState<StrategyChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [ideaInput, setIdeaInput] = useState<string>('');
  const [isChatSending, setIsChatSending] = useState<boolean>(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const toggleSelectEntity = (id: string) => {
    touchedSelection.current = true;
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
    setRequestError(null);
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch('/api/strategy-chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'SYNTHESIZE',
          selectedEntityIds: Array.from(selectedEntityIds),
          notes,
        }),
      });
      const data: unknown = await res.json();
      if (!res.ok) throw new Error(readStrategyError(data, 'アイデア合成に失敗しました'));
      if (!data || typeof data !== 'object' || !('ideas' in data) || !Array.isArray(data.ideas)) {
        throw new Error('アイデア合成の応答形式を確認できません');
      }
      const ideas = data.ideas as SynthesizedIdea[];
      setSynthesizedIdeas(ideas);
      setActiveConsoleTab('IDEAS');
      // チャットにも報告を追加
      setChatMessages((prev) => [
        ...prev,
        {
          id: `msg_${Date.now()}`,
          role: 'assistant',
          content: `選択した事例${selectedEntityIds.size}件をもとに、企画案を${ideas.length}件作成しました。案に表示する利益・費用・手順は実績ではなく、検証前の仮説です。「着想元」から参照した事例を開いて、情報の時点や根拠を確認できます。`,
          timestamp: new Date().toISOString(),
          suggestedActionPrompts: [
            'この案の利益や費用は、何をもとにした数字？',
            '利用者がこの課題をどう解決しているか、最初に何を確かめる？',
            '小さく試す場合の費用と、続けないと決める条件を整理して'
          ]
        }
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'アイデア合成に失敗しました';
      console.error('Synthesis failed:', error);
      setRequestError(message);
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
    setRequestError(null);

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch('/api/strategy-chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'CHAT',
          conversationId,
          messages: [...chatMessages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          contextEntityId: activeEditingEntityId,
          synthesizedIdeas,
          notes,
        }),
      });
      const data: unknown = await res.json();
      if (!res.ok) throw new Error(readStrategyError(data, 'アナリストとの通信に失敗しました'));
      if (!data || typeof data !== 'object' || !('message' in data) || !data.message || typeof data.message !== 'object') {
        throw new Error('アナリストの応答形式を確認できません');
      }
      setChatMessages((prev) => [...prev, data.message as StrategyChatMessage]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'アナリストとの通信に失敗しました';
      console.error('Chat error:', error);
      setRequestError(message);
      // Keep a failed request editable; it is not an assistant response or
      // part of the successfully submitted conversation history.
      setChatMessages((prev) => prev.filter((entry) => entry.id !== userMsg.id));
      setChatInput((current) => current || textToSend.trim());
    } finally {
      setIsChatSending(false);
    }
  };

  // 特定アイデアを深掘りチャットに持ち込む
  const handleDrilldownIdea = (idea: SynthesizedIdea) => {
    setActiveConsoleTab('CHAT');
    const prompt = `「${idea.title}」について検討したい。想定する利用者の課題、現在の代替手段、費用と収入の前提、最初にできる小規模な確認方法、うまくいかない条件を整理してください。選択した事例から分かること、一般的な推測、まだ分からないことを分け、根拠がない場合は断定しないでください。`;
    handleSendMessage(prompt);
  };

  const activeEntity = allEntities.find((e) => e.id === activeEditingEntityId) || savedEntities[0];

  return {
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
    requestError,
  };
}

function readStrategyError(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string') {
    return payload.error.slice(0, 240);
  }
  return fallback;
}

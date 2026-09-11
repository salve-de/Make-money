'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnalystNote } from '../types/terminal';

const STORAGE_KEY = 'make_money_analyst_notes_v1';

// 初期デフォルトメモ（ユーザーが最初に開いた時にも世界観と使い方が1秒で理解できるサンプル）
const INITIAL_SAMPLE_NOTES: Record<string, AnalystNote> = {
  ent_photoai: {
    entityId: 'ent_photoai',
    content: 'ReplicateのモデルAPIを自撮り特化で薄くラップしているだけだが、写真館の「3万円の羞恥心」を「月額3,000円の無人完結」にすり替えている点が秀逸。この構図を【士業の契約書レビュー】や【中古車の傷査定】に転用できないか？',
    updatedAt: new Date().toISOString(),
  },
  ent_keyence: {
    entityId: 'ent_keyence',
    content: '工場長の「ライン停止恐怖（損失回避）」を突いて相見積もりを無力化。製造は100%外部委託（ファブレス）で粗利80%。この「恐怖切除＋直販コンサル」をAIセキュリティ診断の領域で1人運用できないか？',
    updatedAt: new Date().toISOString(),
  },
  ent_outbid: {
    entityId: 'ent_outbid',
    content: 'eBayのラスト1秒入札代行。ツール構成はVPSとPythonスクリプトのみで原価ほぼ0円。人間が睡眠中に負けたくない強欲を突いて成功報酬2%を抜く「水門モデル」。メルカリやオークション横断で同等の自動化が作れる。',
    updatedAt: new Date().toISOString(),
  }
};

export function useAnalystNotes() {
  const [notes, setNotes] = useState<Record<string, AnalystNote>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // 初回マウント時にlocalStorageから復元
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Restore browser storage after hydration; server rendering cannot read localStorage.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setNotes(parsed);
      } else {
        // 初期サンプルを投入
        setNotes(INITIAL_SAMPLE_NOTES);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SAMPLE_NOTES));
      }
    } catch (e) {
      console.error('Failed to load analyst notes:', e);
      setNotes(INITIAL_SAMPLE_NOTES);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // メモの保存・更新
  const saveNote = useCallback((entityId: string, content: string) => {
    setNotes((prev) => {
      const updated = {
        ...prev,
        [entityId]: {
          entityId,
          content,
          updatedAt: new Date().toISOString(),
        },
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to persist analyst note:', e);
      }
      return updated;
    });
  }, []);

  // 特定銘柄のメモ取得
  const getNote = useCallback(
    (entityId: string): string => {
      return notes[entityId]?.content || '';
    },
    [notes]
  );

  // 全メモ配列の取得
  const allNotesList = Object.values(notes).filter((n) => n.content.trim().length > 0);

  return {
    notes,
    allNotesList,
    getNote,
    saveNote,
    isLoaded,
  };
}

'use client';

import React, { useState } from 'react';

interface SubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SubmissionModal: React.FC<SubmissionModalProps> = ({
  isOpen,
  onClose
}) => {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    founderName: '',
    url: '',
    monthlyRevenue: '',
    teamSize: '1',
    category: 'MICRO_SAAS',
    pitch: '',
    contactEmail: ''
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 font-sans select-none animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-[#111317] border border-white/[0.12] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* ヘッダー */}
        <div className="px-6 py-4 bg-[#141720] border-b border-white/[0.08] flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono text-emerald-400 font-bold tracking-wider">
              SELF-SERVE LISTING APPLICATION
            </div>
            <h2 className="text-sm sm:text-base font-bold text-zinc-100 mt-0.5">
              高収益ビジネス台帳への掲載申請（自薦・審査制）
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 text-lg leading-none p-1 transition-colors"
          >
            ✕
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center space-y-4 font-sans">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto text-xl font-bold">
              ✓
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">掲載審査の受付を完了しました</h3>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-md mx-auto">
                ご入力いただいたメールアドレス宛に審査状況（通常24〜48時間以内）および掲載決済リンクをご案内いたします。
              </p>
            </div>
            <button
              onClick={() => {
                setSubmitted(false);
                onClose();
              }}
              className="h-8 px-5 bg-zinc-200 hover:bg-white text-zinc-900 text-xs font-bold rounded transition-colors"
            >
              閉じる
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs font-sans">
            <p className="text-zinc-300 leading-relaxed text-[11px]">
              自社のプロダクトや事業を本プラットフォームに掲載し、起業家・事業買収者・提携先への露出を拡大できます。掲載には財務および実績データの審査（掲載枠：30,000円）がございます。
            </p>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400 text-[11px] block font-medium">企業名 / サービス名 *</label>
                  <input
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="例: outbid.lol"
                    className="w-full h-8 px-2.5 bg-[#161822] border border-white/10 rounded text-zinc-200 text-xs focus:outline-hidden focus:border-emerald-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-400 text-[11px] block font-medium">創業者名 / 運営者名 *</label>
                  <input
                    type="text"
                    required
                    value={formData.founderName}
                    onChange={(e) => setFormData({ ...formData, founderName: e.target.value })}
                    placeholder="例: 山田太郎"
                    className="w-full h-8 px-2.5 bg-[#161822] border border-white/10 rounded text-zinc-200 text-xs focus:outline-hidden focus:border-emerald-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400 text-[11px] block font-medium">サービスURL *</label>
                  <input
                    type="url"
                    required
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder="https://example.com"
                    className="w-full h-8 px-2.5 bg-[#161822] border border-white/10 rounded text-zinc-200 text-xs focus:outline-hidden focus:border-emerald-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-400 text-[11px] block font-medium">直近月商規模（概算） *</label>
                  <input
                    type="text"
                    required
                    value={formData.monthlyRevenue}
                    onChange={(e) => setFormData({ ...formData, monthlyRevenue: e.target.value })}
                    placeholder="例: 月商 150万円"
                    className="w-full h-8 px-2.5 bg-[#161822] border border-white/10 rounded text-zinc-200 text-xs focus:outline-hidden focus:border-emerald-400"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 text-[11px] block font-medium">事業の本質（誰の何の痛みをどう解決しているか） *</label>
                <textarea
                  required
                  rows={3}
                  value={formData.pitch}
                  onChange={(e) => setFormData({ ...formData, pitch: e.target.value })}
                  placeholder="例: 地方の美容室向けに、LINEのみで完結する自動予約・リピート配信ツールを月額5,000円で提供。"
                  className="w-full p-2.5 bg-[#161822] border border-white/10 rounded text-zinc-200 text-xs focus:outline-hidden focus:border-emerald-400 leading-relaxed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 text-[11px] block font-medium">ご連絡先メールアドレス *</label>
                <input
                  type="email"
                  required
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  placeholder="contact@example.com"
                  className="w-full h-8 px-2.5 bg-[#161822] border border-white/10 rounded text-zinc-200 text-xs focus:outline-hidden focus:border-emerald-400"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
              <span className="text-[11px] text-zinc-500 font-mono">
                審査通過時のみ掲載料が発生します
              </span>
              <button
                type="submit"
                className="h-8 px-5 bg-zinc-200 hover:bg-white text-zinc-900 font-bold rounded text-xs transition-colors"
              >
                審査を申請する（無料） →
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

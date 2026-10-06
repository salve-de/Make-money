'use client';

import { useEffect } from 'react';
import { whenAnalyticsAllowed } from '@/lib/legal/consent';
import { connectAnalytics, getAnalyticsToken, type AnalyticsDocument } from '@/lib/ops/analytics';

/**
 * アクセス解析の読み込み役。画面には何も出さない。layout の Providers の中に 1 つ置く。
 * 同意前・トークン未設定のときは何も読み込まない。
 */
export function AnalyticsLoader() {
  useEffect(
    () => connectAnalytics({
      whenAnalyticsAllowed,
      doc: typeof document === 'undefined' ? null : (document as unknown as AnalyticsDocument),
      token: getAnalyticsToken(),
    }),
    [],
  );
  return null;
}

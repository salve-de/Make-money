import React from 'react';

/** 事例名の横に出す「決済確認」の印。色の丸や枠は使わず、文字だけで示す。 */
export function VerifiedMark() {
  return (
    <span className="shrink-0 text-xs font-normal text-term-positive" title="運営者の決済データ（Stripe）で売上を確認済み">
      決済確認
    </span>
  );
}

import React from 'react';
import { UI } from '@/shared/ui-strings';

/** 事例名の横に出す「決済確認」の印。色の丸や枠は使わず、文字だけで示す。 */
export function VerifiedMark() {
  return (
    <span className="shrink-0 text-xs font-normal text-term-positive" title={UI.VERIFIED_MARK_TITLE}>
      {UI.VERIFIED_MARK}
    </span>
  );
}

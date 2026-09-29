import React from 'react';

const MONEY_PATTERN = /^(約?[−-]?[\d.,]+)(億円|万円|円)$/;

/** "1,620万円" のような金額文字列を、等幅の数値＋小さな単位に分けて出す。形式が違えばそのまま出す。 */
export function MoneyText({ text, className = '' }: { text: string; className?: string }) {
  const match = text.match(MONEY_PATTERN);
  if (!match) return <span className={className}>{text}</span>;
  return (
    <span className={className}>
      {match[1]}
      <span className="ml-0.5 font-sans text-xs text-term-label">{match[2]}</span>
    </span>
  );
}

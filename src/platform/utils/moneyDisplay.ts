/**
 * 画面に出す円金額の書き方を一か所にまとめる。
 * 1万円以上は「万円」、1億円以上は「億円」で表し、数値と単位を分けて返す
 * （端末UIでは数値を等幅・右揃え、単位を小さく添えるため）。
 */
export interface YenParts {
  /** 数値部分（例: "1,620"、"1.5"） */
  value: string;
  /** 単位（"円" | "万円" | "億円"） */
  unit: '円' | '万円' | '億円';
}

export function yenParts(amountJpy: number): YenParts {
  const abs = Math.abs(amountJpy);
  const sign = amountJpy < 0 ? '−' : '';
  if (abs >= 100_000_000) {
    const oku = abs / 100_000_000;
    const value = oku >= 10 ? Math.round(oku).toLocaleString('ja-JP') : (Math.round(oku * 10) / 10).toString();
    return { value: `${sign}${value}`, unit: '億円' };
  }
  if (abs >= 10_000) {
    return { value: `${sign}${Math.round(abs / 10_000).toLocaleString('ja-JP')}`, unit: '万円' };
  }
  return { value: `${sign}${Math.round(abs).toLocaleString('ja-JP')}`, unit: '円' };
}

/** "1,620万円" のような1つの文字列。推定値は approx で「約」を付ける。 */
export function formatYen(amountJpy: number, options: { approx?: boolean } = {}): string {
  const { value, unit } = yenParts(amountJpy);
  return `${options.approx ? '約' : ''}${value}${unit}`;
}

/** 一覧の「月商 万円」列のように単位を列見出しへ出すときの数値だけの表記。 */
export function formatManYenValue(amountJpy: number): string {
  return Math.round(amountJpy / 10_000).toLocaleString('ja-JP');
}

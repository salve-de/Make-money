export function formatJpy(amount: number): string {
  if (amount >= 100000000) {
    const oku = Math.floor(amount / 100000000);
    const man = Math.floor((amount % 100000000) / 10000);
    return man > 0 ? `${oku}億${man.toLocaleString()}万円` : `${oku}億円`;
  }
  if (amount >= 10000) {
    const man = Math.floor(amount / 10000);
    return `${man.toLocaleString()}万円`;
  }
  return `¥${amount.toLocaleString()}`;
}

export function formatNumber(num: number): string {
  return num.toLocaleString();
}

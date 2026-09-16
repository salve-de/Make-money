const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const mainDocument = (body) => {
  const article = String(body).match(/<article\b[\s\S]*?<\/article>/i)?.[0] ?? String(body);
  return article.split(/read\s+this\s+next|related\s*:|<footer\b/i, 1)[0];
};

export const strip = (body) => mainDocument(body)
  .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#x27;|&#39;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/\s+/g, ' ')
  .toLowerCase();

const profitWord = /profit|profits|take.?home|net income|net profit|gross profit|operating profit/gi;
const excludedContext = [
  /doesn['’]t\s+(?:mention|say|reveal|show)[^.]{0,120}\bprofit\b/i,
  /(?:not|isn['’]t|is\s+not|without)[^.]{0,60}\bprofit\b/i,
  /\b(?:estimated|estimates|estimate|could|might|may|probably|likely|suspect|doubt|maybe|as much as|up to)[^.]{0,90}(?:earnings|revenue|income)\b/i,
  /\b(?:earnings|revenue|income)\b[^.]{0,90}\b(?:estimated|estimates|estimate|could|might|may|probably|likely|suspect|doubt|maybe|as much as|up to)\b/i,
  /met\s+(?:a|an|some)\s+[^.]{0,100}(?:who|that)[^.]{0,100}\bprofit\b/i,
  /\b(?:someone|another\s+(?:person|business|site)|other\s+(?:people|business|site))\b[^.]{0,100}\bprofit\b/i,
];

const hasRevenueBinding = (context, variant) => {
  const amount = escapeRegExp(variant);
  return new RegExp(`(?:${amount}\\s+(?:revenue|sales|turnover|income)|(?:revenue|sales|turnover)\\s*[:=]?\\s*${amount})`, 'i').test(context);
};

export const variants = (metric) => {
  const original = String(metric.original ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
  const amount = Number(metric.amount);
  const currency = metric.currency === 'USD' ? '\\$' : metric.currency === 'GBP' ? '£' : metric.currency === 'EUR' ? '€' : metric.currency === 'JPY' ? '[¥￥]' : '';
  const out = new Set([original]);
  if (Number.isFinite(amount) && currency) {
    out.add(`${currency}${Number.isInteger(amount) ? amount.toLocaleString('en-US') : amount}`);
    if (amount >= 1000 && amount < 1_000_000) out.add(`${currency}${(amount / 1000).toLocaleString('en-US', { maximumFractionDigits: 2 })}k`);
    if (amount >= 1_000_000) out.add(`${currency}${(amount / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 2 })}m`);
  }
  return [...out].map((value) => value.replace(/\\\$/g, '$')).filter((value) => value.length > 1);
};

export const findExplicitProfitEvidence = (body, metric) => {
  if (!/PROFIT|MARGIN|利益|TAKE.?HOME|NET.?INCOME/i.test(String(metric.unit))) return null;
  for (const variant of variants(metric)) {
    let position = body.indexOf(variant);
    while (position >= 0) {
      const start = Math.max(0, position - 120);
      const end = Math.min(body.length, position + variant.length + 120);
      const context = body.slice(start, end);
      if (hasRevenueBinding(context, variant)) {
        position = body.indexOf(variant, position + 1);
        continue;
      }
      for (const match of context.matchAll(profitWord)) {
        const wordPosition = start + (match.index ?? 0);
        const distance = wordPosition < position ? position - wordPosition : wordPosition - (position + variant.length);
        if (distance > 80) continue;
        if (excludedContext.some((pattern) => pattern.test(context))) continue;
        return { original: metric.original, unit: metric.unit, source: metric.source, variant, keyword: match[0], distance, context };
      }
      position = body.indexOf(variant, position + 1);
    }
  }
  return null;
};

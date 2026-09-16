import { readFileSync } from 'node:fs';

const entities = JSON.parse(readFileSync('data/entities-index.json', 'utf8'));

const junkSnippets = [
  '特化型業務ソリューション',
  '手作業による工数浪費と自社AI開発の失敗に怯え',
  '巨大ITが汎用APIの提供に留まる中',
  '現場の非',
  '切実な財布の',
  'Next.js × OpenAI/Claude推論API × Stripe Billing'
];

for (const snippet of junkSnippets) {
  const fields = new Map();
  let totalHits = 0;
  for (const e of entities) {
    for (const [k, v] of Object.entries(e)) {
      const s = JSON.stringify(v);
      if (s && s.includes(snippet)) {
        totalHits++;
        fields.set(k, (fields.get(k) || 0) + 1);
      }
    }
  }
  console.log(`Snippet: "${snippet}" | Total Hits: ${totalHits}`);
  for (const [f, c] of fields.entries()) {
    console.log(`  - ${f}: ${c}`);
  }
}

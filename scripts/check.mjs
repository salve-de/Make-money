import { access, readFile } from 'node:fs/promises';
import { categories, demands, opportunities, services, signals } from '../src/data.js';
import { gapStrength, opportunityScore } from '../src/core.js';

const requiredFiles = [
  'index.html',
  'styles/app.css',
  'src/app.js',
  'src/data.js',
  'src/core.js',
  'manifest.webmanifest',
  'sw.js',
  'supabase/migrations/001_initial_schema.sql',
  'README.md'
];

const errors = [];

for (const file of requiredFiles) {
  try {
    await access(new URL(`../${file}`, import.meta.url));
  } catch {
    errors.push(`Missing required file: ${file}`);
  }
}

function validateUnique(collection, label) {
  const seen = new Set();
  for (const item of collection) {
    if (!item.id) errors.push(`${label} has an item without id`);
    if (seen.has(item.id)) errors.push(`${label} has duplicate id: ${item.id}`);
    seen.add(item.id);
  }
}

validateUnique(categories, 'categories');
validateUnique(opportunities, 'opportunities');
validateUnique(services, 'services');
validateUnique(signals, 'signals');
validateUnique(demands, 'demands');

const categoryIds = new Set(categories.map((item) => item.id));
const opportunityIds = new Set(opportunities.map((item) => item.id));
const serviceIds = new Set(services.map((item) => item.id));
const signalIds = new Set(signals.map((item) => item.id));
const demandIds = new Set(demands.map((item) => item.id));

for (const opportunity of opportunities) {
  if (!categoryIds.has(opportunity.category)) errors.push(`Unknown category on ${opportunity.id}`);
  if (opportunityScore(opportunity) < 0 || opportunityScore(opportunity) > 100) errors.push(`Invalid score on ${opportunity.id}`);
  for (const id of opportunity.signalIds || []) if (!signalIds.has(id)) errors.push(`${opportunity.id} references missing signal ${id}`);
  for (const id of opportunity.serviceIds || []) if (!serviceIds.has(id)) errors.push(`${opportunity.id} references missing service ${id}`);
  for (const id of opportunity.demandIds || []) if (!demandIds.has(id)) errors.push(`${opportunity.id} references missing demand ${id}`);
}

for (const service of services) {
  if (!categoryIds.has(service.category)) errors.push(`Unknown category on ${service.id}`);
  for (const id of service.opportunityIds || []) if (!opportunityIds.has(id)) errors.push(`${service.id} references missing opportunity ${id}`);
}

for (const signal of signals) {
  if (!categoryIds.has(signal.category)) errors.push(`Unknown category on ${signal.id}`);
  for (const id of signal.opportunityIds || []) if (!opportunityIds.has(id)) errors.push(`${signal.id} references missing opportunity ${id}`);
}

for (const demand of demands) {
  if (!categoryIds.has(demand.category)) errors.push(`Unknown category on ${demand.id}`);
  const strength = gapStrength(demand, demand.serviceIds.length);
  if (strength < 0 || strength > 100) errors.push(`Invalid gap score on ${demand.id}`);
  for (const id of demand.opportunityIds || []) if (!opportunityIds.has(id)) errors.push(`${demand.id} references missing opportunity ${id}`);
  for (const id of demand.serviceIds || []) if (!serviceIds.has(id)) errors.push(`${demand.id} references missing service ${id}`);
}

const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');
for (const reference of ['./styles/app.css', './src/app.js', './manifest.webmanifest']) {
  if (!index.includes(reference)) errors.push(`index.html is missing ${reference}`);
}

const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
if (app.includes('javascript:')) errors.push('Unsafe javascript: URL found in app.js');
if (!app.includes('escapeHTML')) errors.push('app.js does not use output escaping');

if (errors.length) {
  console.error('\nValidation failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Validated ${opportunities.length} opportunities, ${signals.length} signals, ${services.length} services, and ${demands.length} demands.`);

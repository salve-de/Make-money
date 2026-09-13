import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const canonicalUnknownIds = ['ent_photoai', 'ent_clubhouse_audio', 'ent_quibi_failure'];
const financialStatuses = new Set(['VERIFIED', 'REPORTED', 'ESTIMATED', 'POST_MORTEM', 'UNAVAILABLE']);
const unconfirmedFinancialFlags = [
  'isRevenueUnconfirmed',
  'isOperatingProfitUnconfirmed',
  'isMarginUnconfirmed',
  'isGrossProfitUnconfirmed',
  'isGrossMarginUnconfirmed',
  'isCogsUnconfirmed',
  'isCostsUnconfirmed',
  'isNetProfitUnconfirmed',
];

export function checkIndexSafety(index) {
  const errors = [];
  const ids = new Map();
  const names = new Map();

  if (!Array.isArray(index)) return ['data/entities-index.json must contain an array'];

  for (const entity of index) {
    if (!entity || typeof entity !== 'object') {
      errors.push('data/entities-index.json contains a non-object entity');
      continue;
    }
    const id = typeof entity.id === 'string' ? entity.id : '';
    const name = typeof entity.name === 'string' ? entity.name.trim().toLowerCase() : '';
    if (!id) errors.push('entity is missing id');
    else if (ids.has(id)) errors.push(`duplicate entity id: ${id}`);
    else ids.set(id, entity.name || '');
    if (!name) errors.push(`${id || 'entity'} is missing name`);
    else if (names.has(name)) errors.push(`duplicate entity name: ${entity.name}`);
    else names.set(name, id);

    const pnl = entity.pnl;
    const status = pnl?.financialStatus;
    if (!financialStatuses.has(status)) {
      errors.push(`${id || entity.name}: financialStatus must be one of ${[...financialStatuses].join(', ')}`);
    } else {
      const sourceDoc = typeof pnl.sourceDoc === 'string' && pnl.sourceDoc.trim();
      if (!sourceDoc) errors.push(`${id || entity.name}: ${status} financial record requires sourceDoc`);
      if (status === 'ESTIMATED' && !(typeof pnl.estimationLogic === 'string' && pnl.estimationLogic.trim())) {
        errors.push(`${id || entity.name}: ESTIMATED financial record requires estimationLogic`);
      }
      const hasUnconfirmedValue = unconfirmedFinancialFlags.some((flag) => pnl[flag] === true);
      if (status === 'VERIFIED' && hasUnconfirmedValue) {
        errors.push(`${id || entity.name}: verified financial record cannot contain unconfirmed fields`);
      }
      if (status === 'UNAVAILABLE' && !hasUnconfirmedValue) {
        errors.push(`${id || entity.name}: UNAVAILABLE financial record requires an explicit unconfirmed field`);
      }
    }
  }

  for (const id of canonicalUnknownIds) {
    const entity = index.find((candidate) => candidate?.id === id);
    if (!entity) {
      errors.push(`canonical unknown entity missing: ${id}`);
      continue;
    }
    const pnl = entity.pnl || {};
    if (pnl.isRevenueUnconfirmed !== true) errors.push(`${id}: revenue provenance was promoted without review`);
    if (pnl.isMarginUnconfirmed !== true) errors.push(`${id}: margin provenance was promoted without review`);
  }

  return errors;
}

export function checkIndexFile(file = path.join(root, 'data/entities-index.json')) {
  try {
    return checkIndexSafety(JSON.parse(readFileSync(file, 'utf8')));
  } catch (error) {
    return [`could not read ${path.relative(root, file)}: ${error.message}`];
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = checkIndexFile();
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.log('Entity index safety and provenance guards passed.');
  }
}

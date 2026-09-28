import {existsSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';

const read = path => JSON.parse(readFileSync(path, 'utf8'));
const save = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2) + '\n', {flag: 'wx'});
const fingerprint = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

// A recorded request without a response may already have incurred a charge.
// Never retry it automatically, and never silently reuse another prompt's result.
export async function runStoredStage(directory, name, input, execute) {
  if (!/^[a-z][a-z0-9-]*$/.test(name)) throw Error('Invalid stage name');
  const inputPath = join(directory, `${name}.input.json`);
  const resultPath = join(directory, `${name}.json`);
  if (existsSync(inputPath)) {
    const previous = read(inputPath);
    if (fingerprint(previous) !== fingerprint(input)) {
      throw Error(`INPUT_CHANGED: ${name}; retain old results and use a new versioned stage for changed input`);
    }
    if (existsSync(resultPath)) return read(resultPath);
    throw Error(`OUTCOME_UNKNOWN: ${name}; request recorded without response, no automatic paid retry`);
  }
  if (existsSync(resultPath)) throw Error(`MISSING_INPUT: ${name}; cannot establish result provenance`);
  save(inputPath, input); // exclusive create also prevents concurrent duplicate calls
  try {
    const result = await execute();
    save(resultPath, result);
    return result;
  } catch (error) {
    // Do not persist provider messages: these can contain request or credential data.
    const httpStatus = Number.isInteger(error?.httpStatus) ? error.httpStatus : null;
    save(join(directory, `${name}.failure.json`), {
      status: httpStatus ? 'http_error' : 'outcome_unknown',
      httpStatus,
      providerCode: /^[A-Z_]+$/.test(error?.providerCode ?? '') ? error.providerCode : null,
      usageKnown: false,
      recordedAt: new Date().toISOString(),
    });
    throw error;
  }
}

export function collectStageUsage(directory) {
  const calls = readdirSync(directory).filter(name => name.endsWith('.input.json')).sort().map(file => {
    const stage = file.slice(0, -'.input.json'.length);
    const input = read(join(directory, file));
    const responsePath = join(directory, `${stage}.json`);
    const response = existsSync(responsePath) ? read(responsePath) : null;
    const usage = response?.usageMetadata;
    const completeUsage = usage && ['promptTokenCount','candidatesTokenCount'].every(field=>Number.isSafeInteger(usage[field]) && usage[field]>=0);
    return {
      stage, model: response?.modelVersion ?? input.model ?? null,
      status: response ? (completeUsage ? 'usage_recorded' : usage ? 'usage_incomplete' : 'usage_missing') : 'outcome_unknown',
      finishReason: response?.candidates?.[0]?.finishReason ?? null,
      usage: usage ?? null,
      searchQueries: response ? (response.candidates?.[0]?.groundingMetadata?.webSearchQueries?.length ?? null) : null,
    };
  });
  return {
    calls, invoiceVerified: false,
    hasUnknownUsage: calls.some(call => call.status !== 'usage_recorded'),
    // No implicit zero for missing usage and no fixed provider price in the ledger.
    totalsOfReportedUsage: calls.reduce((sum, call) => {
      for (const field of ['promptTokenCount', 'cachedContentTokenCount', 'candidatesTokenCount', 'thoughtsTokenCount', 'totalTokenCount']) {
        if (typeof call.usage?.[field] === 'number') sum[field] = (sum[field] ?? 0) + call.usage[field];
      }
      return sum;
    }, {}),
  };
}

export function snapshotStageUsage(directory) {
  const report = collectStageUsage(directory);
  const path = join(directory, `usage-ledger-${fingerprint(report).slice(0, 16)}.json`);
  if (!existsSync(path)) save(path, report);
  return {path, report};
}

import {resolve} from 'node:path';

export function parseRunOptions(args) {
  const result = {enrichOnly: false, convertOnly: false};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--enrich') { result.enrichOnly = true; continue; }
    if (arg === '--convert-only') { result.convertOnly = true; continue; }
    const key = {'--subject': 'subject', '--run-id': 'runId', '--dir': 'directory'}[arg];
    if (key) {
      const value = args[++i];
      if (!value || value.startsWith('--') || result[key]) throw Error(`Invalid or duplicate ${arg}`);
      result[key] = value;
    } else if (!arg.startsWith('--') && !result.directory) result.directory = arg;
    else throw Error(`Unexpected argument: ${arg}`);
  }
  if (!result.directory) throw Error('Explicit --dir required; each collection run needs its own directory');
  if (result.enrichOnly && result.convertOnly) throw Error('Cannot combine --enrich and --convert-only');
  result.directory = resolve(result.directory);
  if (result.runId && !/^run_[a-zA-Z0-9_-]+$/.test(result.runId)) throw Error('Invalid --run-id');
  return result;
}

export function resolveRunIdentity(options, contract, legacyRunId) {
  const subject = options.subject ?? contract?.subject;
  const runId = options.runId ?? contract?.run_id ?? legacyRunId;
  if (!subject?.trim() || !runId) throw Error('New runs require --subject and --run-id');
  if (!/^run_[a-zA-Z0-9_-]+$/.test(runId)) throw Error('Invalid run identity');
  if (contract && (contract.subject !== subject || (contract.run_id ?? legacyRunId) !== runId)) {
    throw Error('RUN_IDENTITY_CONFLICT: do not mix subjects or run IDs in one directory');
  }
  return {subject, runId};
}

// Provider grammar is derived from the existing Foundation schema. The original
// schema and application validation remain authoritative after generation.
export function providerBundleSchema(schema, dimensions) {
  function visit(node) {
    if (typeof node !== 'object' || node === null) return node;
    if (node.$ref) {
      if (!node.$ref.startsWith('#/$defs/')) throw Error('External schema reference unsupported');
      return visit(schema.$defs[node.$ref.slice('#/$defs/'.length)]);
    }
    const output = {};
    const alternatives = node.anyOf ?? node.oneOf;
    if (alternatives) {
      const branches = alternatives.map(visit);
      if (branches.every(branch => typeof branch.type === 'string')) {
        output.type = [...new Set(branches.map(branch => branch.type))];
        const format = branches.find(branch => branch.format)?.format;
        if (format) output.format = format;
      } else throw Error('Complex union requires explicit provider adaptation');
    }
    for (const key of ['type', 'title', 'description', 'enum', 'format', 'minimum', 'maximum', 'minItems', 'maxItems', 'required']) {
      if (node[key] !== undefined) output[key] = node[key];
    }
    if (node.const !== undefined) output.enum = [node.const];
    if (output.enum && !output.type) output.type = typeof output.enum[0];
    if (node.pattern) output.description = `${output.description ?? ''} Must match ${node.pattern}`.trim();
    if (node.properties) output.properties = Object.fromEntries(Object.entries(node.properties).map(([key, value]) => [key, visit(value)]));
    if (node.items) output.items = visit(node.items);
    if (node.additionalProperties !== undefined) output.additionalProperties = visit(node.additionalProperties);
    return output;
  }
  const result = visit(schema);
  result.required = [...new Set([...result.required, 'money_signals', 'collection_coverage'])];
  const coverage = result.properties.collection_coverage;
  // The live Flash-Lite grammar rejects the large dimension enum combined
  // with this bundle. Keep names in the prompt and enforce exact membership,
  // uniqueness and completeness in auditBundleLinks instead of weakening it.
  coverage.items.properties.dimension.description = `One of the ${dimensions.length} supplied coverage dimension names. Each must occur exactly once.`;
  coverage.items.required = ['dimension', 'status', 'note', 'attempts', 'record_refs'];
  // Gemini emits in schema property order. Records must precede their coverage
  // references, otherwise the model plans references before producing records.
  const order=['schema_version','run_id','purpose','subject','agent','retrieved_at','sources','evidence','entities','claims','metrics','money_signals','events','relationships','derived','observations','quality','collection_coverage'];
  result.properties=Object.fromEntries([...order,...Object.keys(result.properties).filter(key=>!order.includes(key))].filter(key=>result.properties[key]).map(key=>[key,result.properties[key]]));
  return result;
}

export function auditBundleLinks(bundle, dimensions, expectedRunId, observedQueries) {
  const errors = [];
  if (bundle.run_id !== expectedRunId) errors.push('run_id mismatch');
  const fields = {sources:'source_id', evidence:'evidence_id', entities:'entity_id', claims:'claim_id', metrics:'metric_id', money_signals:'money_signal_id', events:'event_id', relationships:'relationship_id', derived:'derived_id'};
  const ids = {};
  for (const [field, key] of Object.entries(fields)) {
    ids[field] = new Set();
    for (const row of bundle[field] ?? []) {
      if (ids[field].has(row[key])) errors.push(`${field}: duplicate ${key}`);
      ids[field].add(row[key]);
    }
  }
  for (const field of [...Object.keys(fields), 'observations']) {
    for (const [index,row] of (bundle[field] ?? []).entries()) {
      for (const [key,target] of [['source_id','sources'],['entity_id','entities'],['subject_entity_id','entities'],['payer_entity_id','entities'],['receiver_entity_id','entities']]) {
        if (row[key] && fields[field] !== key && !ids[target].has(row[key])) errors.push(`${field}/${index}: dangling ${key}`);
      }
      for (const [key,target] of [['evidence_ids','evidence'],['entity_ids','entities'],['supporting_claim_ids','claims'],['supporting_evidence_ids','evidence']]) {
        for (const id of row[key] ?? []) if (!ids[target].has(id)) errors.push(`${field}/${index}: dangling ${key}`);
      }
      if (row.verification_status && row.verification_status !== 'UNVERIFIED') errors.push(`${field}/${index}: model cannot independently approve facts`);
    }
  }
  const seen = new Set();
  const queries = observedQueries === undefined ? null : new Set(observedQueries.map(query => query.trim()));
  for (const row of bundle.collection_coverage ?? []) {
    if (seen.has(row.dimension) || !dimensions.includes(row.dimension)) errors.push(`invalid coverage dimension: ${row.dimension}`);
    seen.add(row.dimension);
    for (const attempt of row.attempts ?? []) {
      if (queries && !queries.has(attempt.trim())) errors.push(`${row.dimension}: search attempt not present in provider execution evidence`);
    }
    if (row.status === 'found' && !row.record_refs?.length) errors.push(`${row.dimension}: found without retained record`);
    for (const ref of row.record_refs ?? []) {
      const match = /^(entities|claims|metrics|money_signals|events|relationships|derived|observations|sources|evidence)\/(\d+)$/.exec(ref);
      if (!match || !bundle[match[1]]?.[Number(match[2])]) errors.push(`${row.dimension}: dangling record_ref`);
    }
    if (['unknown','attempted_unavailable'].includes(row.status) && !row.attempts?.some(attempt => typeof attempt === 'string' && attempt.trim())) errors.push(`${row.dimension}: missing actual attempts`);
  }
  for (const dimension of dimensions) if (!seen.has(dimension)) errors.push(`missing dimension: ${dimension}`);
  return errors;
}

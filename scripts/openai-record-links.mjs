export function linkExtractedRecords(records, dimensions, allowedUrls) {
  const result=structuredClone(records);
  for(const field of ['claims','metrics','coverage'])if(!Array.isArray(result[field]))throw Error('RECORD_ARRAY_REQUIRED');
  const corrections=[];
  const marginTypes={gross_profit:'gross_margin',operating_profit:'operating_margin',net_profit:'net_margin'};
  result.metrics.forEach((row,index)=>{
    if(['percent','%','percentage'].includes(row.unit)&&marginTypes[row.metric_type]){
      corrections.push({path:`metrics/${index}/metric_type`,before:row.metric_type,after:marginTypes[row.metric_type],reason:'Percentage unit denotes a margin, not a monetary profit.'});
      row.metric_type=marginTypes[row.metric_type];
    }
  });
  for(const row of [...result.claims,...result.metrics]){
    if(!Array.isArray(row.dimensions)||row.dimensions.some(d=>!dimensions.includes(d)))throw Error('INVALID_RECORD_DIMENSIONS');
    if(!Array.isArray(row.source_urls)||row.source_urls.some(url=>!allowedUrls.has(url)))throw Error('UNKNOWN_SOURCE_URL');
  }
  if(result.coverage.length!==dimensions.length||new Set(result.coverage.map(c=>c.dimension)).size!==dimensions.length||result.coverage.some(c=>!dimensions.includes(c.dimension)))throw Error('COVERAGE_MISMATCH');
  for(const row of result.coverage){
    row.claim_indexes=result.claims.flatMap((r,i)=>r.dimensions.includes(row.dimension)?[i]:[]);
    row.metric_indexes=result.metrics.flatMap((r,i)=>r.dimensions.includes(row.dimension)?[i]:[]);
    if(row.status==='found'&&!row.claim_indexes.length&&!row.metric_indexes.length)throw Error('FOUND_WITHOUT_RECORD');
  }
  return {records:result,corrections};
}

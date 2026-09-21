import { expect, it } from 'vitest';
import { candidateArtifactManifest } from './candidate-artifact-manifest';
const prefix = 'staging/r2-queue/2026/09/20/candidates/run_example';
it('deduplicates explicit manifest and write-log references', () => {
  expect(candidateArtifactManifest({ run_id: 'run_example', recorded_items: { state: 'VALIDATED_FOR_R2_HANDOFF', count: 2, artifact_paths: [prefix+'/a.json'] },
    write_log: [{ path: prefix+'/a.json', operation: 'create', bundle_count: 2 }] })).toEqual({ entries: [{path:prefix+'/a.json',count:2}],expectedTotal:2 });
});
it('supports directory/file manifests and nested write logs', () => {
  expect(candidateArtifactManifest({run_id:'run_example',recorded_items:{state:'VALIDATED_FOR_R2_HANDOFF',count:2,artifact_directory:prefix,artifact_files:['a.json','b.json']},write_log:{candidate_writes:[{path:prefix+'/b.json'}]}}).entries).toHaveLength(2);
});
it('keeps complete inline candidates ahead of tentative artifact write plans', () => {
  expect(candidateArtifactManifest({recorded_items:[{state:'VALIDATED_FOR_R2_HANDOFF',Entity:{name:'Example'},Evidence:{id:'ev_fact'}}],write_log:[{path:prefix+'/missing.json',operation:'create'}]}).entries).toEqual([]);
});
it('rejects traversal, foreign runs and inconsistent counts without inferring anything', () => {
  for (const path of [prefix+'/../secret.json',prefix.replace('run_example','run_other')+'/a.json']) {
    expect(()=>candidateArtifactManifest({run_id:'run_example',write_log:[{path,operation:'create'}]})).toThrow();
  }
  expect(()=>candidateArtifactManifest({write_log:[{path:prefix+'/a.json',bundle_count:1},{path:prefix+'/a.json',bundle_count:2}]})).toThrow('Conflicting');
  expect(candidateArtifactManifest({write_log:[{path:prefix+'/a.json',result:'FAILED'}]}).entries).toEqual([]);
});

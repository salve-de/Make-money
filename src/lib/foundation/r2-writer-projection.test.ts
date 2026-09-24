import {afterEach,expect,it,vi} from 'vitest';
import {createHash} from 'node:crypto';
const project=vi.hoisted(()=>vi.fn());
const publicProject=vi.hoisted(()=>vi.fn());
vi.mock('./make-money-view',()=>({
  buildMakeMoneyPublicProjection:publicProject,
  materializeMakeMoneyViews:project,
}));
import worker,{projectBundleForUI} from '../../../r2-writer/worker';

afterEach(()=>{
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  project.mockReset();
  publicProject.mockReset();
});
it.each([true,false])('repairs historical UI projection, complete=%s, without rewriting source objects',async complete=>{
  const queue='staging/r2-queue/2026/09/21/run_projection.json';
  const base='staging/automation/receipts/r2_writer/2026/09/21/run_projection-receipt.json';
  const key='datasets/ds.business.research-bundles.derived/v1/2026/09/21/run_projection.json';
  const bundle={schema_version:'research-bundle.v1',run_id:'run_projection'};
  const body=new TextEncoder().encode(JSON.stringify(bundle));
  const files=new Map<string,unknown>([[queue,{schema_version:'r2-queue-run.v1',run_id:'run_projection',finished_at:'2026-09-21T00:00:00Z'}],[base,{status:'SUCCESS',r2:{objects:[{role:'research_bundle',key,bytes:body.length,sha256:createHash('sha256').update(body).digest('hex')}]}}]]);
  vi.stubGlobal('fetch',vi.fn(async(input:string|URL|Request,init?:RequestInit)=>{
    const url=new URL(typeof input==='string'||input instanceof URL?input:input.url);
    if(url.pathname.includes('/git/trees/'))return Response.json({tree:[...files.keys()].map(path=>({type:'blob',path}))});
    const path=decodeURIComponent(url.pathname.split('/contents/')[1]||'');
    if(init?.method==='PUT'){expect(files.has(path)).toBe(false);files.set(path,JSON.parse(Buffer.from(JSON.parse(String(init.body)).content,'base64').toString('utf8')));return Response.json({},{status:201});}
    return files.has(path)?Response.json({encoding:'base64',content:Buffer.from(JSON.stringify(files.get(path))).toString('base64')}):new Response(null,{status:404});
  }));
  publicProject.mockImplementation(async(bundle)=>({
    bundle,
    assessment:{status:'ALLOWED',allowedEvidenceIds:[],heldEvidenceIds:[],reasons:[]},
  }));
  project.mockResolvedValue({complete,created:1,unresolved_entity_ids:complete?[]:['pending']});
  const bucket={head:vi.fn(),get:vi.fn(async()=>({arrayBuffer:async()=>body.slice().buffer})),put:vi.fn()};
  const log=vi.spyOn(console,'log').mockImplementation(()=>{});
  await worker.scheduled({scheduledTime:0,cron:'20 * * * *'},{FOUNDATION_R2_LAKE:bucket,FOUNDATION_R2_RAW:bucket,FOUNDATION_R2_RESTRICTED:bucket,FOUNDATION_R2_PUBLIC:bucket,FOUNDATION_R2_WRITER_ENABLED:'true',FOUNDATION_GITHUB_TOKEN:'test',FOUNDATION_R2_WRITER_VERSION:'test.v13'});
  expect(publicProject).toHaveBeenCalledWith(bundle);
  expect(project).toHaveBeenCalledWith(bundle);expect(bucket.put).not.toHaveBeenCalled();expect(files.size).toBe(3);
  expect(JSON.parse(log.mock.calls.at(-1)![0]).status).toBe(complete?'SUCCESS':'DEFERRED_UI_PROJECTION');
});


it('never materializes a rights-held canonical bundle in the R2 writer UI path',async()=>{
  const bundle={schema_version:'research-bundle.v1',run_id:'run_private',retrieved_at:'2026-09-21T00:00:00Z'};
  const bucket={head:vi.fn(),get:vi.fn(),put:vi.fn()};
  publicProject.mockResolvedValue({
    bundle:null,
    assessment:{
      status:'RIGHTS_HELD',
      allowedEvidenceIds:[],
      heldEvidenceIds:['ev_private'],
      reasons:['unreviewed source'],
    },
  });
  const result=await projectBundleForUI(bundle,{
    FOUNDATION_R2_LAKE:bucket,
    FOUNDATION_R2_RAW:bucket,
    FOUNDATION_R2_RESTRICTED:bucket,
    FOUNDATION_R2_PUBLIC:bucket,
  } as never);
  expect(publicProject).toHaveBeenCalledWith(bundle);
  expect(project).not.toHaveBeenCalled();
  expect(result).toMatchObject({
    status:'RIGHTS_HELD',
    complete:true,
    attempted:0,
    created:0,
    commercial_publication:{status:'RIGHTS_HELD'},
  });
});

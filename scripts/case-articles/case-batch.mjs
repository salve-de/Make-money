/**
 * Import/export portable multi-case article batches.
 * No R2, GitHub Actions, deployment or publication.
 * Run with: node --import tsx scripts/case-articles/case-batch.mjs import --from <unzipped-batch> --preview
 */
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {existsSync,readFileSync,writeFileSync,readdirSync,mkdirSync,cpSync,rmSync,lstatSync} from 'node:fs';
import {resolve,join,sep} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {checkArticleDir,listArticleIds} from './lib.ts';

const ROOT=resolve(fileURLToPath(new URL('../../',import.meta.url)));
const CANON=join(ROOT,'data/case-articles');
const PREVIEW=join(ROOT,'.catalog-release-preview');
const GEN=[join(ROOT,'data/case-articles.json'),join(ROOT,'data/entity-additions/gen5-case-articles.json')];
const ID=/^ent_[a-z0-9][a-z0-9_]{2,96}$/;
const HASH=/^[0-9a-f]{64}$/;
const args=process.argv.slice(2).filter(x=>x!=='--');
const flag=name=>{const i=args.indexOf(name);return i<0?null:args[i+1]};
const has=name=>args.includes(name);
const sha=b=>createHash('sha256').update(b).digest('hex');
const err=msg=>{throw Error('[case-batch] '+msg)};
const store=(p,j)=>writeFileSync(p,JSON.stringify(j,null,1)+'\n');
const safe=p=>typeof p==='string'&&p.length>0&&!p.startsWith('/')&&!p.includes('\\')&&p.split('/').every(x=>x&&x!=='.'&&x!=='..');
function file(root,name){
  if(!safe(name))err('unsafe file name '+name);
  const base=resolve(root),dest=resolve(base,name);
  if(!dest.startsWith(base+sep))err('path escape '+name);
  let cur=base;
  for(const part of name.split('/')){
    cur=join(cur,part);
    if(!existsSync(cur)||lstatSync(cur).isSymbolicLink())err('missing/symlink file '+name);
  }
  if(!lstatSync(dest).isFile())err('not a plain file '+name);
  return dest;
}
function paths(dir,prefix=''){
  return readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
    if(e.isSymbolicLink())err('symlink not allowed '+prefix+e.name);
    const name=prefix+e.name;
    if(e.isDirectory())return paths(join(dir,e.name),name+'/');
    if(!e.isFile())err('non-regular item '+name);
    return [name];
  }).sort();
}
function verifyBatch(root){
  const m=JSON.parse(readFileSync(file(root,'manifest.json'),'utf8'));
  if(m.schema!=='make-money.case-batch.v1'||!/^[a-z0-9][a-z0-9-]{1,90}$/.test(m.batchId||''))err('invalid manifest');
  if(!Array.isArray(m.cases)||m.cases.length===0||m.cases.length>1000)err('invalid case count');
  const ids=new Set();
  for(const c of m.cases){
    if(!ID.test(c.entityId||'')||ids.has(c.entityId))err('duplicate/invalid ID '+c.entityId);
    ids.add(c.entityId);
    if(!c.files||typeof c.files!=='object'||Array.isArray(c.files))err('files missing');
    const names=Object.keys(c.files).sort();
    if(!names.includes('article.json')||!names.includes('research.json'))err('article/research required');
    const base='cases/'+c.entityId;
    const found=paths(resolve(root,base));
    if(JSON.stringify(names)!==JSON.stringify(found))err('files not described in manifest '+c.entityId);
    for(const name of names){
      if(!['article.json','research.json','README.md'].includes(name)&&!/^figures\/[a-z0-9-]+\.svg$/.test(name))err('unapproved file '+name);
      if(!HASH.test(c.files[name])||sha(readFileSync(file(root,base+'/'+name)))!==c.files[name])err('checksum failure '+base+'/'+name);
    }
    const raw=JSON.parse(readFileSync(file(root,base+'/article.json'),'utf8'));
    if(raw.entityId!==c.entityId||raw.reviewState==='approved')err('ID mismatch or unauthorized approval '+c.entityId);
    for(const f of raw.figures||[])if(!names.includes('figures/'+f.file))err('missing figure manifest entry');
    const checked=checkArticleDir(resolve(root,'cases'),c.entityId);
    if(!checked.built||checked.violations.length)err('invalid '+c.entityId+': '+checked.violations.slice(0,5).map(x=>x.rule+':'+x.detail).join('; '));
  }
  return m;
}
function run(stage,script,extra=[],env={}){
  const r=spawnSync(process.execPath,['--import','tsx',script,...extra],{cwd:ROOT,stdio:'inherit',env:{...process.env,...env}});
  if(r.status!==0)err(stage+' failed (code '+r.status+')');
}
function showPreview(ids){
  const p=JSON.parse(readFileSync(join(PREVIEW,'current.json'),'utf8'));
  if(!HASH.test(p.manifestHash||''))err('bad preview manifest hash');
  const m=JSON.parse(gunzipSync(readFileSync(join(PREVIEW,p.manifestHash+'.json.gz'))));
  for(const id of ids)if(!Object.hasOwn(m.details||{},id))err('not in local catalog: '+id);
  console.log('[case-batch] local preview ready. Open MAKEMONEY with CATALOG_RELEASE_DIR='+PREVIEW);
  for(const id of ids)console.log('  http://127.0.0.1:3100/?entity='+encodeURIComponent(id));
}
function rebuild(preview=false,ids=[]){
  run('build article display','scripts/case-articles/build.ts');
  run('build article identity records','scripts/case-articles/add-records.ts');
  if(preview){
    run('build local-only catalog','scripts/prepare-catalog-release.ts',['--preview-articles','--out',PREVIEW],{CATALOG_RELEASE_DIR:PREVIEW});
    showPreview(ids);
  }
}
function doImport(){
  const from=flag('--from');if(!from)err('use import --from <unzipped-directory> [--preview] [--check-only]');
  const root=resolve(from),batch=verifyBatch(root);
  const ids=batch.cases.map(c=>c.entityId),toCopy=[];
  for(const c of batch.cases){
    const dst=join(CANON,c.entityId),source=join(root,'cases',c.entityId);
    if(existsSync(dst)){
      const old=paths(dst),expected=Object.keys(c.files).sort();
      if(JSON.stringify(old)!==JSON.stringify(expected))err('existing directory differs: '+c.entityId);
      for(const [name,hash] of Object.entries(c.files))if(sha(readFileSync(file(dst,name)))!==hash)err('existing article differs: '+c.entityId);
    }else toCopy.push({dst,source});
  }
  console.log('[case-batch] '+batch.batchId+' cases='+ids.length+' new='+toCopy.length+' identical='+(ids.length-toCopy.length));
  if(has('--check-only'))return;
  const prev=GEN.map(path=>({path,bytes:existsSync(path)?readFileSync(path):null}));
  const created=[];
  try{
    mkdirSync(CANON,{recursive:true});
    for(const c of toCopy){cpSync(c.source,c.dst,{recursive:true,errorOnExist:true,force:false});created.push(c.dst)}
    rebuild(has('--preview'),ids);
    console.log('[case-batch] imported; reviewState unchanged; no R2 or public deployment');
  }catch(e){
    for(const p of created)rmSync(p,{force:true,recursive:true});
    for(const x of prev){if(x.bytes===null)rmSync(x.path,{force:true});else writeFileSync(x.path,x.bytes)}
    throw e;
  }
}
function doExport(){
  const ids=(flag('--ids')||'').split(',').map(s=>s.trim()).filter(Boolean);
  const dir=flag('--out'),batchId=flag('--batch-id')||'manual-batch-export';
  if(!ids.length||!dir)err('use export --ids id,id --out <directory> [--batch-id name]');
  if(!/^[a-z0-9][a-z0-9-]{1,90}$/.test(batchId))err('bad batchId');
  const root=resolve(dir);if(existsSync(root)&&readdirSync(root).length)err('destination must be empty');
  mkdirSync(root,{recursive:true});
  const cases=[];
  for(const id of ids){
    if(!ID.test(id)||cases.some(c=>c.entityId===id))err('duplicate/invalid ID '+id);
    const v=checkArticleDir(CANON,id);if(!v.built||v.violations.length)err('invalid article '+id);
    const src=join(CANON,id),files={};
    for(const name of paths(src)){
      if(!['article.json','research.json','README.md'].includes(name)&&!/^figures\/[a-z0-9-]+\.svg$/.test(name))err('unexpected file '+name);
      const content=readFileSync(file(src,name)),dst=join(root,'cases',id,name);
      mkdirSync(resolve(dst,'..'),{recursive:true});writeFileSync(dst,content);files[name]=sha(content);
    }
    cases.push({entityId:id,files});
  }
  store(join(root,'manifest.json'),{schema:'make-money.case-batch.v1',batchId,createdAt:new Date().toISOString(),cases});
  verifyBatch(root);
  console.log('[case-batch] exported '+cases.length+' cases to '+root);
}
try{
  if(args[0]==='import')doImport();
  else if(args[0]==='export')doExport();
  else if(args[0]==='preview')rebuild(true,listArticleIds(CANON));
  else err('choose export / import / preview');
}catch(e){console.error(e.message||String(e));process.exitCode=1;}

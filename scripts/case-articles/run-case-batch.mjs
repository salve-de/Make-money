/**
 * Case batch local intake and preview. NO Cloudflare, GitHub Actions, production deploy or approvals.
 *   pnpm case:batch:preview -- --input fixtures/case-batches/20261014-diverse-cases-v1
 *   pnpm case:batch:preview -- --input /path/to/cases.zip --prepare-only
 *   pnpm case:batch:preview -- --input /path/to/cases.zip --install --prepare-only
 *   node scripts/case-articles/run-case-batch.mjs --input PATH --inspect-only
 */
import { createHash } from 'node:crypto';
import { spawn, spawnSync, execFileSync } from 'node:child_process';
import {
  copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync, statSync, lstatSync, realpathSync,
} from 'node:fs';
import { basename, dirname, isAbsolute, join, resolve, sep } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const LIMIT = 2 * 1024 * 1024;
const ID = /^ent_[a-z0-9_]{3,88}$/;
const BATCH_ID = /^[a-z0-9][a-z0-9_-]{3,99}$/;
const hash = (x) => createHash('sha256').update(x).digest('hex');
const fail = (x) => { throw new Error('[Case batch] ' + x); };
const args = process.argv.slice(2).filter(x => x !== '--');
const opt = (key) => args.includes(key) ? args[args.indexOf(key) + 1] : null;
const has = (key) => args.includes(key);
const port = Number(opt('--port') ?? '3100');
const inspectOnly = has('--inspect-only');
const prepareOnly = has('--prepare-only') || has('--check-only');
const install = has('--install');
const input = opt('--input') ?? 'fixtures/case-batches/20261014-diverse-cases-v1';
if (!Number.isInteger(port) || port < 1024 || port > 65535) fail('invalid --port 1024..65535');
if (install && inspectOnly) fail('--install and --inspect-only cannot be combined');
const absInput = resolve(ROOT, input);
if (!existsSync(absInput)) fail('input not found: ' + absInput);
const zip = statSync(absInput).isFile();
if (zip && !/\.zip$/i.test(absInput)) fail('file input must be a .zip archive');
if (zip && statSync(absInput).size > 30_000_000) fail('ZIP is too large');
function safeRelative(x) {
  if (typeof x !== 'string' || !x || x.length > 240 || x.includes('\\') || x.includes('\0') ||
      isAbsolute(x) || x.startsWith('/') || x.split('/').some(s => !s || s === '.' || s === '..') ||
      /[\u0000-\u001f]/.test(x)) fail('unsafe archive filename: ' + String(x));
  return x;
}
let zipFiles = null;
if (zip) {
  const names = execFileSync('unzip', ['-Z', '-1', absInput], { encoding:'utf8', maxBuffer: LIMIT });
  const files = names.trim().split(/\r?\n/).filter(x => x && !x.endsWith('/'));
  for (const name of files) safeRelative(name);
  if (new Set(files).size !== files.length) fail('duplicate ZIP member');
  zipFiles = new Set(files);
}
function readPart(rel) {
  safeRelative(rel);
  if (zip) {
    if (!zipFiles.has(rel)) fail('missing ZIP member: ' + rel);
    const bytes = execFileSync('unzip', ['-p', absInput, rel], { maxBuffer: LIMIT + 1024 });
    if (bytes.length > LIMIT) fail('member exceeds byte limit: ' + rel);
    return bytes;
  }
  const root = resolve(absInput);
  const full = resolve(root, rel);
  if (!full.startsWith(root + sep)) fail('path outside package');
  const n = lstatSync(full);
  if (!n.isFile() || n.isSymbolicLink() || n.size > LIMIT || !realpathSync(full).startsWith(root + sep)) fail('invalid member: ' + rel);
  return readFileSync(full);
}
const loadJSON = bytes => {
  const str = bytes.toString('utf8');
  if (str.includes('\uFFFD')) fail('invalid UTF-8');
  try { return JSON.parse(str); } catch (e) { fail('invalid JSON: ' + e.message); }
};
function inspect() {
  const manifest = loadJSON(readPart('manifest.json'));
  if (manifest.schema !== 'make-money.case-batch.v1' || !BATCH_ID.test(manifest.batchId)) fail('batch manifest schema or ID mismatch');
  if (manifest.reviewOnly !== true || !Array.isArray(manifest.cases) ||
      manifest.cases.length < 1 || manifest.cases.length > 150) fail('a batch must have 1..150 review-only cases');
  const sha = manifest.sha256;
  if (!sha || typeof sha !== 'object' || Array.isArray(sha)) fail('sha256 map missing');
  const keys = Object.keys(sha);
  const names = new Set();
  const cases = [];
  for (const meta of manifest.cases) {
    const id = meta?.entityId;
    if (!ID.test(id) || names.has(id)) fail('duplicate or invalid entity ID: ' + id);
    names.add(id);
    if (typeof meta.name !== 'string' || meta.name.trim().length < 2 ||
        typeof meta.officialUrl !== 'string' || !/^https:\/\/[^/]+/i.test(meta.officialUrl)) fail('incomplete identity: ' + id);
    const root = 'cases/' + id + '/';
    const articleName = root + 'article.json';
    const researchName = root + 'research.json';
    const article = loadJSON(readPart(articleName));
    const researchBytes = readPart(researchName);
    const research = loadJSON(researchBytes);
    if (article.schema !== 'make-money.case-article.v2' || article.entityId !== id ||
        article.name !== meta.name || !['draft', 'ready_for_review'].includes(article.reviewState) ||
        research.package_id !== article.basedOn?.packageId ||
        hash(researchBytes) !== article.basedOn?.submissionSha256) fail('article/research/review/hash mismatch: ' + id);
    if (!Array.isArray(research.records) || research.records.length < 1 ||
        !Array.isArray(research.sources) || !Array.isArray(article.sources) || article.sources.length < 1) fail('research/sources missing: ' + id);
    const recKeys = new Set(research.records.map(r => r.key));
    const sourceMap = new Map(research.sources.map(s => [s.key, s.url]));
    for (const [no, key] of Object.entries(article.sourceKeys ?? {})) {
      if (!sourceMap.has(key) || sourceMap.get(key) !== article.sources[Number(no)-1]?.url) fail('article sourceKey mismatch: ' + id + '/' + no);
    }
    const used = (x) => {
      for (const key of x?.recordKeys ?? []) if (!recKeys.has(key)) fail('dangling evidence: ' + id + '/' + key);
    };
    for (const kpi of article.kpis ?? []) used(kpi);
    for (const topic of article.topics ?? []) {
      if (!Array.isArray(topic.blocks)) fail('topic blocks missing');
      used(topic.lead);
      for (const block of topic.blocks) {
        used(block);
        for (const item of block.rows ?? block.items ?? []) used(item);
      }
    }
    for (const change of article.editorialChanges ?? []) used(change);
    const files = [articleName, researchName];
    for (const fig of article.figures ?? []) {
      if (!/^[a-z0-9-]+\.svg$/.test(fig.file)) fail('SVG filename invalid: ' + id);
      const p = root + 'figures/' + fig.file;
      const raw = readPart(p).toString('utf8');
      if (/<script\b|<foreignObject\b|<image\b|<!DOCTYPE|<\?xml-stylesheet|href\s*=\s*["']?\s*https?:/i.test(raw)) fail('unsafe SVG: ' + p);
      files.push(p);
    }
    const readmeName = root + 'README.md';
    if (sha[readmeName]) files.push(readmeName);
    for (const rel of files) {
      const declared = sha[rel];
      if (typeof declared !== 'string' || !/^[a-f0-9]{64}$/.test(declared) || hash(readPart(rel)) !== declared) fail('member SHA mismatch: ' + rel);
    }
    cases.push({ meta, article, files });
  }
  const allowed = new Set(cases.flatMap(c=>c.files));
  if (keys.length !== allowed.size || keys.some(k => !allowed.has(k))) fail('manifest contains missing/extra member SHA values');
  if (zip && (zipFiles.size !== allowed.size + 1 || [...zipFiles].some(k => k !== 'manifest.json' && !allowed.has(k)))) fail('ZIP contains unlisted files');
  return { manifest, cases };
}
function run(stage, script, opts=[]) {
  console.log('[Case batch] ' + stage);
  const r = spawnSync(process.execPath, ['--import', 'tsx', script, ...opts], { cwd:ROOT, stdio:'inherit', env:process.env });
  if (r.status !== 0) fail(stage + ' failed (exit ' + r.status + ')');
}
function writeStaged(pack, folder) {
  for (const c of pack.cases) for (const rel of c.files) {
    const path = join(folder, rel);
    mkdirSync(dirname(path), { recursive:true });
    writeFileSync(path, readPart(rel), {flag:'wx'});
  }
}
function composeAdditions(pack) {
  const base = JSON.parse(readFileSync(resolve(ROOT,'data/entity-additions/gen5-case-articles.json'),'utf8'));
  if (!Array.isArray(base.records) || !base.records.length) fail('existing identity template missing');
  const template = base.records[0].record;
  for (const c of pack.cases) {
    if (base.records.some(x => x.id===c.meta.entityId)) fail('identity already present: ' + c.meta.entityId);
    const record = structuredClone(template);
    Object.assign(record,{
      id:c.meta.entityId, ticker:c.meta.entityId.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,29),
      name:c.meta.name, tagline:c.article.listLine, description:c.article.lead,
      country:c.meta.country ?? '不明', sector:'UNKNOWN', scale:'UNKNOWN',
      url:c.meta.officialUrl, officialUrl:c.meta.officialUrl,
      founder:'未確認', verifiedBadge:false, growthRateYoY:0,
      tags:[c.meta.category??'事例'], evidenceCards:[], publishability:'PARTIAL',
      financialStatus:'UNAVAILABLE', isGrowthUnconfirmed:true, claimBindings:[], observations:[], observationsStream:[],
    });
    if (record.pnl) {
      record.pnl.sourceDoc=c.meta.officialUrl;
      record.pnl.monthlyRevenue=0;
      record.pnl.isRevenueUnconfirmed=true;
      record.pnl.financialStatus='UNAVAILABLE';
    }
    for (const source of c.article.sources) record.evidenceCards.push({
      id:c.meta.entityId + '-S' + source.no, type:'UNKNOWN_AUDIT',
      title:'出典' + source.no + '：' + source.label.slice(0,35), badge:'出典', evidenceStatus:'REPORTED',
      punchline:'調査記録の出典', details:['URL：'+source.url], url:source.url,
      sourceNote:'商用権利と原典の独立確認が必要', sourceClass:'INDEPENDENT_SECONDARY'
    });
    const recSha = hash(Buffer.from(JSON.stringify(record)));
    base.records.push({id:c.meta.entityId,provenance:{detailsHash:recSha,artifactSha256:hash(readPart(c.files.find(x=>x.endsWith('/article.json'))))},record});
  }
  base.records.sort((a,b)=>a.id.localeCompare(b.id));
  return base;
}
function main() {
  const pack=inspect();
  console.log('[Case batch] integrity OK: ' + pack.manifest.batchId + ' / ' + pack.cases.map(c=>c.meta.name).join(', '));
  if (inspectOnly) return;
  const preview=resolve(ROOT,'.catalog-release-preview');
  mkdirSync(preview,{recursive:true});
  const staging=mkdtempSync(join(preview,'case-import-'));
  try {
    writeStaged(pack,staging);
    const articlesOut=join(preview,'batch-import-articles.json');
    run('validate research, article, SVG and citations',
      'scripts/case-articles/build.ts', ['--dir',join(staging,'cases'),'--file',articlesOut]);
    const newArticles=JSON.parse(readFileSync(articlesOut,'utf8'));
    const existing=JSON.parse(readFileSync(resolve(ROOT,'data/case-articles.json'),'utf8'));
    const existingIDs=new Set(existing.map(x=>x.entityId));
    for(const c of pack.cases) if(existingIDs.has(c.meta.entityId)) fail('case ID already installed: ' + c.meta.entityId);
    const merged=[...existing,...newArticles].sort((a,b)=>a.entityId.localeCompare(b.entityId));
    writeFileSync(articlesOut, JSON.stringify(merged,null,1)+'\n');
    const identity=composeAdditions(pack);
    const additionFile=join(preview,'batch-import-additions.json');
    writeFileSync(additionFile,JSON.stringify(identity,null,1)+'\n');
    run('prepare local-only catalog; NO R2 writes',
      'scripts/prepare-catalog-release.ts',
      ['--preview-articles','--out',preview,'--articles-file',articlesOut,'--additions-file',additionFile]);
    const pointer=JSON.parse(readFileSync(join(preview,'current.json'),'utf8'));
    const manifestFile=join(preview,pointer.manifestHash+'.json.gz');
    const catalog=JSON.parse(gunzipSync(readFileSync(manifestFile)).toString('utf8'));
    for(const c of pack.cases) if(!Object.hasOwn(catalog.details,c.meta.entityId)) fail('UI catalog missing: ' + c.meta.entityId);
    if (install) {
      // Explicit opt-in only. Never write public catalog, R2 or release pointer.
      const dest=resolve(ROOT,'data/case-articles');
      const savedArticles=readFileSync(resolve(ROOT,'data/case-articles.json'));
      const additionsPath=resolve(ROOT,'data/entity-additions/gen5-case-articles.json');
      const savedAdditions=readFileSync(additionsPath);
      const copied=[];
      try {
        for(const c of pack.cases) {
          const target=join(dest,c.meta.entityId);
          if(existsSync(target)) fail('refusing to overwrite installed case '+target);
          mkdirSync(target,{recursive:false});copied.push(target);
          for(const rel of c.files) {
            const sub=rel.replace('cases/'+c.meta.entityId+'/','');
            const to=join(target,sub);
            mkdirSync(dirname(to),{recursive:true});copyFileSync(join(staging,rel),to);
          }
        }
        writeFileSync(additionsPath,JSON.stringify(identity,null,1)+'\n');
        run('regenerate local article index after explicit --install','scripts/case-articles/build.ts');
      } catch(e) {
        for(const d of copied)rmSync(d,{recursive:true,force:true});
        writeFileSync(additionsPath,savedAdditions);writeFileSync(resolve(ROOT,'data/case-articles.json'),savedArticles);
        throw e;
      }
      console.log('[Case batch] installed source files locally; still NOT approved or published');
    }
    console.log('[Case batch] READY: '+pack.cases.length+' cases in existing Make-Money UI');
    for(const c of pack.cases)console.log('  http://127.0.0.1:'+port+'/?entity='+encodeURIComponent(c.meta.entityId));
    console.log('[Case batch] no GitHub Actions, Cloudflare R2, deployment, approval or publication');
    if(prepareOnly)return;
    const next=resolve(ROOT,'node_modules/next/dist/bin/next');
    if(!existsSync(next))fail('Next.js missing; run pnpm install --frozen-lockfile first');
    const child=spawn(process.execPath,[next,'dev','--hostname','127.0.0.1','--port',String(port)],{
      cwd:ROOT,stdio:'inherit',env:{...process.env,CATALOG_RELEASE_DIR:preview}
    });
    for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{if(!child.killed)child.kill(signal)});
    child.once('exit',(code)=>{process.exitCode=code??0});
  } finally {
    rmSync(staging,{recursive:true,force:true});
  }
}
try { main(); } catch(e) { console.error(e.stack??String(e));process.exitCode=1; }

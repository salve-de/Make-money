#!/usr/bin/env python3
"""Verified local-only Make-Money batch importer.

By default it is read-only and validates a portable ZIP. With --apply it validates with the
repository's real case-article builder, imports into data/case-articles/<ID> without overwrite,
and builds the existing project's private .catalog-release-preview/batch preview artifacts.
It NEVER publishes, writes R2, changes GitHub Actions, or edits data/catalog-release.json.
"""
from __future__ import annotations
import argparse, copy, hashlib, json, os, re, shutil, subprocess, sys, tempfile, zipfile
from pathlib import Path
from urllib.parse import urlsplit

FORMAT='makemoney.case-batch.v1'
CASE_ID=re.compile(r'^ent_[a-z0-9][a-z0-9_-]{2,90}$')
HASH=re.compile(r'^[a-f0-9]{64}$')
TOPICS=['overview','mechanism','revenue','acquisition','operations','history','reasons']
TYPES={'facts','paragraph','steps','rates','table','timeline','list','subheading','figure'}
MAX_CASES=50  # One ZIP per scheduled delivery; repeat jobs for 10,000 cases.
MAX_BUNDLE_BYTES=100*1024*1024

class IntakeError(Exception):pass

def require(cond,msg):
    if not cond:raise IntakeError(msg)

def sha(data:bytes)->str:return hashlib.sha256(data).hexdigest()

def normalize(u:str)->str:
    x=urlsplit(u)
    require(x.scheme=='https' and x.hostname,'official URL must be HTTPS')
    return (x.hostname or '').lower().removeprefix('www.')

def check_svg(raw:bytes,label:str):
    require(len(raw)<3_000_000,f'{label}: SVG too large')
    svg=raw.decode('utf-8')
    for name,pattern in [('embedded code',r'<\s*script\b'),('external image',r'<\s*image\b'),('foreignObject',r'<\s*foreignObject\b'),('foreign href',r'(?:href\s*=\s*[\"\']\s*https?://|url\(\s*[\"\']?https?://)'),('events',r'\son[a-z]+\s*='),('doctype',r'<!DOCTYPE|<!ENTITY')]:
        require(not re.search(pattern,svg,re.I),f'{label}: prohibited SVG {name}')
    require(svg.lstrip().startswith('<svg') and '</svg>' in svg,f'{label}: invalid SVG root')
    return True

def read_and_validate(bundle:Path):
    require(bundle.is_file(),f'ZIP not found: {bundle}')
    require(bundle.stat().st_size<MAX_BUNDLE_BYTES,'ZIP too large')
    with zipfile.ZipFile(bundle) as f:
        names=f.namelist()
        require(len(names)==len(set(names)),'ZIP contains duplicate entry names')
        require(len(names)<=MAX_CASES*20+2,'ZIP contains too many entries')
        require('batch-manifest.json' in names,'missing batch-manifest.json')
        for z in f.infolist():
            p=Path(z.filename)
            require(not p.is_absolute() and '..' not in p.parts and not '\\' in z.filename,'unsafe ZIP path')
            require(z.file_size<=10*1024*1024,'oversized file in ZIP')
            require(((z.external_attr>>16) & 0o170000) != 0o120000,'ZIP symlink forbidden')
        require(sum(z.file_size for z in f.infolist())<MAX_BUNDLE_BYTES,'decompressed ZIP too large')
        manifest=json.loads(f.read('batch-manifest.json'))
        require(manifest.get('format')==FORMAT,'unsupported batch format')
        require(manifest.get('delivery')=='review_only','batch must be review_only; never auto-publish')
        entries=manifest.get('cases')
        require(isinstance(entries,list) and 1<=len(entries)<=MAX_CASES,'invalid case count')
        ids=set();domains=set();cases=[];expected={'batch-manifest.json'}
        for item in entries:
            cid=item.get('entity_id')
            require(isinstance(cid,str) and CASE_ID.fullmatch(cid),f'invalid entity ID {cid}')
            require(cid not in ids,f'duplicate entity ID: {cid}');ids.add(cid)
            domain=normalize(item.get('official_url',''))
            require(domain not in domains,f'duplicate official domain within batch: {domain}');domains.add(domain)
            bypath={}
            for desc in item.get('files',[]):
                name=desc.get('path','')
                require(isinstance(name,str) and name.startswith(f'cases/{cid}/'),f'invalid file path in {cid}')
                allowed=(name in (f'cases/{cid}/article.json',f'cases/{cid}/research.json',f'cases/{cid}/identity.json') or re.fullmatch(rf'cases/{re.escape(cid)}/figures/[a-z0-9-]+\.svg',name))
                require(allowed,f'unsupported file {name}')
                require(name not in bypath and name in names,f'duplicate or missing file {name}')
                data=f.read(name)
                require(len(data)==desc.get('bytes') and sha(data)==desc.get('sha256'),f'hash or length mismatch {name}')
                bypath[name]=data;expected.add(name)
            def load(name):
                p=f'cases/{cid}/{name}';require(p in bypath,f'missing {p}')
                return json.loads(bypath[p])
            a=load('article.json');r=load('research.json');identity=load('identity.json')
            require(a.get('schema')=='make-money.case-article.v2','article schema mismatch')
            require(a.get('entityId')==cid and identity.get('entityId')==cid,'entity ID mismatch')
            require(a.get('reviewState') in ('draft','ready_for_review'),'import cannot approve articles')
            require(a.get('name')==item['name'] and identity.get('name')==item['name'],'entity name mismatch')
            require(normalize(identity.get('officialUrl',''))==domain,'domain mismatch')
            require(a.get('basedOn',{}).get('submissionSha256')==sha(bypath[f'cases/{cid}/research.json']),'research SHA mismatch')
            require(a.get('basedOn',{}).get('packageId')==r.get('package_id'),'research package ID mismatch')
            recordmap={v['key']:v for v in r.get('records',[])}
            refs=set(recordmap)
            require(refs and len(refs)==len(r.get('records',[])),'missing/duplicate research recordKeys')
            srcs=a.get('sources',[])
            require(srcs and [x['no'] for x in srcs]==list(range(1,len(srcs)+1)),'source citations not sequential')
            source_urls={s['url'] for s in r.get('sources',[])}
            for x in srcs:
                require(x['url'] in source_urls,'article source not present in research')
                require(urlsplit(x['url']).scheme=='https','source URL must be HTTPS')
            for x in a.get('kpis',[]):
                require(x.get('recordKeys') and set(x['recordKeys'])<=refs,'KPI missing evidence linkage')
            topics=a.get('topics',[])
            positions=[TOPICS.index(t['id']) for t in topics]
            require(positions==sorted(set(positions)) and topics,'topics duplicated/misordered')
            figs={x['id']:x for x in a.get('figures',[])}
            for fid,fig in figs.items():
                require(re.fullmatch(r'[a-z0-9-]{2,80}',fid),'figure ID invalid')
                svgname=f'cases/{cid}/figures/{fig["file"]}'
                require(svgname in bypath and check_svg(bypath[svgname],svgname),f'figure missing/unsafe {fid}')
            for t in topics:
                require(t.get('blocks'),'empty chapter')
                for b in t['blocks']:
                    tp=b.get('type');require(tp in TYPES,'unknown block type')
                    if tp=='figure':require(b.get('figureId') in figs,'figure ref missing');continue
                    if tp=='subheading':continue
                    lines=b.get('rows',b.get('items',[])) if tp not in ('paragraph',) else [b]
                    for line in lines:
                        require(line.get('recordKeys') and set(line['recordKeys'])<=refs,'block is missing research recordKeys')
                        require(set(line.get('cites',[]))<=set(range(1,len(srcs)+1)),'invalid citation number')
                        actual_refs=set().union(*(set(recordmap[k]['source_keys']) for k in line['recordKeys']))
                        for n in line.get('cites',[]):
                            ref=a.get('sourceKeys',{}).get(str(n))
                            require(ref in actual_refs, f'citation {n} not substantiated by recordKeys')
            require(a.get('headline') and a.get('lead') and a.get('listLine'),'headline/lead missing')
            cases.append({'id':cid,'article':a,'research':r,'identity':identity,'files':bypath,'domain':domain})
        require(expected==set(names),f'unexpected files in ZIP: {sorted(set(names)-expected)[:8]}')
    return manifest,cases

def run(cmd,cwd,env=None):
    print('RUN:', ' '.join(map(str,cmd)))
    p=subprocess.run([str(x) for x in cmd],cwd=cwd,env=env,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=180)
    print(p.stdout[-11000:])
    require(p.returncode==0,f'failed subprocess exit={p.returncode}')

def make_additions(repo:Path,cases:list,preview:Path):
    previous=json.loads((repo/'data/entity-additions/gen5-case-articles.json').read_text('utf-8'))
    require(isinstance(previous.get('records'),list) and previous['records'],'missing staging identity template')
    template=previous['records'][0]['record'];items=previous['records']
    # Preserve ALL previously imported cases, not only the most recent ZIP.
    prior=[]
    for identity_path in sorted((repo/'data/case-articles').glob('*/identity.json')):
        article_path=identity_path.parent/'article.json'
        if article_path.is_file():
            prior.append({'id':identity_path.parent.name,'identity':json.loads(identity_path.read_text('utf8')),'article':json.loads(article_path.read_text('utf8'))})
    for c in prior:
        ident=c['identity'];a=c['article'];cid=c['id']
        if any(x['id']==cid for x in items):continue
        rec=copy.deepcopy(template)
        rec.update({'id':cid,'ticker':cid.upper().replace('-','_'),'name':ident['name'],'tagline':a['listLine'],'description':a['lead'],
         'country':ident.get('country','未確認'),'url':ident['officialUrl'],'officialUrl':ident['officialUrl'],
         'tags':[ident.get('category','事例')],'verifiedBadge':False,'publishability':'PARTIAL',
         'growthRateYoY':0,'architecturePattern':'','pipelineStack':'','targetPainWallet':'',
         'financialStatus':'UNAVAILABLE','observationsStream':[],'observations':[],'claimBindings':[],
         'isGrowthUnconfirmed':True,'incumbentDilemma':'','blindspot':'','moatDescription':'','unknownsNotes':[]})
        for k in list(rec['pnl']):
            if isinstance(rec['pnl'][k],bool):rec['pnl'][k]=True
            elif isinstance(rec['pnl'][k],(float,int)):rec['pnl'][k]=0
        rec['pnl']['isRevenueUnconfirmed']=True;rec['pnl']['financialStatus']='UNAVAILABLE';rec['pnl']['dataSnapshotPeriod']='公表値は原稿の期間参照';rec['pnl']['sourceDoc']=ident['officialUrl']
        for k,v in list(rec['operations'].items()):
            if isinstance(v,list):rec['operations'][k]=[]
            elif isinstance(v,bool):rec['operations'][k]=True
            elif isinstance(v,(int,float)):rec['operations'][k]=0
        # Preserve enum-valued strategy.moatType; never copy another company's claims.
        rec['strategy']={'moatType':'UNKNOWN','blindspot':'','moatDescription':'','secretInsight':'','initialTraction':[],'actionPlaybook':[],'coldOutreachTemplate':'','incumbentDilemma':''}
        rec['evidenceCards']=[{'id':f'{cid}-S{s["no"]}','type':'UNKNOWN_AUDIT',
            'title':s['label'][:70],'badge':'出典','evidenceStatus':'REPORTED',
            'punchline':'公式資料または当事者記録の所在','details':[s['url']],
            'url':s['url'],'sourceNote':'公開資料に根拠。原典の独立再検査と権利審査は未完了。'} for s in a['sources']]
        payload=json.dumps(rec,ensure_ascii=False,separators=(',',':')).encode('utf8')
        items.append({'id':cid,'provenance':{'detailsHash':sha(payload),'artifactSha256':sha(json.dumps(a,ensure_ascii=False,sort_keys=True).encode())},'record':rec})
    previous['records']=sorted(items,key=lambda x:x['id'])
    path=preview/'intake-additions.json';path.write_text(json.dumps(previous,ensure_ascii=False,indent=2)+'\n','utf8')
    return path

def process(bundle:Path,repo:Path,apply:bool,prepare:bool):
    manifest,cases=read_and_validate(bundle)
    print(json.dumps({'batch':manifest['batch_id'],'caseCount':len(cases),'cases':[c['id'] for c in cases], 'hashOK':True,'mode':'apply' if apply else 'validate_only'},ensure_ascii=False,indent=2))
    if not apply:return
    require((repo/'package.json').exists() and (repo/'scripts/case-articles/build.ts').is_file(),'run from Make-Money repository root')
    require((repo/'node_modules/tsx').exists() or (repo/'node_modules/.pnpm').exists(),'first run pnpm install --frozen-lockfile')
    review=repo/'.catalog-release-preview/batch'
    review.mkdir(parents=True,exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='mm-intake-') as temp:
        stage=Path(temp)/'cases';stage.mkdir()
        for c in cases:
            target=stage/c['id'];target.mkdir()
            for path,data in c['files'].items():
                rel=path[len(f'cases/{c["id"]}/'):]
                file=target/rel;file.parent.mkdir(exist_ok=True);file.write_bytes(data)
        # Real repository's Zod / source-hash / citation / figure validator. No tracked file modified.
        run(['node','--import','tsx','scripts/case-articles/build.ts','--dir',stage,'--file',Path(temp)/'intake-tested.json'],repo)
    inserted=[]
    try:
        for c in cases:
            target=repo/'data/case-articles'/c['id']
            if target.exists():
                # Idempotent only for byte-identical existing complete case.
                original={str(p.relative_to(target)):p.read_bytes() for p in target.rglob('*') if p.is_file()}
                submitted={path[len(f'cases/{c["id"]}/'):]:v for path,v in c['files'].items()}
                require(original==submitted,f'case {c["id"]} exists with different content: do not overwrite')
                print('SKIP unchanged',c['id']);continue
            target.mkdir(parents=True)
            inserted.append(target)
            for path,data in c['files'].items():
                rel=path[len(f'cases/{c["id"]}/'):];f=target/rel;f.parent.mkdir(exist_ok=True);f.write_bytes(data)
        # Generate review-only article data without touching tracked data/case-articles.json.
        articles=review/'intake-articles.json'
        run(['node','--import','tsx','scripts/case-articles/build.ts','--dir','data/case-articles','--file',articles],repo)
        additions=make_additions(repo,cases,review)
        # Existing catalog renderer and API, R2 not involved.
        run(['node','--import','tsx','scripts/prepare-catalog-release.ts','--preview-articles','--out',review,'--articles-file',articles,'--additions-file',additions],repo)
        pointer=json.loads((review/'current.json').read_text('utf8'))
        import gzip
        document=json.loads(gzip.decompress((review/(pointer['manifestHash']+'.json.gz')).read_bytes()))
        for c in cases:require(c['id'] in document.get('details',{}),f'NOT_IN_REAL_UI_PREVIEW:{c["id"]}')
        receipt={'batch':manifest['batch_id'],'case_ids':[c['id'] for c in cases], 'mode':'local_review_only',
                 'manifest_hash':sha(json.dumps(manifest,ensure_ascii=False,sort_keys=True).encode()),
                 'preview_root':str(review),'preview_pointer':pointer['manifestHash'],'ready_for_review':True,'r2_write':False,'github_actions':False}
        (review/'intake-receipt.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n','utf8')
        print('LOCAL PREVIEW READY:',json.dumps(receipt,ensure_ascii=False))
    except Exception:
        for t in inserted:
            if t.exists():shutil.rmtree(t)
        raise

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--bundle',required=True)
    p.add_argument('--repo',default='.')
    p.add_argument('--apply',action='store_true',help='copy into local repo and prepare review only; no publish')
    a=p.parse_args()
    try:process(Path(a.bundle).expanduser().resolve(),Path(a.repo).resolve(),a.apply,a.apply)
    except (IntakeError,ValueError,KeyError,json.JSONDecodeError,zipfile.BadZipFile,subprocess.TimeoutExpired) as exc:
        print('INTAKE ERROR:',str(exc),file=sys.stderr);sys.exit(1)

if __name__=='__main__':main()

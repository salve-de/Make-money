#!/usr/bin/env python3
"""Pack arbitrary number of researched Make-Money case folders into a portable, integrity-checked ZIP.
Uses only Python standard library. Inputs must be under --cases-dir, one folder per stable entity ID.
Does not contact GitHub, Cloudflare, or call an AI.
"""
import argparse, hashlib, json, re, zipfile
from pathlib import Path

FORMAT='makemoney.case-batch.v1'
ID_RE=re.compile(r'^ent_[a-z0-9][a-z0-9_-]{2,90}$')
BATCH_RE=re.compile(r'^[a-z0-9][a-z0-9_.-]{4,95}$')


def main():
    p=argparse.ArgumentParser()
    p.add_argument('--cases-dir',required=True)
    p.add_argument('--out',required=True)
    p.add_argument('--batch-id',required=True)
    p.add_argument('--id',action='append',default=[],help='case ID to pack; repeat for several cases')
    a=p.parse_args()
    if not BATCH_RE.fullmatch(a.batch_id):raise SystemExit('ERROR: invalid batch-id')
    root=Path(a.cases_dir).resolve()
    if a.id:
        if any(not ID_RE.fullmatch(i) for i in a.id):raise SystemExit('ERROR: bad --id')
        folders=[root/i for i in sorted(set(a.id))]
        if any(not x.is_dir() for x in folders):raise SystemExit('ERROR: one or more requested case folders missing')
    else:
        folders=sorted(p for p in root.iterdir() if p.is_dir() and ID_RE.fullmatch(p.name) and (p/'identity.json').is_file())
    if not folders:raise SystemExit('ERROR: no valid case directories')
    manifest={'format':FORMAT,'batch_id':a.batch_id,'created_at':'2026-10-14','delivery':'review_only','cases':[]}
    archive=[]
    for pth in folders:
        article=json.loads((pth/'article.json').read_text('utf-8'))
        identity=json.loads((pth/'identity.json').read_text('utf-8'))
        if pth.name!=article['entityId'] or pth.name!=identity['entityId']:raise SystemExit('ERROR: ID mismatch')
        paths=['article.json','research.json','identity.json']+[f'figures/{f["file"]}' for f in article.get('figures',[])]
        desc=[]
        for rel in paths:
            fp=(pth/rel).resolve()
            if not fp.is_file() or not fp.is_relative_to(pth):raise SystemExit(f'ERROR: invalid file {fp}')
            data=fp.read_bytes()
            member=f'cases/{pth.name}/{rel}'
            archive.append((member,data))
            desc.append({'path':member,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
        manifest['cases'].append({'entity_id':pth.name,'name':identity['name'],'official_url':identity['officialUrl'],'files':desc})
    zpath=Path(a.out).resolve();zpath.parent.mkdir(parents=True,exist_ok=True)
    # Stable entry list + stable ZIP timestamps, reusable by any AI, ZIP generation doesn't publish.
    with zipfile.ZipFile(zpath,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=8) as f:
        for name,data in [('batch-manifest.json',(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n').encode('utf8'))]+sorted(archive):
            zi=zipfile.ZipInfo(name,date_time=(2026,10,14,0,0,0));zi.compress_type=zipfile.ZIP_DEFLATED
            zi.external_attr=(0o100644 << 16)
            f.writestr(zi,data)
    print(json.dumps({'file':str(zpath),'cases':len(folders),'bytes':zpath.stat().st_size,'manifestSha256':hashlib.sha256((json.dumps(manifest,ensure_ascii=False,indent=2)+'\n').encode()).hexdigest()},ensure_ascii=False))

if __name__=='__main__':main()

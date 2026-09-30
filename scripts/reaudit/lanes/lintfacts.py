#!/usr/bin/env python3
import json,re,sys
FORBID=['サバンナOS','サバンナ OS','略奪転用方程式','カニバリズム障壁','身も蓋もない真実','特異物証','地雷検死','検死開示','ホスティング関所','決済関所','Indie Hackers表示','報告値・利益ではない','掲載タグラインが示す課題','防御要因は未確認','関所','死角','監禁','要塞','専用インフラ']
HAZ=['破綻','倒産','粉飾','不正','清算','枯渇','崩壊','撤退']
def strings(o,path=''):
    if isinstance(o,str): yield path,o
    elif isinstance(o,list):
        for i,x in enumerate(o): yield from strings(x,f'{path}[{i}]')
    elif isinstance(o,dict):
        for k,v in o.items(): yield from strings(v,f'{path}.{k}')
import urllib.parse,os
SHARED={'github.com','apps.apple.com','play.google.com','chromewebstore.google.com','gitlab.com','sourceforge.net'}
def domof(u):
    try: return urllib.parse.urlparse(u).hostname.replace('www.','').lower()
    except Exception: return None
IDX=None
def index():
    global IDX
    if IDX is None:
        IDX={}
        for e in json.load(open('data/entities-index.json')):
            d=domof(e.get('url') or '')
            if d: IDX.setdefault(d,[]).append(e['id'])
    return IDX
def check(files):
    bad=0
    for f in files:
        d=json.load(open(f)); recs=d['records'] if isinstance(d,dict) else d
        ids=set()
        for r in recs:
            issues=[]
            rid=r.get('id')
            if rid in ids: issues.append('dup id')
            ids.add(rid)
            for p,s in strings(r):
                for a,b in (('（',')'),('(','）')):
                    for m in re.finditer(re.escape(a)+r'[^（）()]*'+re.escape(b),s): issues.append(f'mixed paren {p}: …{m.group(0)[:40]}')
                for w in FORBID:
                    if w in s: issues.append(f'forbidden {w} in {p}')
                if s.count('(')!=s.count(')') or s.count('（')!=s.count('）'): issues.append(f'unbalanced paren {p}: {s[:50]}')
                if '"' in s: issues.append(f'ascii quote {p}')
            if r.get('url'):
                d=domof(r['url']); others=[i for i in index().get(d,[]) if i!=rid]
                if d and d not in SHARED and others: issues.append(f'url domain {d} already used by {others[:2]}')
            if r.get('verdict')=='ARCHIVE':
                if not r.get('reason'): issues.append('archive without reason')
                if issues: bad+=1; print('✗',rid); [print('   -',i) for i in issues[:12]]
                continue
            tg=r.get('tg','')
            if len(tg)>140: issues.append(f'tagline {len(tg)}>140')
            if re.search(r'[¥$€£]\s?[0-9]|[0-9]\s?(億|万|千)?円|[0-9]\s?ドル',tg): issues.append('tagline money figure')
            if not re.search(r'[ぁ-んァ-ヶ]',tg): issues.append('tagline not Japanese')
            w=r.get('w','')
            if not re.search(r'[ぁ-んァ-ヶ]',w): issues.append('w lacks kana')
            for t in r.get('tags',[]):
                if any(h in t for h in HAZ): issues.append(f'hazard tag {t}')
            for s in r.get('s',[]):
                if not s.get('u','').startswith('http'): issues.append(f'bad url {s.get("u")}')
                if s.get('k') not in ('home','about','price','press','blog','legal','ir','store','gh','wire','self','news','wiki','misc'): issues.append(f'bad kind {s.get("k")}')
                if not s.get('f'): issues.append('source without f')
            for m in r.get('rep',[]):
                for k in ('original','currency','amount','unit','unitLabel','source','context','statedOn','period','sourceUrl','cls'):
                    if k not in m: issues.append(f'rep missing {k}')
            if issues:
                bad+=1; print('✗',rid,r.get('id')); [print('   -',i) for i in issues[:12]]
    print('lint done:',bad,'records with issues')
    return bad
if __name__=='__main__': sys.exit(1 if check(sys.argv[1:]) else 0)

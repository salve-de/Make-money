#!/usr/bin/env python3
# Site profiler for re-audit lane D (cwd = repo worktree). usage: prof.py START END [outfile]   (family indices into targets.json)
# Uses only public GET requests with a truthful UA. Never bypasses bot blocks (falls back to Internet Archive copies).
import sys, re, json, html, subprocess, urllib.parse, concurrent.futures as cf, os
WORK=os.environ.get('LANE_WORKDIR') or os.path.join(os.getcwd(),'.reaudit-work')
UA='research-bot/1.0 (+reaudit lane D)'
def curl(url, t=25):
    try:
        r=subprocess.run(['curl','-sL','--compressed','-m',str(t),'-A',UA,'-w','\n@@HTTP=%{http_code} URL=%{url_effective}','--',url],capture_output=True,timeout=t+10)
    except Exception as e:
        return 0,url,''
    raw=r.stdout.decode('utf-8','ignore')
    m=re.search(r'\n@@HTTP=(\d+) URL=(\S+)\s*$',raw)
    if not m: return 0,url,raw
    body=raw[:m.start()]
    if body.count('�')>80: body=''
    return int(m.group(1)),m.group(2),body
def strip(body):
    t=re.sub(r'<script.*?</script>','',body,flags=re.S|re.I); t=re.sub(r'<style.*?</style>','',t,flags=re.S|re.I)
    t=re.sub(r'<!--.*?-->','',t,flags=re.S)
    t=re.sub(r'<(br|/p|/div|/li|/h\d|/tr|/section|/footer|/header|/a)[^>]*>','\n',t,flags=re.I)
    t=re.sub(r'<[^>]+>',' ',t); t=html.unescape(t)
    ls=[re.sub(r'\s+',' ',l).strip() for l in t.split('\n')]
    out=[];seen=set()
    for l in ls:
        if len(l)<3 or l in seen: continue
        seen.add(l); out.append(l)
    return out
KEY=re.compile(r"(co-?found|founder|founded|founding|since 19|since 20|established|incorporated|\bCEO\b|\bCTO\b|managing director|Geschäftsführ|創業|設立|代表取締役|代表者|従業員|employees|team members|team of|\bstaff\b|people\b.{0,20}(countries|remote)|headcount|bootstrapped|self-funded|profitable|raised|funding|seed|series [a-d]|backed by|acquired|acquisition|owned by|part of|subsidiary|parent|©|copyright|Inc\.|LLC|Ltd|Limited|GmbH|\bSAS\b|S\.A\.|B\.V\.|Pty|Pte|Corp\.|OÜ|Sp\. z o\.o|株式会社|合同会社|customers|users|companies|downloads|developers|brands|creators|businesses|merchants|installs|subscribers|trusted by|used by|\$\s?\d|€\s?\d|£\s?\d|¥\s?\d|\d\s?(円|ドル|USD|EUR)|per month|/mo\b|/month|per year|/year|free plan|free trial|lifetime)",re.I)
PAGE=re.compile(r"(about|company|team|our-?story|story|who-?we-?are|mission|pricing|price|plans|legal|terms|privacy|imprint|impressum|press|contact|会社|企業|運営|料金|利用規約|特商|お問い合わせ|company-?info|corporate)",re.I)
def ldjson(body):
    out=[]
    for m in re.finditer(r'<script[^>]+application/ld\+json[^>]*>(.*?)</script>',body,flags=re.S|re.I):
        try: j=json.loads(m.group(1).strip())
        except Exception: continue
        items=j if isinstance(j,list) else j.get('@graph',[j]) if isinstance(j,dict) else []
        for it in items:
            if not isinstance(it,dict): continue
            ty=it.get('@type'); ty=' '.join(ty) if isinstance(ty,list) else str(ty)
            if re.search(r'Organization|Corporation|Company|SoftwareApplication|WebSite|Product',ty or ''):
                keep={k:it.get(k) for k in ('@type','name','legalName','foundingDate','founder','founders','numberOfEmployees','address','url','parentOrganization','sameAs','offers') if it.get(k)}
                s=json.dumps(keep,ensure_ascii=False)[:420]
                out.append(s)
    return out[:3]
def meta(body):
    o=[]
    for pat in (r'<title[^>]*>(.*?)</title>',r'<meta[^>]+name=["\']description["\'][^>]+content=["\'](.*?)["\']',r'<meta[^>]+property=["\']og:description["\'][^>]+content=["\'](.*?)["\']',r'<meta[^>]+property=["\']og:site_name["\'][^>]+content=["\'](.*?)["\']'):
        m=re.search(pat,body,flags=re.S|re.I)
        if m: o.append(html.unescape(re.sub(r'\s+',' ',m.group(1)).strip())[:200])
    return o
def keylines(ls,n,seen=None):
    o=[]
    for l in ls:
        if sum(1 for ch in l if ord(ch)<32 or 0xFFF0<=ord(ch))>3: continue
        if len(l)>210: l=l[:210]
        if seen is not None and l in seen: continue
        if KEY.search(l):
            o.append(l)
            if seen is not None: seen.add(l)
        if len(o)>=n: break
    return o
def host_root(h):
    p=h.split('.')
    return '.'.join(p[-2:]) if len(p)>=2 else h
def anchors(body,base):
    res=[]
    for h,t in re.findall(r'<a[^>]+href=["\']([^"\'#]+)["\'][^>]*>(.*?)</a>',body,flags=re.S|re.I):
        tx=re.sub(r'<[^>]+>','',t).strip()
        u=urllib.parse.urljoin(base,html.unescape(h))
        if u.startswith('http'): res.append((u,tx[:40]))
    return res
def sitemap_paths(home_final):
    pu=urllib.parse.urlparse(home_final); root=f'{pu.scheme}://{pu.netloc}'
    code,_,body=curl(root+'/sitemap.xml',15)
    urls=[]
    if code==200: urls=re.findall(r'<loc>\s*(.*?)\s*</loc>',body)
    if not urls or (urls and all(u.endswith('.xml') for u in urls[:3])):
        # try first child sitemap
        kids=[u for u in urls if u.endswith('.xml')][:2]
        for k in kids:
            c2,_,b2=curl(k,15)
            if c2==200: urls+=re.findall(r'<loc>\s*(.*?)\s*</loc>',b2)
    return urls[:20000]
def wayback_home(host):
    code,_,txt=curl(f'https://web.archive.org/cdx/search/cdx?url={host}/&output=txt&fl=timestamp,statuscode&filter=statuscode:200&limit=-1',20)
    m=re.search(r'(\d{14})\s+200',txt or '')
    if not m: return None
    ts=m.group(1)
    c,fu,body=curl(f'https://web.archive.org/web/{ts}id_/https://{host}/',30)
    return ts,c,body
def wiki(name,lang='en'):
    q=urllib.parse.quote(name)
    c,_,b=curl(f'https://{lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch={q}&format=json&srlimit=3',15)
    out=[]
    try: j=json.loads(b)
    except Exception: return out
    for s in j.get('query',{}).get('search',[])[:3]:
        title=s['title']
        if name.lower().split()[0] not in (title+' '+s.get('snippet','')).lower(): continue
        c2,_,b2=curl(f'https://{lang}.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(title.replace(" ","_"))}',15)
        try: sj=json.loads(b2)
        except Exception: continue
        desc=(sj.get('description','')+' '+sj.get('extract','')).lower()
        if not re.search(r'company|software|application|\bapp\b|service|startup|platform|provider|website|search engine|browser|vpn|corporation|brand|firm|developer|publisher|studio|marketplace|tool',desc): continue
        if name.lower().split()[0] not in title.lower(): continue
        out.append(f"{title} | {sj.get('description','')} | {sj.get('extract','')[:230]}")
    return out[:2]
def yc(name,dom):
    slugs=[]
    base=re.sub(r'[^a-z0-9]+','-',name.lower()).strip('-')
    slugs.append(base)
    d=dom.split('.')[0] if dom else ''
    if d and d not in slugs: slugs.append(d)
    for s in slugs[:2]:
        c,_,b=curl(f'https://www.ycombinator.com/companies/{s}',15)
        if c==200 and 'team_size' in b:
            ts=re.search(r'team_size&quot;:(\d+)',b) or re.search(r'"team_size":(\d+)',b)
            ls=strip(b)
            info=[l for l in ls if re.match(r'(Founded|Batch|Team Size|Location|Status)',l)][:5]
            return f'slug={s} team_size={ts.group(1) if ts else "?"} '+' | '.join(info)
    return None
def ih(name,dom):
    base=re.sub(r'[^a-z0-9]+','-',name.lower()).strip('-')
    cands=[base]; d=dom.split('.')[0] if dom else ''
    if d and d not in cands: cands.append(d)
    for s in cands[:2]:
        c,_,b=curl(f'https://www.indiehackers.com/product/{s}',15)
        if c==200 and 'Indie Hackers' in b:
            ls=strip(b)
            rev=[ls[i]+' '+ls[i+1]+' '+(ls[i+2] if i+2<len(ls) else '') for i,l in enumerate(ls) if l=='Revenue'][:1]
            posts=[l for l in ls if re.match(r'(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, 20\d\d$',l)][:3]
            return f'slug={s} rev={rev} recent_post_dates={posts}'
    return None
def profile(t):
    i=t['i']; name=t['name']; url=t['url']
    o=[f"=== [{i}] {name} ({t['id']}) {url} country={t['country']}"]
    code,fin,body=curl(url,25)
    blocked = code in (0,401,403,429,503) or re.search(r'Just a moment|Attention Required|cf-browser-verification|Access denied|are you a robot',body[:3000],re.I)
    pu=urllib.parse.urlparse(fin); host=pu.netloc
    if code==0:
        alt=re.sub(r'^https?://(www\.)?','',url).split('/')[0]
        for cand in (f'https://www.{alt}/' if not url.startswith('https://www.') else f'https://{alt}/',):
            c2,f2,b2=curl(cand,20)
            if c2 and c2!=0: code,fin,body=c2,f2,b2; o.append(f"  (retry {cand} -> {c2})"); blocked=code in (401,403,429,503); pu=urllib.parse.urlparse(fin); host=pu.netloc
    o.append(f"HOME http={code} final={fin} len={len(body)}"+(' BLOCKED' if blocked else ''))
    ls=[]
    if blocked or not body:
        wb=wayback_home(re.sub(r'^https?://','',url).split('/')[0])
        if wb and wb[2]:
            ts,c,wbody=wb
            o.append(f"  WAYBACK home ts={ts} http={c} (archive copy; not the live page)")
            body=wbody
        else:
            o.append("  no usable archive copy")
    if body:
        for m_ in meta(body): o.append('  META: '+m_)
        for j in ldjson(body): o.append('  LD: '+j)
        ls=strip(body)
        SEEN=set()
        for l in keylines(ls,13,SEEN): o.append('  H: '+l)
        # secondary pages
        cands=[];seen={fin.rstrip('/')}
        root=host_root(host)
        for u,tx in anchors(body,fin):
            pu2=urllib.parse.urlparse(u)
            if host_root(pu2.netloc)!=root: continue
            key=(pu2.path+' '+tx)
            if PAGE.search(key) and u.rstrip('/') not in seen:
                seen.add(u.rstrip('/')); cands.append(u)
        # sitemap hints
        try:
            sm=sitemap_paths(fin)
            hints=[u for u in sm if PAGE.search(urllib.parse.urlparse(u).path) and urllib.parse.urlparse(u).path.count('/')<=3 and not re.search(r'/blog/|/news/|/post/|/article|/tag/|/category|/docs/|/help|/changelog|/customers?/|/case',u)]
            for u in hints:
                if u.rstrip('/') not in seen and len(cands)<14: seen.add(u.rstrip('/')); cands.append(u)
            if sm: o.append(f"  sitemap urls={len(sm)}")
        except Exception: pass
        # prioritise
        def pri(u):
            p=urllib.parse.urlparse(u).path.lower()
            for k,(w) in enumerate(['about','company','team','story','pricing','plans','price','legal','terms','imprint','impressum','privacy','press','contact']):
                if w in p: return k
            return 99
        cands=sorted(cands,key=pri)[:6]
        for u in cands:
            if re.search(r'\.(pdf|zip|png|jpe?g|gif|mp4|dmg|exe)(\?|$)',u,re.I): continue
            c,fu,b=curl(u,20)
            if c!=200 or not b:
                o.append(f"  PAGE {u} -> http={c}"); continue
            l2=strip(b); kl=keylines(l2,7,SEEN)
            js=ldjson(b)
            o.append(f"  PAGE {fu} http={c}")
            for j in js[:1]: o.append('    LD: '+j)
            for l in kl: o.append('    - '+l)
    # external lookups
    dom=host_root(host) if host else ''
    lang='ja' if t['country']=='JP' or re.search(r'[ぁ-んァ-ヶ一-龥]',name) else 'en'
    try:
        w=wiki(name,lang)
        for x in w: o.append('  WIKI('+lang+'): '+x)
    except Exception as e: pass
    try:
        y=yc(name,dom)
        if y: o.append('  YC: '+y)
    except Exception: pass
    try:
        h=ih(name,dom)
        if h: o.append('  IH: '+h)
    except Exception: pass
    return '\n'.join(o)
if __name__=='__main__':
    a=int(sys.argv[1]); b=int(sys.argv[2]); outp=sys.argv[3] if len(sys.argv)>3 else None
    targets=json.load(open(WORK+'/targets.json'))  # gen-targets.mjs で生成
    idx=json.load(open('data/entities-index.json'))
    scale={e['id']:e.get('scale') for e in idx}
    sel=[t for t in targets if a<=t['i']<=b and scale.get(t['id']) in ('SOLO','SMALL_TEAM','UNKNOWN',None)]
    print(f'{len(sel)} targets in {a}-{b}',file=sys.stderr)
    res={}
    with cf.ThreadPoolExecutor(max_workers=6) as ex:
        futs={ex.submit(profile,t):t['i'] for t in sel}
        for f in cf.as_completed(futs):
            try: res[futs[f]]=f.result()
            except Exception as e: res[futs[f]]=f'=== [{futs[f]}] ERROR {e}'
    txt='\n\n'.join(res[k] for k in sorted(res))
    if outp: open(outp,'w').write(txt)
    else: print(txt)

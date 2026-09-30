#!/usr/bin/env python3
# fx.py URL [MAXCHARS] [REGEX] : truthful-UA GET, strip to text lines, print all (or regex-matching) lines up to MAXCHARS. No bot-check bypass.
import sys,re,html,subprocess
import os
UA='research-bot/1.0 (+reaudit lane %s)' % (os.environ.get('LANE_TAG') or 'x')
u=sys.argv[1]; mx=int(sys.argv[2]) if len(sys.argv)>2 else 3000; pat=re.compile(sys.argv[3],re.I) if len(sys.argv)>3 else None
r=subprocess.run(['curl','-sL','--compressed','-m','25','-A',UA,'-w','\n@@HTTP=%{http_code} URL=%{url_effective} ERR=%{errormsg}','--',u],capture_output=True)
raw=r.stdout.decode('utf-8','ignore')
m=re.search(r'\n@@HTTP=(\d+) URL=(\S+) ERR=(.*)$',raw,flags=re.S)
code=m.group(1) if m else '0'; fin=m.group(2) if m else u; body=raw[:m.start()] if m else raw
t=re.sub(r'<script.*?</script>','',body,flags=re.S|re.I); t=re.sub(r'<style.*?</style>','',t,flags=re.S|re.I); t=re.sub(r'<!--.*?-->','',t,flags=re.S)
t=re.sub(r'<(br|/p|/div|/li|/h\d|/tr|/section|/footer|/header|/a|/button|/span)[^>]*>','\n',t,flags=re.I); t=re.sub(r'<[^>]+>',' ',t); t=html.unescape(t)
EMAIL=re.compile(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}')
lines=[];seen=set()
for l in t.split('\n'):
    l=re.sub(r'\s+',' ',l).strip()
    if len(l)<2 or l in seen: continue
    seen.add(l); lines.append(EMAIL.sub('[email]',l))
print(f'[HTTP {code}] {fin} lines={len(lines)}' + (f' ERR={m.group(3).strip()}' if m and m.group(3).strip() else ''))
out=[l for l in lines if (pat.search(l) if pat else True)]
s='\n'.join(out)
print(s[:mx])

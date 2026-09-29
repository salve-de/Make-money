#!/usr/bin/env python3
# usage: wk.py TITLE [lang]  -> infobox-ish lines + lead sentences from Wikipedia (public page fetch)
import sys,re,html,subprocess,urllib.parse
title=sys.argv[1]; lang=sys.argv[2] if len(sys.argv)>2 else 'en'
u=f'https://{lang}.wikipedia.org/wiki/'+urllib.parse.quote(title.replace(' ','_'),safe='()_,')
import json
_api=subprocess.run(['curl','-s','-m','20','-A','research-bot/1.0 (+reaudit lane D)',f'https://{lang}.wikipedia.org/w/api.php?action=query&format=json&redirects=1&titles='+urllib.parse.quote(title)],capture_output=True).stdout.decode('utf-8','ignore')
try:
    _pg=list(json.loads(_api)['query']['pages'].values())[0]
    if 'missing' in _pg: print('[no article]',u); sys.exit(0)
except Exception: pass
r=subprocess.run(['curl','-sL','--compressed','-m','30','-A','research-bot/1.0 (+reaudit lane D)',u],capture_output=True).stdout.decode('utf-8','ignore')
t=re.sub(r'<script.*?</script>','',r,flags=re.S|re.I); t=re.sub(r'<style.*?</style>','',t,flags=re.S|re.I)
t=re.sub(r'<sup[^>]*>.*?</sup>','',t,flags=re.S|re.I)
t=re.sub(r'<(br|/p|/div|/li|/h\d|/tr|/th|/td|/section)[^>]*>','\n',t,flags=re.I); t=re.sub(r'<[^>]+>',' ',t); t=html.unescape(t)
L=[re.sub(r'\s+',' ',l).strip() for l in t.split('\n') if l.strip()]
if not L or 'Wikipedia does not have an article' in ' '.join(L[:30]) or len(L)<20: print('[no article]',u); sys.exit(0)
print('[wiki]',u)
keys=r'^(Founded|Founder|Founders|Headquarters|Number of employees|Employees|Parent|Traded as|Key people|Industry|Type|Products|Website|Owner|Formerly|Area served|Revenue|Net income|設立|創業|本社所在地|代表者|資本金|従業員数|事業内容|決算期|主要株主|親会社|業種|売上高|営業利益|純利益|総資産|設立日|法人番号)'
seen=0
for i,l in enumerate(L):
    if re.match(keys,l):
        nxt=L[i+1] if i+1<len(L) and not re.match(keys,L[i+1]) else ''
        print('  ',l[:120],'|',nxt[:120]); seen+=1
    if seen>22: break
lead=[l for l in L if len(l)>90][:3]
for l in lead: print('  LEAD:',l[:380])

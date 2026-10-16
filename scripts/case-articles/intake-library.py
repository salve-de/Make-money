#!/usr/bin/env python3
"""Offline, review-only bridge: ChatGPT Library Markdown ZIP(s) -> case-batch.v1.

No network, publication, R2, deploy, scheduled work, or tracked repository writes.
Original input ZIPs and each source file remain byte-exact in a sealed staging batch.
Conversion is deterministic and editorially unapproved (draft); generated research
links each screen line to citations found *in the supplied article*, not independent
fact checking. Run the existing importer/real UI only after human/editorial review.
"""
from __future__ import annotations
import argparse
import hashlib
import html
import json
import re
import shutil
import sys
import tempfile
import zipfile
from pathlib import Path, PurePosixPath
from urllib.parse import urlsplit

FORMAT = "makemoney.case-batch.v1"
TOPICS = ["overview", "mechanism", "revenue", "acquisition", "operations", "history", "reasons"]
HEADINGS = {"概要":"overview", "商品と支払者":"overview", "仕組み":"mechanism", "仕組みと成長":"mechanism",
            "お金":"revenue", "課金と重要数値":"revenue", "集客":"acquisition", "運営":"operations",
            "経緯":"history", "成功の理由":"reasons"}
SUFFIX_RE = re.compile(r"(?:_r\d+)$")
SOURCE_RE = re.compile(r"\[S(\d+)\]|〔S(\d+)[^〕]*〕")
CODE_RE = re.compile(r"`([^`]+)`")
BOLD_RE = re.compile(r"\*\*(.*?)\*\*|__(.*?)__")
SVG_BAD = re.compile(r"<\s*(?:script|image|foreignObject)\b|\son[a-z]+\s*=|<!DOCTYPE|<!ENTITY|(?:href\s*=\s*['\"]\s*https?://)|url\(\s*['\"]?https?://",re.I)
ZIP_LIMIT = 100 * 1024 * 1024

class IntakeError(Exception):
    pass

def require(ok, msg):
    if not ok: raise IntakeError(msg)

def sha(b: bytes): return hashlib.sha256(b).hexdigest()

def normalize_domain(s: str) -> str:
    x = urlsplit(s if "://" in s else "https://"+s)
    h = (x.hostname or "").lower().removeprefix("www.")
    require(h and "." in h, f"invalid domain: {s}")
    return h

def read_zip(path: Path) -> dict[str, bytes]:
    require(path.is_file(), f"missing ZIP: {path}")
    require(path.stat().st_size <= ZIP_LIMIT, "ZIP archive too large")
    out = {}
    with zipfile.ZipFile(path) as z:
        require(len(z.infolist()) <= 10000, "too many entries")
        total = 0
        for m in z.infolist():
            n = m.filename
            p = PurePosixPath(n)
            require(not p.is_absolute() and ".." not in p.parts and "\\" not in n, f"unsafe ZIP path: {n}")
            require(not n.startswith("/") and not n.startswith("./"),f"unsafe ZIP name: {n}")
            require(((m.external_attr >> 16) & 0o170000) != 0o120000, f"ZIP symlink: {n}")
            require(n not in out, f"duplicate ZIP member: {n}")
            if m.is_dir(): continue
            total += m.file_size
            require(m.file_size <= 20*1024*1024 and total <= ZIP_LIMIT, "ZIP decompression cap")
            out[n] = z.read(m)
    return out

def as_json(b: bytes, label: str):
    try: return json.loads(b.decode("utf-8"))
    except (ValueError,UnicodeError) as e: raise IntakeError(f"invalid JSON {label}: {e}")

def select_cases(files: dict[str, bytes]):
    """Only current cases/, never archives in history/ or old package metadata."""
    roots = []
    if "article.md" in files: roots.append("")
    roots.extend(sorted({x.removesuffix("article.md") for x in files if re.fullmatch(r"cases/[^/]+/article\.md",x)}))
    require(roots, "no recognized article.md (raw old ZIP preserved but no automatic conversion)")
    for root in roots:
        names = [root+x for x in ("article.md","research-rights.json","index.json")]
        require(all(n in files for n in names), f"missing case files in {root}")
        index=as_json(files[names[2]],names[2]);research=as_json(files[names[1]],names[1]);article=files[names[0]].decode("utf8")
        ident=index.get("case_id") or research.get("case_id")
        require(bool(ident) and ident==research.get("case_id"), f"case identity mismatch {root}")
        domain=normalize_domain(index.get("official_domain") or research.get("official_domain") or "")
        require(domain==normalize_domain(research.get("official_domain") or ""), f"case domain mismatch {root}")
        rev=index.get("revision") or research.get("revision") or "r1"
        manifest=files.get(root+"manifest.json")
        if manifest:
            data=as_json(manifest,root+"manifest.json")
            require(data.get("case_id")==ident,"case manifest identity mismatch")
            require(normalize_domain(data.get("official_domain",""))==domain,"case manifest domain mismatch")
            for d in data.get("files",[]):
                label=root+d["path"]
                require(label in files, f"missing listed source {label}")
                require(len(files[label])==d.get("size_bytes") and sha(files[label])==d.get("sha256"), f"wrong SHA: {label}")
        source_files={n[len(root):]:b for n,b in files.items() if n.startswith(root) and n!=root and not n.endswith("/")} if root else {n:b for n,b in files.items() if "/" not in n or n.startswith("figures/")}
        yield {"case_id":ident,"domain":domain,"revision":rev,"root":root,"source_files":source_files,
               "article":article,"research":research,"index":index}

def citations(text: str, source_ids: set[str]):
    keys={"S"+(a or b).zfill(2) for a,b in SOURCE_RE.findall(text)}
    missing=keys-source_ids
    require(not missing, f"article refers to missing source IDs: {sorted(missing)}")
    return sorted(keys, key=lambda x:int(x[1:]))

def clean(text: str):
    text=SOURCE_RE.sub("",text)
    text=CODE_RE.sub(lambda m:m.group(1),text)
    text=BOLD_RE.sub(lambda m:m.group(1) or m.group(2),text)
    text=re.sub(r"\[([^]]+)\]\((https?://[^)]+)\)",r"\1",text)
    text=text.replace("\\|","|")
    return re.sub(r"\s+"," ",text).strip()

def parse_md(md: str, research: dict, case: dict):
    raw=md
    if md.lstrip().startswith("---\n"):
        end=md.find("\n---",4)
        require(end>0,"unclosed YAML frontmatter")
        md=md[end+4:].lstrip("\n")
    h1=re.search(r"^#\s+(.+)$",md,re.M)
    require(h1 is not None, "missing article title")
    headline=clean(h1.group(1))
    inputs=research.get("sources",[])
    require(isinstance(inputs,list) and inputs,"missing sources")
    by_source={s["id"]:s for s in inputs}
    require(len(by_source)==len(inputs),"duplicate source IDs")
    usable=[s for s in inputs if isinstance(s.get("url"),str) and s["url"].startswith("https://")]
    require(len(usable)==len(inputs),"unusable/non-HTTPS source")
    articlesources=[{"no":i,"label":str(s.get("title") or s.get("publisher") or s["url"])[:200],"url":s["url"]}
                    for i,s in enumerate(usable,1)]
    source_no={s["id"]:i for i,s in enumerate(usable,1)}
    source_keys={str(i):f"lib-{s['id']}" for i,s in enumerate(usable,1)}
    records=[];notes=[]
    def row(text):
        cs=citations(text,set(by_source))
        record_id=f"library-line-{len(records)+1:04d}"
        records.append({"key":record_id,"kind":"article_text_snapshot","text":clean(text),
           "source_keys":[f"lib-{s}" for s in cs],"original_text":text,"verification":"UNVERIFIED_FROM_IMPORTED_ARTICLE"})
        if not cs:notes.append(f"unlinked source in {record_id}: {clean(text)[:60]}")
        return {"text":clean(text),"cites":[source_no[s] for s in cs],"recordKeys":[record_id]}
    def parse_sections(md):
        sections=[];current=None;out=[];legacy=[]
        for line in md.splitlines()[1:]:
            m=re.match(r"^##\s+(?:\d+\.\s*)?(.+?)\s*$",line)
            if m:
                name=m.group(1).strip()
                if name in HEADINGS:
                    current={"id":HEADINGS[name],"original_heading":name,"body":[]};sections.append(current)
                    if name not in ("概要","仕組み","お金","集客","運営","経緯","成功の理由"):legacy.append(name)
                else:current=None;out.append(name)
            elif current is not None:current["body"].append(line)
            else:out.append(line)
        return sections,legacy,out
    sections,legacy,front=parse_sections(md)
    require(sections,"no recognized article chapters")
    intro="\n".join(front).split("##")[0].strip()
    intro_texts=[clean(t) for t in re.split(r"\n\s*\n",intro) if clean(t) and not t.startswith("#") and not t.startswith(">")]
    lead=intro_texts[0][:600] if intro_texts else headline
    compiled={k:[] for k in TOPICS}
    # Preserve every reader-visible preamble paragraph; only the first is duplicated as
    # the article's lead. Subsequent figures/numeric callouts must not disappear.
    intro_blocks=[]
    for extra in intro_texts[1:]:
        if extra: intro_blocks.append({"type":"paragraph",**row(extra)})
    compiled["overview"].extend(intro_blocks)
    for section in sections:
        blocks=[];pending=[];p_list=None;table_lines=[]
        def flush_para():
            nonlocal pending
            content=" ".join(v.strip() for v in pending if v.strip())
            if content:blocks.append({"type":"paragraph",**row(content)})
            pending=[]
        def flush_list():
            nonlocal p_list
            if p_list:
                blocks.append(p_list);p_list=None
        def flush_table():
            nonlocal table_lines
            if table_lines:
                if len(table_lines)>=3:
                    hdr=[clean(x) for x in table_lines[0].strip().strip("|").split("|")]
                    rows=[]
                    for t in table_lines[2:]:
                        c=t.strip().strip("|").split("|")
                        if len(c)==len(hdr):
                            obj=row(t);rows.append({"label":clean(c[0]),"cells":[{"text":clean(v)} for v in c[1:]],
                                "cites":obj["cites"],"recordKeys":obj["recordKeys"]})
                    if rows and len(hdr)>=2:blocks.append({"type":"table","columns":hdr,"rows":rows})
                    else:notes.append("unsupported table in "+section["original_heading"])
                else:notes.append("short table in "+section["original_heading"])
                table_lines=[]
        for line in section["body"]+[""]:
            line=line.strip()
            if line.startswith("### "):
                flush_para();flush_list();flush_table()
                blocks.append({"type":"subheading","text":clean(line[4:])});continue
            if line.startswith("|"):
                flush_para();flush_list();table_lines.append(line);continue
            if table_lines:flush_table()
            m=re.match(r"^(?:([-*])|(\d+)\.)\s+(.+)$",line)
            if m:
                flush_para()
                ordered=bool(m.group(2))
                if p_list and p_list["ordered"]!=ordered:flush_list()
                if not p_list:p_list={"type":"list","ordered":ordered,"items":[]}
                obj=row(m.group(3));p_list["items"].append(obj);continue
            if p_list:flush_list()
            if not line:
                flush_para();continue
            if line.startswith(">"):
                notes.append("withheld quote/editorial caveat: "+line[:150]);continue
            if line.startswith("**図解**") or line.startswith("**図**"):
                flush_para();notes.append("figure reference: "+line[:150]);continue
            pending.append(line)
        if blocks:compiled[section["id"]].extend(blocks)
    topics=[{"id":t,"blocks":compiled[t]} for t in TOPICS if compiled[t]]
    require(topics,"no UI-usable article content")
    review_flags=[]
    if legacy:review_flags.append("legacy headings require human editorial restructuring: "+" / ".join(legacy))
    if "history" not in [t["id"] for t in topics]:review_flags.append("missing business founding/history narrative")
    if notes:review_flags.append(f"{len(notes)} blocks lack explicit source linkage / are withheld")
    if any(t["id"]=="acquisition" for t in topics) is False:review_flags.append("missing customer acquisition narrative")
    return {"headline":headline,"lead":lead,"sources":articlesources,"sourceKeys":source_keys,
      "topics":topics,"records":records,"review_flags":review_flags,"notes":notes,
      "raw_article_sha256":sha(raw.encode("utf8")),"legacy":legacy}

def normalize_figs(case):
    result=[];payload={}
    for rel,b in sorted(case["source_files"].items()):
        if not rel.startswith("figures/") or not rel.endswith(".svg"):continue
        txt=b.decode("utf8").lstrip()
        require(not SVG_BAD.search(txt),"unsafe SVG "+rel)
        # Keep byte-exact originals; normalize only derived XML declaration for existing importer.
        derived=re.sub(r"^<\?xml[^>]*\?>\s*","",txt).encode("utf8")
        require(derived.lstrip().startswith(b"<svg") and b"</svg>" in derived,"missing SVG root")
        m=re.search(r"\bviewBox\s*=\s*['\"]\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)['\"]",txt)
        if m:width,height=int(float(m.group(3))),int(float(m.group(4)))
        else:
            w=re.search(r'\bwidth="([0-9]+)"',txt);h=re.search(r'\bheight="([0-9]+)"',txt)
            require(w and h,"SVG lacks viewBox/size: "+rel)
            width,height=int(w.group(1)),int(h.group(1))
        name=PurePosixPath(rel).name
        title=re.search(r"<title[^>]*>([^<]+)</title>",txt)
        fid=name.removesuffix(".svg").lower().replace("_","-")
        require(re.fullmatch(r"[a-z0-9-]{2,80}",fid),"invalid figure id")
        result.append({"id":fid,"file":name,"width":width,"height":height,
                       "alt":html.unescape(title.group(1)) if title else f"{case['domain']} のオリジナル図解"})
        payload[f"figures/{name}"]=derived
    return result,payload

def package_case(case):
    parsed=parse_md(case["article"],case["research"],case)
    figs,svg=normalize_figs(case)
    if figs:
        target=next((t for t in parsed["topics"] if t["id"]=="mechanism"),parsed["topics"][0])
        for f in figs:target["blocks"].append({"type":"figure","figureId":f["id"]})
    eid="ent_lib_"+sha(case["case_id"].encode())[:16]
    title=case["index"].get("brand") or case["research"].get("business_name") or case["index"].get("title") or case["domain"]
    title=str(title).split("｜")[0]
    package_id="library-"+sha((case["case_id"]+"|"+case["revision"]+"|"+parsed["raw_article_sha256"]).encode())[:20]
    research={"schema_version":"make-money.library-article-derived-research.v1", "package_id":package_id,
              "case_id":case["case_id"],"official_domain":case["domain"],"revision":case["revision"],
              "sourceArticleSha256":parsed["raw_article_sha256"],
              "evidence_disclaimer":"Unverified ARTICLE TEXT SNAPSHOT, not independent fact checking. Original research-rights.json retained separately.",
              "sources":[{"key":f"lib-{s['id']}","url":s["url"],"label":s.get("title",s["id"])} for s in case["research"]["sources"]],
              "records":parsed["records"],"originalResearch":case["research"],"editorialReviewFlags":parsed["review_flags"],
              "notes":parsed["notes"]}
    research_bytes=(json.dumps(research,ensure_ascii=False,indent=2)+"\n").encode()
    article={"schema":"make-money.case-article.v2","entityId":eid,"name":title,"revision":case["revision"],
             "reviewState":"draft","generation":5,"basedOn":{"packageId":package_id,"submissionSha256":sha(research_bytes)},
             "listLine":parsed["headline"],"headline":parsed["headline"],"lead":parsed["lead"],"sources":parsed["sources"],
             "sourceKeys":parsed["sourceKeys"],"kpis":[],"topics":parsed["topics"],"figures":figs,
             "editorialChanges":[{"kind":"other","where":"取込","text":"Source article preserved verbatim in original intake.",
                 "reason":"Import is structural review draft, not an editorially approved rewrite.","recordKeys":[]}]}
    url=case["research"].get("official_url") or case["research"].get("corporate_identity",{}).get("canonical_official_url") or "https://"+case["domain"]
    identity={"entityId":eid,"name":title,"officialUrl":url,"country":case["index"].get("country", "未確認"),
              "category":"事例"}
    files={"article.json":(json.dumps(article,ensure_ascii=False,indent=2)+"\n").encode(),
           "research.json":research_bytes,"identity.json":(json.dumps(identity,ensure_ascii=False,indent=2)+"\n").encode(),**svg}
    return eid,files,parsed["review_flags"],parsed["notes"]

def main(argv=None):
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--input",action="append",required=True,help="ZIP file or directory of ZIP files; may repeat")
    ap.add_argument("--out",default=".catalog-release-preview/library-intake",help="private output directory")
    opts=ap.parse_args(argv)
    paths=[]
    for pattern in opts.input:
        p=Path(pattern).expanduser().resolve()
        if p.is_dir(): paths.extend(sorted(p.glob("*.zip")))
        else:paths.append(p)
    paths=list(dict.fromkeys(paths))
    require(paths,"no ZIP inputs")
    originals=[];collisions={};by_case={};batch_digests=[];duplicates=[]
    for p in paths:
        raw=p.read_bytes();batch_digests.append(sha(raw))
        files=read_zip(p);originals.append((p,raw,files))
        for c in select_cases(files):
            k=c["case_id"];rev=c["revision"];fingerprint=sha(c["source_files"]["article.md"]+c["source_files"]["research-rights.json"])
            if k in by_case:
                prior=by_case[k]
                if prior["revision"]==rev and prior["fingerprint"]==fingerprint:
                    duplicates.append({"case_id":k,"revision":rev,"input":p.name,"reason":"byte-identical article/research"});continue
                if prior["revision"]==rev:raise IntakeError(f"same case and revision differ: {k} {rev}; manual conflict review required")
                # Higher revision selected for review, every original ZIP separately preserved.
                def revnum(s):return int(s[1:]) if re.fullmatch(r"r\d+",s) else -1
                if revnum(rev)<=revnum(prior["revision"]):
                    duplicates.append({"case_id":k,"revision":rev,"input":p.name,"reason":"older revision retained in original inputs"});continue
            c["fingerprint"]=fingerprint;by_case[k]=c
    require(by_case,"no cases in ZIPs")
    domains={}
    for c in by_case.values():
        if c["domain"] in domains and domains[c["domain"]]!=c["case_id"]:
            raise IntakeError(f"same domain different case_id: {c['domain']}; manual identity review required")
        domains[c["domain"]]=c["case_id"]
    batch_id="library-"+sha(("|".join(sorted(batch_digests))).encode())[:20]
    outroot=Path(opts.out).expanduser().resolve();outroot.mkdir(parents=True,exist_ok=True)
    target=outroot/batch_id
    if target.exists():
        receipt=as_json((target/"receipt.json").read_bytes(),"receipt.json")
        require(receipt.get("batch_id")==batch_id,"existing batch conflict")
        archive=target/"case-batch-review-only.zip"
        require(archive.is_file() and sha(archive.read_bytes())==receipt.get("case_batch_zip_sha256"),"existing staged batch corrupted")
        for i,(p,b,_) in enumerate(originals):
            original=target/"original-zips"/f"{i:03d}_{p.name}"
            require(original.is_file() and original.read_bytes()==b,"existing source ZIP corrupted")
        print(json.dumps({"status":"UNCHANGED_REIMPORT","new_cases":0,"batch_id":batch_id,"output":str(target),
                          "case_count":receipt.get("case_count")},ensure_ascii=False,indent=2))
        return
    with tempfile.TemporaryDirectory(prefix="makemoney-library-") as td:
        work=Path(td);inputs=work/"original-zips";inputs.mkdir()
        all_files={};case_status=[]
        for i,(p,b,_) in enumerate(originals): (inputs/f"{i:03d}_{p.name}").write_bytes(b)
        for case in sorted(by_case.values(),key=lambda x:x["domain"]):
            eid,payload,flags,notes=package_case(case)
            original=work/"source-cases"/eid/case["revision"];original.mkdir(parents=True)
            for name,b in case["source_files"].items():
                f=original/name;f.parent.mkdir(parents=True,exist_ok=True);f.write_bytes(b)
            for name,b in payload.items():
                f=work/"cases"/eid/name;f.parent.mkdir(parents=True,exist_ok=True);f.write_bytes(b)
            case_status.append({"entity_id":eid,"case_id":case["case_id"],"official_domain":case["domain"],
                                "revision":case["revision"],"status":"DRAFT_REVIEW_ONLY",
                                "editorial_flags":flags,"unlinked_or_withheld":len(notes),
                                "original_article_sha256":sha(case["source_files"]["article.md"])})
            desc=[]
            for name,b in payload.items():desc.append({"path":f"cases/{eid}/{name}","bytes":len(b),"sha256":sha(b)})
            all_files[eid] = desc
        manifest={"format":FORMAT,"batch_id":batch_id,"created_at":"2026-10-16",
                  "delivery":"review_only","cases":[{"entity_id":x["entity_id"],"name":as_json((work/"cases"/x["entity_id"]/"identity.json").read_bytes(),"identity")["name"],
                      "official_url":as_json((work/"cases"/x["entity_id"]/"identity.json").read_bytes(),"identity")["officialUrl"],
                      "files":all_files[x["entity_id"]]} for x in case_status]}
        pack=work/"case-batch-review-only.zip"
        with zipfile.ZipFile(pack,"w",compression=zipfile.ZIP_DEFLATED) as z:
            z.writestr("batch-manifest.json",json.dumps(manifest,ensure_ascii=False,indent=2)+"\n")
            for f in sorted((work/"cases").rglob("*")):
                if f.is_file():z.write(f,str(f.relative_to(work)))
        receipt={"batch_id":batch_id,"case_count":len(case_status),"input_zips":[{"name":p.name,"sha256":sha(b),"bytes":len(b)} for p,b,_ in originals],
                 "duplicates_skipped":duplicates,"cases":case_status,"publication":False,"r2_write":False,
                 "source_binaries_preserved":True,"case_batch_zip_sha256":sha(pack.read_bytes()),"real_UI_test":"NOT_RUN","editorial_approval":"NOT_RUN",
                 "meaning_of_validation":"Original and conversion integrity only; derived research records are not independently verified."}
        (work/"receipt.json").write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
        # Zero-touch private overview, explicitly not presented as actual project React UI.
        rows="\n".join(f"<tr><td>{html.escape(x['official_domain'])}</td><td>{html.escape(x['revision'])}</td><td>編集待ち</td><td>{html.escape('; '.join(x['editorial_flags']))}</td></tr>" for x in case_status)
        (work/"review-index.html").write_text(f"<!doctype html><meta charset='utf-8'><title>MAKEMONEY private intake receipt</title><style>body{{background:#0d1015;color:#f0f2f4;font:15px system-ui;padding:32px}} table{{border-collapse:collapse;width:100%}}td,th{{padding:12px;border:1px solid #343c46}}small{{color:#99aabb}}</style><h1>MAKEMONEY｜受領した原稿（非公開・未承認）</h1><p><small>実際のMAKEMONEY UIではない。原稿変換とプレビューには別途Codex実行が必要。</small></p><table><tr><th>事例</th><th>改訂</th><th>公開</th><th>残課題</th></tr>{rows}</table>",encoding="utf8")
        shutil.move(str(work),str(target))
    print(json.dumps({"status":"STAGED_REVIEW_ONLY","batch_id":batch_id,"case_count":len(case_status),"duplicates_skipped":len(duplicates),
                      "input_zip_count":len(paths),"package":str(target/"case-batch-review-only.zip"),
                      "receipt":str(target/"receipt.json"),"real_UI_test":"NOT_RUN","publication":False},ensure_ascii=False,indent=2))

if __name__=="__main__":
    try:main()
    except (IntakeError,UnicodeError,ValueError,KeyError,zipfile.BadZipFile,PermissionError,OSError) as e:
        print("INTAKE BLOCKED: "+str(e),file=sys.stderr);sys.exit(1)
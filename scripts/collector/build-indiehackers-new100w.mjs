#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const templatePath = path.join(process.cwd(), "scripts/collector/build-indiehackers-new100o.mjs");
const template = fs.readFileSync(templatePath, "utf8")
  .replaceAll("new100o", "new100w")
  .replaceAll("new100O", "new100W")
  .replaceAll("codex-20260916-ih-new100o", "codex-20260916-ih-new100w")
  .replaceAll("revenue>=100,revenue<=499", "revenue>=1,revenue<=1000000000")
  .replaceAll(
    'const [name, targetDomain] = line.split(" [CLAIMED:")[0].split(" — ");',
    () => 'const raw = line.split(" [CLAIMED:")[0]; const head = raw.replace(/ — IHNEW100W$/, ""); const pivot = head.lastIndexOf(" — "); const name = pivot >= 0 ? head.slice(0, pivot) : head; const targetDomain = pivot >= 0 ? head.slice(pivot + 3) : "";',
  )
  .replace(
    'tags.some((tag) => ["founders-solo", "employees-0", "employees-under-10", "employees-10-plus"].includes(tag))',
    "tags.some((tag) => /^founders-|^employees-/.test(tag))",
  );

await import(`data:text/javascript;charset=utf-8,${encodeURIComponent(template)}`);

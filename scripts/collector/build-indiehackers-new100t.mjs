#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const templatePath = path.join(process.cwd(), "scripts/collector/build-indiehackers-new100o.mjs");
const template = fs.readFileSync(templatePath, "utf8")
  .replaceAll("new100o", "new100t")
  .replaceAll("new100O", "new100T")
  .replaceAll("codex-20260916-ih-new100o", "codex-20260916-ih-new100t")
  .replaceAll("revenue>=100,revenue<=499", "revenue>=500,revenue<=1000000");

await import(`data:text/javascript;charset=utf-8,${encodeURIComponent(template)}`);

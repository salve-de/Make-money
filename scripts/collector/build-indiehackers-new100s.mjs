#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const templatePath = path.join(process.cwd(), "scripts/collector/build-indiehackers-new100o.mjs");
const template = fs.readFileSync(templatePath, "utf8")
  .replaceAll("new100o", "new100s")
  .replaceAll("new100O", "new100S")
  .replaceAll("codex-20260916-ih-new100o", "codex-20260916-ih-new100s");

await import(`data:text/javascript;charset=utf-8,${encodeURIComponent(template)}`);

#!/usr/bin/env node

import fs from 'node:fs/promises';

function sanitizeUnicode(value) {
  const text = String(value ?? '');
  let output = '';
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = text.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        output += text[index] + text[index + 1];
        index += 1;
      } else {
        output += '\ufffd';
      }
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      output += '\ufffd';
    } else {
      output += text[index];
    }
  }
  return output;
}

function sanitize(value) {
  if (typeof value === 'string') return sanitizeUnicode(value);
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitize(item)]));
  }
  return value;
}

const paths = process.argv.slice(2);
if (paths.length === 0) throw new Error('Pass one or more JSON paths');
for (const path of paths) {
  const input = JSON.parse(await fs.readFile(path, 'utf8'));
  await fs.writeFile(path, `${JSON.stringify(sanitize(input), null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ path, sanitized: true }));
}

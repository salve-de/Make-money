import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { cleanText, escapeHTML, safeExternalUrl, stableHash, validateCorrection, validateServiceSubmission } from "../src/v2/core.js";

test("HTML escaping prevents executable markup", () => {
  assert.equal(escapeHTML(`<img src=x onerror="alert(1)">&'`), "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;&#39;");
});

test("control characters and oversized text are removed or bounded", () => {
  assert.equal(cleanText("a\u0000b\u0007c", 10), "abc");
  assert.equal(cleanText("x".repeat(100), 12).length, 12);
});

test("browser URL validation rejects non-http, private ranges and credentials", () => {
  const rejected = [
    "javascript:alert(1)", "data:text/html,test", "file:///etc/passwd", "http://localhost:8080",
    "http://10.0.0.1", "http://172.16.0.1", "http://192.168.1.2", "http://169.254.169.254/latest/meta-data",
    "https://user:password@example.com/path",
  ];
  for (const value of rejected) assert.equal(safeExternalUrl(value), null, value);
  assert.equal(safeExternalUrl("https://example.com/path#secret"), "https://example.com/path");
});

test("submissions cannot smuggle dangerous URL schemes", () => {
  const result = validateServiceSubmission({
    url: "javascript:alert(document.domain)", name: "Danger", oneLiner: "十分に長いサービス説明をここへ入力する", category: "AI・自動化", email: "owner@example.com",
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.url);
});

test("corrections require evidence URL and meaningful claim", () => {
  assert.equal(validateCorrection({ claim: "誤り", source: "https://example.com" }).valid, false);
  assert.equal(validateCorrection({ claim: "表示された金額は契約上限であり実支出ではありません", source: "https://example.com/source" }).valid, true);
});

test("stable hash is deterministic and changes with content", () => {
  assert.equal(stableHash("same"), stableHash("same"));
  assert.notEqual(stableHash("same"), stableHash("different"));
});

test("browser source never embeds service-role or payment secrets", () => {
  const source = ["src/v2/app.js", "src/v2/cloud.js", "src/v2/store.js"].map((file) => fs.readFileSync(file, "utf8")).join("\n");
  for (const secret of ["SUPABASE_SERVICE_ROLE_KEY", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "RESEND_API_KEY"]) {
    assert.equal(source.includes(secret), false, secret);
  }
});

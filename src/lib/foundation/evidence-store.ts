import type { EvidenceLocator } from "@/shared/terminal";
import { sha256Sync } from "@/shared/sha256";
import evidenceCatalogData from "../../../data/foundation-evidence-catalog.json";

export interface FoundationEvidenceRecord {
  evidenceId: string;
  sourceId: string;
  sourceUrl?: string;
  originalObjectKey: string;
  originalSha256: string; // 64-char valid hex SHA-256 of the immutable raw payload bytes
  contentType: string;
  locator: EvidenceLocator;
  excerpt: string; // text excerpt extracted from original object
  retrievedAt?: string;
  rightsStatus?: string;
}

export interface RawPayloadVerificationResult {
  valid: boolean;
  actualSha256?: string;
  extractedExcerpt?: string;
  error?: string;
}

// In-memory catalogs
const staticCatalog = new Map<string, FoundationEvidenceRecord>();
const testCatalog = new Map<string, FoundationEvidenceRecord>();
const testRawPayloads = new Map<string, Uint8Array>();

// Initialize static catalog
if (Array.isArray(evidenceCatalogData)) {
  for (const item of evidenceCatalogData as unknown as FoundationEvidenceRecord[]) {
    if (item && item.evidenceId) {
      staticCatalog.set(item.evidenceId, item);
    }
  }
}

/**
 * Resolves a foundation evidence ID to its immutable original evidence record.
 * Returns null if the evidence does not exist (strictly fail-closed, no synthetic fallback).
 */
export function resolveFoundationEvidence(evidenceId: string): FoundationEvidenceRecord | null {
  if (!evidenceId || typeof evidenceId !== "string") {
    return null;
  }
  const trimmed = evidenceId.trim();
  if (!trimmed) {
    return null;
  }

  // 1. Check test registry first
  if (testCatalog.has(trimmed)) {
    return testCatalog.get(trimmed)!;
  }

  // 2. Check static foundation catalog
  if (staticCatalog.has(trimmed)) {
    return staticCatalog.get(trimmed)!;
  }

  return null;
}

/**
 * Reads the immutable raw payload bytes for a given originalObjectKey.
 * Checks in-memory test store first, then attempts Node.js filesystem read if available.
 */
export function readOriginalPayloadBytes(originalObjectKey: string): Uint8Array | null {
  if (!originalObjectKey || typeof originalObjectKey !== "string") return null;
  const trimmed = originalObjectKey.trim();
  if (!trimmed) return null;

  // 1. Check test raw payloads (in-memory)
  if (testRawPayloads.has(trimmed)) {
    return testRawPayloads.get(trimmed)!;
  }

  // 2. In Node.js environment, dynamically read from data/foundation-raw
  if (typeof process !== "undefined" && process.versions?.node) {
    try {
      // Use indirect require to prevent webpack from attempting to bundle 'fs'/'path' for client
      const dynamicRequire = new Function("moduleName", "return require(moduleName);");
      const fs = dynamicRequire("fs");
      const path = dynamicRequire("path");
      const filePath = path.resolve(process.cwd(), "data", "foundation-raw", trimmed);
      if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
        return new Uint8Array(buffer);
      }
    } catch {
      // Ignore in non-filesystem environments
    }
  }

  return null;
}

/**
 * Verifies that the actual immutable bytes exist, match originalSha256,
 * and that applying the locator to the actual bytes yields the excerpt.
 * Pure TypeScript & browser-safe (uses sha256Sync).
 */
export function verifyRawPayload(record: FoundationEvidenceRecord): RawPayloadVerificationResult {
  if (!record || !record.originalObjectKey) {
    return { valid: false, error: "MISSING_RECORD_OR_KEY" };
  }

  const rawBytes = readOriginalPayloadBytes(record.originalObjectKey);
  if (!rawBytes) {
    return { valid: false, error: "RAW_BYTES_NOT_FOUND" };
  }

  // 1. Verify SHA-256 of actual bytes matches record.originalSha256
  const rawText = new TextDecoder().decode(rawBytes);
  const actualSha256 = sha256Sync(rawText);
  if (actualSha256.toLowerCase() !== record.originalSha256.toLowerCase()) {
    return {
      valid: false,
      actualSha256,
      error: `SHA256_MISMATCH: expected ${record.originalSha256} but got ${actualSha256}`,
    };
  }

  // 2. Apply locator to actual bytes to extract excerpt
  let extractedText = "";
  if (
    record.locator &&
    record.locator.type === "text" &&
    typeof record.locator.start === "number" &&
    typeof record.locator.end === "number"
  ) {
    extractedText = rawText.slice(record.locator.start, record.locator.end);
  } else if (record.locator && record.locator.type === "text" && record.locator.targetText) {
    extractedText = record.locator.targetText;
  }

  if (extractedText !== record.excerpt) {
    return {
      valid: false,
      actualSha256,
      extractedExcerpt: extractedText,
      error: "EXCERPT_MISMATCH: locator slice does not match catalog excerpt",
    };
  }

  return {
    valid: true,
    actualSha256,
    extractedExcerpt: extractedText,
  };
}

/**
 * For testing purposes only: register a mock evidence record.
 */
export function registerFoundationEvidenceForTesting(record: FoundationEvidenceRecord): void {
  testCatalog.set(record.evidenceId, record);
}

/**
 * For testing purposes only: register mock raw payload bytes.
 */
export function registerMockRawPayloadForTesting(originalObjectKey: string, bytes: Uint8Array | string): void {
  const byteArr = typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes;
  testRawPayloads.set(originalObjectKey, byteArr);
}

/**
 * For testing purposes only: clear test registries.
 */
export function clearTestEvidenceRegistry(): void {
  testCatalog.clear();
  testRawPayloads.clear();
}

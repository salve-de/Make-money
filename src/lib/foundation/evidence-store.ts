import type { EvidenceLocator } from "@/shared/terminal";
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

// In-memory catalog index for O(1) lookup
const staticCatalog = new Map<string, FoundationEvidenceRecord>();
const testCatalog = new Map<string, FoundationEvidenceRecord>();

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
 * For testing purposes only: register a mock evidence record.
 */
export function registerFoundationEvidenceForTesting(record: FoundationEvidenceRecord): void {
  testCatalog.set(record.evidenceId, record);
}

/**
 * For testing purposes only: clear test registry.
 */
export function clearTestEvidenceRegistry(): void {
  testCatalog.clear();
}

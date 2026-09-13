/**
 * Semantic Claim Support Verifier
 * 
 * Verifies that an immutable evidence excerpt actually supports the claimed value.
 * Prevents "hash-valid but semantically unsupported or falsified" claims from passing promotion gates.
 */

export interface ClaimSupportResult {
  supported: boolean;
  reason?: string;
  extractedValues?: number[];
}

/**
 * Normalizes Japanese and international currency/number text to extract all candidate numbers.
 * Supports:
 * - Direct integers: 6072000, 6,072,000
 * - Japanese units: 607.2万, 607.2万円, 8.3億, 8.3億円, 100万, 1000万円
 * - Standard currency symbols: ¥6,072,000, $40,000, etc.
 */
export function extractSupportedNumericValues(text: string): number[] {
  if (!text || typeof text !== "string") return [];

  const results = new Set<number>();

  // 1. Japanese 億 (oku = 100,000,000)
  const okuRegex = /([\d,]+(?:\.\d+)?)\s*億/g;
  let match: RegExpExecArray | null;
  while ((match = okuRegex.exec(text)) !== null) {
    const rawNum = parseFloat(match[1].replace(/,/g, ""));
    if (!Number.isNaN(rawNum)) {
      results.add(Math.round(rawNum * 100_000_000));
    }
  }

  // 2. Japanese 万 (man = 10,000)
  const manRegex = /([\d,]+(?:\.\d+)?)\s*万/g;
  while ((match = manRegex.exec(text)) !== null) {
    const rawNum = parseFloat(match[1].replace(/,/g, ""));
    if (!Number.isNaN(rawNum)) {
      results.add(Math.round(rawNum * 10_000));
    }
  }

  // 3. Comma-separated or bare large numbers (e.g. 6,072,000 or 6072000)
  const numRegex = /(?:^|[^\d.])([1-9]\d{0,2}(?:,\d{3})+|[1-9]\d{4,})(?!\d)/g;
  while ((match = numRegex.exec(text)) !== null) {
    const rawNum = parseInt(match[1].replace(/,/g, ""), 10);
    if (!Number.isNaN(rawNum)) {
      results.add(rawNum);
    }
  }

  return Array.from(results);
}

/**
 * Checks if the claimed value is semantically supported by the evidence excerpt.
 */
export function verifyClaimSupport(
  claimKey: string,
  claimValue: unknown,
  excerpt: string
): ClaimSupportResult {
  if (!excerpt || typeof excerpt !== "string" || !excerpt.trim()) {
    return { supported: false, reason: "EMPTY_EXCERPT" };
  }

  // Check numeric revenue facts (monthlyRevenue, annualRevenue, etc.)
  if (claimKey === "pnl.monthlyRevenue" || claimKey === "monthlyRevenue") {
    if (typeof claimValue !== "number" || Number.isNaN(claimValue) || claimValue <= 0) {
      return { supported: false, reason: "INVALID_CLAIM_VALUE" };
    }

    const extracted = extractSupportedNumericValues(excerpt);
    if (extracted.length === 0) {
      return {
        supported: false,
        reason: "NO_REVENUE_FIGURES_IN_EXCERPT",
        extractedValues: extracted,
      };
    }

    // Direct exact match
    if (extracted.includes(claimValue)) {
      return { supported: true, extractedValues: extracted };
    }

    // Match within 1% rounding tolerance for currency conversion rounding
    const hasCloseMatch = extracted.some((val) => {
      const diff = Math.abs(val - claimValue);
      return diff / claimValue <= 0.01;
    });

    if (hasCloseMatch) {
      return { supported: true, extractedValues: extracted };
    }

    return {
      supported: false,
      reason: `VALUE_MISMATCH: Claimed ${claimValue} not supported by extracted [${extracted.join(", ")}]`,
      extractedValues: extracted,
    };
  }

  // Generic text claims: check if the string value appears in the excerpt
  if (typeof claimValue === "string" && claimValue.trim()) {
    if (excerpt.includes(claimValue.trim())) {
      return { supported: true };
    }
    return { supported: false, reason: "STRING_CLAIM_NOT_IN_EXCERPT" };
  }

  // Default fail-closed for unhandled claim types
  return { supported: false, reason: "UNSUPPORTED_CLAIM_TYPE" };
}

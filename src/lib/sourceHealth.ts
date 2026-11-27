// 規則 ①：配息來源健康度（SHS）。權重與燈號見 docs/product-rules.md。
import type { Composition } from "@/data/etfInsights";

export const SHS_WEIGHTS = { dividendIncome: 1, capitalGain: 0.5, equalization: 0.2 } as const;

export type HealthLevel = "good" | "warn" | "bad";
export type SourceHealth = { score: number; level: HealthLevel; reason: string };

/** 組成不完整（有未細分的部分）時回傳 null，不硬算分數 */
export function sourceHealth(c: Composition | null): SourceHealth | null {
  if (!c || c.dividendIncome === null || c.capitalGain === null || c.equalization === null || c.other) {
    return null;
  }
  const score =
    c.dividendIncome * SHS_WEIGHTS.dividendIncome +
    c.capitalGain * SHS_WEIGHTS.capitalGain +
    c.equalization * SHS_WEIGHTS.equalization;

  let level: HealthLevel = score >= 80 ? "good" : score >= 50 ? "warn" : "bad";
  let reason =
    level === "good" ? "配息主要來自股利所得" : level === "warn" ? "部分依賴非經常性來源" : "配息大量依賴非經常性來源";
  if (c.equalization > 30 && level === "good") {
    level = "warn";
    reason = "收益平準金超過 30%";
  }
  return { score: Math.round(score), level, reason };
}

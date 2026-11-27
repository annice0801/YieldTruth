import { Fragment } from "react";
import { GLOSSARY_KEYS } from "@/data/glossary";
import Term from "./Term";

/**
 * 把一段文字裡的專有名詞自動換成可點擊的 <Term>。
 * 同一個名詞在同一段只標第一次，避免整段都是底線。
 */
export function withTerms(text: string, seen: Set<string> = new Set()): React.ReactNode {
  const pattern = new RegExp(`(${GLOSSARY_KEYS.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g");
  const parts = text.split(pattern);
  return parts.map((p, i) => {
    if (i % 2 === 1 && !seen.has(p)) {
      seen.add(p);
      return <Term key={i} t={p} />;
    }
    return <Fragment key={i}>{p}</Fragment>;
  });
}

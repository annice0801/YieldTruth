// 下單前「紅黃綠燈體檢卡」：把翻投信官網（配息來源）、看籌碼、算折溢價、查填息紀錄濃縮成一顆燈號＋白話結論。
import { ETF_INSIGHTS, type Composition } from "@/data/etfInsights";
import { getDb } from "./mongodb";
import { currentPrice, fetchEtfNavs, institutional5d, ma20 } from "./market";
import { sourceHealth } from "./sourceHealth";
import { ensureDividends, ensurePrices, type SyncReport } from "./sync";
import { todayTaipei } from "./twse";

/** 所有門檻集中在這裡，調整後同步更新 docs/product-rules.md */
export const CHECK_RULES = {
  premium: { yellowAbove: 1, redAbove: 3 }, // 溢價 %
  fill: { windowDays: 60, lookback: 8, greenRate: 75, yellowRate: 50, minSamples: 3 }, // 60 交易日內填息率 %
  chips: { yellowSellRatio: -0.5 }, // 外資＋投信 5 日買賣超 ÷ 發行張數 %（自營商多為造市避險，不計入）
} as const;

export type Level = "green" | "yellow" | "red" | "unknown";
export type Check = {
  key: "premium" | "source" | "fill" | "chips";
  title: string;
  level: Level;
  summary: string; // 一句白話（結論用）
  detail: string; // 第二層說明
};

export type FillRecord = { exDate: string; cash: number; prevClose: number; refPrice: number; fillDays: number | null; pending: boolean };

export type CheckCard = {
  code: string;
  name: string;
  light: Exclude<Level, "unknown">;
  headline: string;
  checks: Check[];
  price: { value: number; at: string } | null;
  nav: { value: number; premiumPct: number; unitsChange: number } | null;
  ma20: number | null;
  latestDividend: FillRecord | null;
  fillHistory: FillRecord[];
  composition: (Composition & { asOf: string; sourceTitle: string; sourceUrl: string }) | null;
  chips: Awaited<ReturnType<typeof institutional5d>> | null;
  twseRequests: number;
};

const RANK: Record<Level, number> = { red: 3, yellow: 2, green: 1, unknown: 0 };
const fmtPct = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;

// ---------- 四項檢查 ----------

function checkPremium(nav: CheckCard["nav"]): Check {
  const title = "折溢價";
  if (!nav) return { key: "premium", title, level: "unknown", summary: "無即時淨值", detail: "非 ETF 或投信尚未提供預估淨值。" };
  const p = nav.premiumPct;
  const { yellowAbove, redAbove } = CHECK_RULES.premium;
  const level: Level = p > redAbove ? "red" : p > yellowAbove ? "yellow" : "green";
  const summary =
    level === "red" ? `溢價 ${fmtPct(p)} 過高` : level === "yellow" ? `溢價 ${fmtPct(p)} 偏高` : p < 0 ? `折價 ${Math.abs(p).toFixed(2)}%，比淨值便宜` : `溢價 ${fmtPct(p)} 正常`;
  return {
    key: "premium",
    title,
    level,
    summary,
    detail: `成交價比投信預估淨值 ${nav.value} 元${p >= 0 ? "高" : "低"} ${Math.abs(p).toFixed(2)}%。溢價超過 ${yellowAbove}% 代表你多付錢買同一籃股票，溢價收斂時會直接吃掉報酬。`,
  };
}

function checkSource(c: CheckCard["composition"]): Check {
  const title = "配息來源";
  if (!c) return { key: "source", title, level: "unknown", summary: "尚未收錄配息組成", detail: "目前只收錄 ETF 配息觀察頁中整理過的 ETF。" };
  const health = sourceHealth(c);
  const nonDividend = (c.capitalGain ?? 0) + (c.equalization ?? 0);
  // 組成不完整時（例如只知道資本利得占比），用已知的非股利占比判斷
  const level: Level = health
    ? ({ good: "green", warn: "yellow", bad: "red" } as const)[health.level]
    : nonDividend > 50
      ? "yellow"
      : "unknown";
  const biggest =
    (c.equalization ?? 0) > (c.capitalGain ?? 0)
      ? `收益平準金占比 ${c.equalization}%`
      : `資本利得占比 ${Number((c.capitalGain ?? 0).toFixed(0))}%`;
  const summary = level === "green" ? "配息主要來自股利" : level === "unknown" ? "配息組成不完整" : `${biggest}`;
  return {
    key: "source",
    title,
    level,
    summary,
    detail: `${c.period}（${c.basis}）。${health ? `來源健康度 ${health.score} 分。` : ""}資本利得是賣股實現的獲利，行情反轉時最先縮水；收益平準金則是新投資人的申購款。`,
  };
}

function checkFill(history: FillRecord[]): Check {
  const title = "填息紀錄";
  const { windowDays, greenRate, yellowRate, minSamples } = CHECK_RULES.fill;
  if (history.length === 0) {
    return { key: "fill", title, level: "yellow", summary: "還沒配過息", detail: "這檔沒有任何除息紀錄，配息能力尚未經過驗證；新上市或首次評價不配息的 ETF 都會落在這裡。" };
  }
  const settled = history.filter((h) => !h.pending);
  if (settled.length < minSamples) {
    return { key: "fill", title, level: "unknown", summary: "配息次數不足", detail: `需要至少 ${minSamples} 次已滿 ${windowDays} 個交易日的配息紀錄。` };
  }
  const filled = settled.filter((h) => h.fillDays !== null && h.fillDays <= windowDays).length;
  const rate = (filled / settled.length) * 100;
  const level: Level = rate >= greenRate ? "green" : rate >= yellowRate ? "yellow" : "red";
  const days = settled.filter((h) => h.fillDays !== null).map((h) => h.fillDays!).sort((a, b) => a - b);
  const median = days.length ? days[Math.floor(days.length / 2)] : null;
  return {
    key: "fill",
    title,
    level,
    summary:
      level === "green"
        ? `近 ${settled.length} 次有 ${filled} 次在 ${windowDays} 天內填息`
        : `近 ${settled.length} 次只有 ${filled} 次在 ${windowDays} 天內填息`,
    detail: `${windowDays} 個交易日內填息率 ${rate.toFixed(0)}%${median !== null ? `，填息天數中位數 ${median} 天` : ""}。沒填息的那幾次，領到的配息等於拿回自己的本金。`,
  };
}

function checkChips(chips: CheckCard["chips"], units: number | null): Check {
  const title = "法人籌碼";
  if (!chips || chips.days === 0 || !units) return { key: "chips", title, level: "unknown", summary: "無法人資料", detail: "近 5 個交易日查無三大法人買賣超紀錄。" };
  const net = chips.foreign + chips.trust;
  const ratio = (net / (units / 1000)) * 100;
  const level: Level = ratio <= CHECK_RULES.chips.yellowSellRatio ? "yellow" : "green";
  const dir = net >= 0 ? "買超" : "賣超";
  return {
    key: "chips",
    title,
    level,
    summary: level === "yellow" ? `外資投信 5 日${dir} ${Math.abs(net).toLocaleString()} 張` : `外資投信 5 日${dir} ${Math.abs(net).toLocaleString()} 張，影響不大`,
    detail: `${chips.from} 至 ${chips.to}：外資 ${chips.foreign.toLocaleString()} 張、投信 ${chips.trust.toLocaleString()} 張（占發行張數 ${ratio.toFixed(2)}%）；自營商 ${chips.dealer.toLocaleString()} 張多為造市避險，不列入判斷。`,
  };
}

// ---------- 填息歷史（規則 ②） ----------

export async function fillHistory(code: string, report: SyncReport): Promise<FillRecord[]> {
  const db = await getDb();
  const today = todayTaipei();
  await ensureDividends(Number(today.slice(0, 4)) - 3, report);
  const divs = (
    await db
      .collection("dividends")
      .find({ code, exDate: { $lte: today } }, { projection: { _id: 0, code: 0 } })
      .sort({ exDate: -1 })
      .limit(CHECK_RULES.fill.lookback)
      .toArray()
  ).reverse() as unknown as Omit<FillRecord, "fillDays" | "pending">[];
  if (divs.length === 0) return [];

  await ensurePrices(code, divs[0].exDate, report);
  const prices = (await db
    .collection("prices")
    .find({ code, date: { $gte: divs[0].exDate } }, { projection: { _id: 0, date: 1, close: 1 } })
    .sort({ date: 1 })
    .toArray()) as unknown as { date: string; close: number }[];

  return divs.map((d) => {
    const start = prices.findIndex((p) => p.date >= d.exDate);
    if (start < 0) return { ...d, fillDays: null, pending: true };
    const after = prices.slice(start);
    const hit = after.findIndex((p) => p.close >= d.prevClose);
    const fillDays = hit >= 0 ? hit + 1 : null;
    return { ...d, fillDays, pending: fillDays === null && after.length < CHECK_RULES.fill.windowDays };
  });
}

// ---------- 組合 ----------

const cache = new Map<string, { at: number; card: CheckCard }>();

export async function buildCheckCard(code: string): Promise<CheckCard> {
  const hit = cache.get(code);
  if (hit && Date.now() - hit.at < 30_000) return hit.card;

  const report: SyncReport = { requests: 0 };
  const navs = await fetchEtfNavs();
  const etf = navs.get(code) ?? null;
  const price = await currentPrice(code);

  const [history, chips, ma] = await Promise.all([
    fillHistory(code, report),
    etf ? institutional5d(code, report).catch(() => null) : Promise.resolve(null),
    ma20(code, price?.price ?? null, report).catch(() => null),
  ]);

  const insight = ETF_INSIGHTS.find((e) => e.code === code);
  const composition =
    insight?.composition && insight.sources[0]
      ? { ...insight.composition, asOf: "2026-11-26", sourceTitle: insight.sources[0].title, sourceUrl: insight.sources[0].url }
      : null;

  const db = await getDb();
  const sec = await db.collection("securities").findOne({ _id: code as never });
  const name = etf?.name ?? insight?.name ?? (sec?.name as string | undefined) ?? code;
  const navInfo = etf ? { value: etf.nav, premiumPct: etf.premiumPct, unitsChange: etf.unitsChange } : null;

  const checks = [
    checkPremium(navInfo),
    checkSource(composition),
    checkFill(history),
    checkChips(chips, etf?.units ?? null),
  ];
  const known = checks.filter((c) => c.level !== "unknown");
  const worst = known.reduce<Level>((w, c) => (RANK[c.level] > RANK[w] ? c.level : w), "green") as CheckCard["light"];
  // 結論：取最嚴重的兩項；不足兩項時用綠燈項目補
  const top = [...known].sort((a, b) => RANK[b.level] - RANK[a.level]).slice(0, 2);
  const label = { green: "綠燈", yellow: "黃燈", red: "紅燈" }[worst];
  // 兩項都不是綠燈才用「且」串接，否則用分號隔開，避免把正常項目講成問題
  const joiner = top.length === 2 && top[1].level !== "green" ? "，且" : "；";
  const headline = top.length ? `${label}：${top.map((c) => c.summary).join(joiner)}` : `${label}：資料不足，無法判斷`;

  const card: CheckCard = {
    code,
    name,
    light: worst,
    headline,
    checks,
    price: price ? { value: price.price, at: price.at } : null,
    nav: navInfo,
    ma20: ma,
    latestDividend: history[history.length - 1] ?? null,
    fillHistory: history,
    composition,
    chips,
    twseRequests: report.requests,
  };
  cache.set(code, { at: Date.now(), card });
  return card;
}

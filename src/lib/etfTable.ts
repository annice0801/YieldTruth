// ETF 配息總表：每檔一列，資料來自資料庫除息紀錄、即時淨值與 e添富基本資料。
import { connection } from "next/server";
import { cache } from "react";
import { ETF_INSIGHTS } from "@/data/etfInsights";
import { ETF_PROFILES } from "@/data/etfProfiles";
import { fillHistory, type FillRecord } from "./checkCard";
import { currentPrice, fetchEtfNavs } from "./market";
import { sourceHealth } from "./sourceHealth";
import { fetchUpcomingExDividends, todayTaipei } from "./twse";

export type Frequency = "月配" | "雙月配" | "季配" | "半年配" | "年配" | "未配息";

export type EtfRow = {
  code: string;
  name: string;
  active: boolean; // 主動式
  frequency: Frequency;
  latest: { exDate: string; cash: number; prevClose: number } | null;
  periodYieldPct: number | null; // 單次配息 ÷ 除息前收盤
  annualYieldPct: number | null; // 年化殖利率（最近一次 × 一年次數 ÷ 現價）
  price: number | null;
  premiumPct: number | null;
  next: { exDate: string; lastBuyDate: string; cash: number | null } | null;
  fill: {
    avgDays: number | null; // 平均填息天數（已填息的次數平均）
    filled: number;
    unfilled: number; // 已滿 60 個交易日仍未填息
    pending: number; // 尚在觀察期
    samples: number;
    latestState: "filled" | "filling" | "discount" | null;
  };
  health: "good" | "warn" | "bad" | null;
  aumYi: number | null;
};

const PER_YEAR: Record<Frequency, number> = { 月配: 12, 雙月配: 6, 季配: 4, 半年配: 2, 年配: 1, 未配息: 0 };

/** 用相鄰兩次除息的間隔（中位數）判斷配息頻率；剛上市、未滿一年的 ETF 也判斷得出來 */
function frequencyOf(history: FillRecord[]): Frequency {
  if (history.length === 0) return "未配息";
  if (history.length === 1) return "年配";
  const gaps = history
    .slice(1)
    .map((h, i) => (Date.parse(h.exDate) - Date.parse(history[i].exDate)) / 86_400_000)
    .sort((a, b) => a - b);
  const median = gaps[Math.floor(gaps.length / 2)];
  if (median <= 45) return "月配";
  if (median <= 75) return "雙月配";
  if (median <= 120) return "季配";
  if (median <= 220) return "半年配";
  return "年配";
}

/** 除息日的前一個平日（假日不另外排除，作為「最後買進日」的近似） */
function prevWeekday(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  do d.setUTCDate(d.getUTCDate() - 1);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6);
  return d.toISOString().slice(0, 10);
}

export function summarizeFill(history: FillRecord[], currentPrice: number | null): EtfRow["fill"] {
  const settled = history.filter((h) => !h.pending);
  const filledDays = settled.filter((h) => h.fillDays !== null).map((h) => h.fillDays!);
  const last = history[history.length - 1];
  let latestState: EtfRow["fill"]["latestState"] = null;
  if (last && last.fillDays !== null) latestState = "filled"; // 最近一次已填過息，之後回落不算貼息
  else if (last && currentPrice !== null) {
    latestState = currentPrice >= last.prevClose ? "filled" : currentPrice < last.refPrice ? "discount" : "filling";
  }
  return {
    avgDays: filledDays.length ? Math.round(filledDays.reduce((s, d) => s + d, 0) / filledDays.length) : null,
    filled: filledDays.length,
    unfilled: settled.length - filledDays.length,
    pending: history.length - settled.length,
    samples: history.length,
    latestState,
  };
}

export const getEtfRows = cache(async (): Promise<EtfRow[]> => {
  await connection();
  const today = todayTaipei();
  const [navs, upcoming] = await Promise.all([fetchEtfNavs(), fetchUpcomingExDividends()]);

  return Promise.all(
    ETF_PROFILES.map(async (p) => {
      const history = await fillHistory(p.code, { requests: 0 }).catch(() => [] as FillRecord[]);
      const latest = history[history.length - 1] ?? null;
      const freq = frequencyOf(history);
      const count = PER_YEAR[freq];
      const nav = navs.get(p.code);
      // 即時淨值拿不到時，依序改用即時成交價、資料庫最新收盤
      const price = nav?.price ?? (await currentPrice(p.code).catch(() => null))?.price ?? null;
      const up = upcoming.filter((u) => u.code === p.code && u.exDate >= today).sort((a, b) => a.exDate.localeCompare(b.exDate))[0];
      const insight = ETF_INSIGHTS.find((e) => e.code === p.code);
      return {
        code: p.code,
        name: p.short,
        active: p.code.endsWith("A"),
        frequency: freq,
        latest: latest ? { exDate: latest.exDate, cash: latest.cash, prevClose: latest.prevClose } : null,
        periodYieldPct: latest ? (latest.cash / latest.prevClose) * 100 : null,
        annualYieldPct: latest && price && count ? ((latest.cash * count) / price) * 100 : null,
        price,
        premiumPct: nav?.premiumPct ?? null,
        next: up ? { exDate: up.exDate, lastBuyDate: prevWeekday(up.exDate), cash: up.cash } : null,
        fill: summarizeFill(history, price),
        health: sourceHealth(insight?.composition ?? null)?.level ?? null,
        aumYi: p.aumYi,
      } satisfies EtfRow;
    }),
  );
});

// ETF 配息總表：每檔一列，資料來自資料庫除息紀錄、即時淨值與 e添富基本資料。
import { after, connection } from "next/server";
import { cache } from "react";
import { getDb } from "./mongodb";
import { isStale } from "./sync";
import { ETF_INSIGHTS } from "@/data/etfInsights";
import { ETF_PROFILES } from "@/data/etfProfiles";
import { fillHistory, type FillRecord } from "./checkCard";
import { fetchEtfNavs } from "./market";
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

// ---------- 預先計算的總表（存在 MongoDB etfSummary，每檔一筆） ----------
// 配息、填息這些只在收盤後才會變的資料先算好存起來；開頁時只讀一次資料庫，再疊加即時淨值。

type SummaryDoc = {
  _id: string; // 代號
  name: string;
  active: boolean;
  frequency: Frequency;
  history: FillRecord[]; // 近 8 次除息與填息
  lastClose: number | null; // 資料庫最新收盤（即時淨值拿不到時的備援）
  next: EtfRow["next"];
  health: EtfRow["health"];
  aumYi: number | null;
  updatedAt: Date;
};

async function summaryCol() {
  return (await getDb()).collection<SummaryDoc>("etfSummary");
}

let building: Promise<SummaryDoc[]> | null = null;

/** 重新計算全部 ETF 的總表資料（會視需要向證交所補抓），由每日排程或資料過期時觸發 */
export function buildEtfSummary(): Promise<SummaryDoc[]> {
  building ??= (async () => {
    const today = todayTaipei();
    const upcoming = await fetchUpcomingExDividends();
    const db = await getDb();
    const col = await summaryCol();
    const docs: SummaryDoc[] = [];
    for (const p of ETF_PROFILES) {
      const history = await fillHistory(p.code, { requests: 0 }).catch(() => [] as FillRecord[]);
      const last = await db.collection("prices").find({ code: p.code }).sort({ date: -1 }).limit(1).next();
      const up = upcoming.filter((u) => u.code === p.code && u.exDate >= today).sort((a, b) => a.exDate.localeCompare(b.exDate))[0];
      const insight = ETF_INSIGHTS.find((e) => e.code === p.code);
      const doc: SummaryDoc = {
        _id: p.code,
        name: p.short,
        active: p.code.endsWith("A"),
        frequency: frequencyOf(history),
        history,
        lastClose: (last?.close as number | undefined) ?? null,
        next: up ? { exDate: up.exDate, lastBuyDate: prevWeekday(up.exDate), cash: up.cash } : null,
        health: sourceHealth(insight?.composition ?? null)?.level ?? null,
        aumYi: p.aumYi,
        updatedAt: new Date(),
      };
      await col.replaceOne({ _id: p.code }, doc, { upsert: true });
      docs.push(doc);
    }
    return docs;
  })().finally(() => {
    building = null;
  });
  return building;
}

async function readSummary(): Promise<SummaryDoc[]> {
  const docs = await (await summaryCol()).find().toArray();
  // 第一次（還沒算過）只能當場算；之後資料過期就在回應送出後於背景重算，不讓使用者等
  if (docs.length < ETF_PROFILES.length) return buildEtfSummary();
  if (docs.some((d) => isStale(d.updatedAt))) after(() => buildEtfSummary().catch(() => undefined));
  const order = new Map(ETF_PROFILES.map((p, i) => [p.code, i]));
  return docs.sort((a, b) => (order.get(a._id) ?? 99) - (order.get(b._id) ?? 99));
}

/** 單檔的近 8 次除息與填息紀錄（詳細頁用） */
export async function getSummaryHistory(code: string): Promise<FillRecord[] | null> {
  const doc = await (await summaryCol()).findOne({ _id: code });
  return doc?.history ?? null;
}

export const getEtfRows = cache(async (): Promise<EtfRow[]> => {
  await connection();
  const [docs, navs] = await Promise.all([readSummary(), fetchEtfNavs()]);
  return docs.map((d) => {
    const nav = navs.get(d._id);
    const price = nav?.price ?? d.lastClose; // 即時淨值拿不到時用資料庫最新收盤
    const latest = d.history[d.history.length - 1] ?? null;
    const count = PER_YEAR[d.frequency];
    return {
      code: d._id,
      name: d.name,
      active: d.active,
      frequency: d.frequency,
      latest: latest ? { exDate: latest.exDate, cash: latest.cash, prevClose: latest.prevClose } : null,
      periodYieldPct: latest ? (latest.cash / latest.prevClose) * 100 : null,
      annualYieldPct: latest && price && count ? ((latest.cash * count) / price) * 100 : null,
      price,
      premiumPct: nav?.premiumPct ?? null,
      next: d.next,
      fill: summarizeFill(d.history, price),
      health: d.health,
      aumYi: d.aumYi,
    } satisfies EtfRow;
  });
});

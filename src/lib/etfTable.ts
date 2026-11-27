// ETF 配息總表：每檔一列，資料來自資料庫除息紀錄、即時淨值與 e添富基本資料。
import { connection } from "next/server";
import { cache } from "react";
import { getDb } from "./mongodb";
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

// ---------- 存在 MongoDB 的總表（etfSummary，每檔一筆） ----------
// 開頁只讀資料庫，完全不連證交所；按「取得最新資料」或每日排程時才向證交所更新並存回。

type SummaryDoc = {
  _id: string; // 代號
  name: string;
  active: boolean;
  frequency: Frequency;
  history: FillRecord[]; // 近 8 次除息與填息
  lastClose: number | null; // 資料庫最新收盤
  live: { price: number; premiumPct: number; at: string } | null; // 更新當下的成交價與折溢價
  next: EtfRow["next"];
  health: EtfRow["health"];
  aumYi: number | null;
  updatedAt: Date;
};
type MetaDoc = { _id: string; updatedAt: Date; by: "排程" | "按鈕" | "首次建立" };

async function summaryCol() {
  return (await getDb()).collection<SummaryDoc>("etfSummary");
}
async function metaCol() {
  return (await getDb()).collection<MetaDoc>("meta");
}

let building: Promise<SummaryDoc[]> | null = null;

/** 向證交所更新並重算全部 ETF 的總表，存回 MongoDB（每日排程、按鈕、或第一次建立時） */
export function buildEtfSummary(by: MetaDoc["by"]): Promise<SummaryDoc[]> {
  building ??= (async () => {
    const today = todayTaipei();
    const [upcoming, navs] = await Promise.all([fetchUpcomingExDividends(), fetchEtfNavs()]);
    const db = await getDb();
    const col = await summaryCol();
    const docs: SummaryDoc[] = [];
    for (const p of ETF_PROFILES) {
      const history = await fillHistory(p.code, { requests: 0 }).catch(() => [] as FillRecord[]);
      const last = await db.collection("prices").find({ code: p.code }).sort({ date: -1 }).limit(1).next();
      const up = upcoming.filter((u) => u.code === p.code && u.exDate >= today).sort((a, b) => a.exDate.localeCompare(b.exDate))[0];
      const insight = ETF_INSIGHTS.find((e) => e.code === p.code);
      const nav = navs.get(p.code);
      const doc: SummaryDoc = {
        _id: p.code,
        name: p.short,
        active: p.code.endsWith("A"),
        frequency: frequencyOf(history),
        history,
        lastClose: (last?.close as number | undefined) ?? null,
        live: nav ? { price: nav.price, premiumPct: nav.premiumPct, at: nav.at } : null,
        next: up ? { exDate: up.exDate, lastBuyDate: prevWeekday(up.exDate), cash: up.cash } : null,
        health: sourceHealth(insight?.composition ?? null)?.level ?? null,
        aumYi: p.aumYi,
        updatedAt: new Date(),
      };
      await col.replaceOne({ _id: p.code }, doc, { upsert: true });
      docs.push(doc);
    }
    await (await metaCol()).updateOne({ _id: "etfSummary" }, { $set: { updatedAt: new Date(), by } }, { upsert: true });
    return docs;
  })().finally(() => {
    building = null;
  });
  return building;
}

async function readSummary(): Promise<SummaryDoc[]> {
  const docs = await (await summaryCol()).find().toArray();
  // 只有資料庫完全沒有資料時（第一次部署）才當場建立
  if (docs.length < ETF_PROFILES.length) return buildEtfSummary("首次建立");
  const order = new Map(ETF_PROFILES.map((p, i) => [p.code, i]));
  return docs.sort((a, b) => (order.get(a._id) ?? 99) - (order.get(b._id) ?? 99));
}

export type SummaryMeta = { updatedAt: string; by: MetaDoc["by"] } | null;

/** 總表最後一次更新的時間與來源 */
export async function getSummaryMeta(): Promise<SummaryMeta> {
  await connection(); // 請求時才讀，建置時不連資料庫
  const m = await (await metaCol()).findOne({ _id: "etfSummary" });
  return m ? { updatedAt: m.updatedAt.toISOString(), by: m.by } : null;
}

// ---------- 按鈕更新的節流規則 ----------
// 盤中：10 分鐘內有人更新過就沿用；收盤後（13:35 起）當天已更新過就不必再抓。

const TRADING_COOLDOWN_MS = 10 * 60 * 1000;

function taipeiParts(d: Date) {
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Taipei", ...o }).format(d);
  return { date: new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Taipei" }).format(d), hm: f({ hour: "2-digit", minute: "2-digit", hour12: false }), wd: f({ weekday: "short" }) };
}

export function refreshDecision(last: Date | null, now = new Date()): { fresh: boolean; reason: string } {
  if (!last) return { fresh: false, reason: "尚未有資料" };
  const n = taipeiParts(now);
  const l = taipeiParts(last);
  const tradingDay = !["Sat", "Sun"].includes(n.wd);
  const inSession = tradingDay && n.hm >= "09:00" && n.hm < "13:35";
  if (inSession) {
    return now.getTime() - last.getTime() < TRADING_COOLDOWN_MS
      ? { fresh: true, reason: "10 分鐘內剛有人更新過，先沿用這份資料" }
      : { fresh: false, reason: "盤中，取得最新成交價" };
  }
  // 非交易時段：最近一次收盤後已經更新過，資料就是最新
  const closedToday = tradingDay && n.hm >= "13:35";
  if (closedToday && l.date === n.date && l.hm >= "13:35") return { fresh: true, reason: "今天收盤後已更新過，已是最新資料" };
  if (!closedToday && now.getTime() - last.getTime() < 18 * 3600 * 1000 && (l.hm >= "13:35" || l.date === n.date))
    return { fresh: true, reason: "尚未開盤，沿用最近一次收盤後的資料" };
  return { fresh: false, reason: "取得最新資料" };
}

/** 單檔的近 8 次除息與填息紀錄（詳細頁用） */
export async function getSummaryHistory(code: string): Promise<FillRecord[] | null> {
  await connection();
  const doc = await (await summaryCol()).findOne({ _id: code });
  return doc?.history ?? null;
}

export const getEtfRows = cache(async (): Promise<EtfRow[]> => {
  await connection();
  const docs = await readSummary();
  return docs.map((d) => {
    const price = d.live?.price ?? d.lastClose;
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
      premiumPct: d.live?.premiumPct ?? null,
      next: d.next,
      fill: summarizeFill(d.history, price),
      health: d.health,
      aumYi: d.aumYi,
    } satisfies EtfRow;
  });
});

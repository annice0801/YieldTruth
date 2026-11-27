// 資料同步：證交所 → MongoDB。
//
// 試算只讀 MongoDB，不直接等證交所。資料用三種方式進資料庫：
// 1. 回補：某檔第一次被查、或查得比已存的更早時，往回逐月抓到需要的日期（或上市月份）為止。
// 2. 增量：資料過期時，只重抓「最後同步的月份」到「本月」。
// 3. 預先回補：scripts/backfill.ts 先把常用 ETF 的歷史抓好。
import { getDb } from "./mongodb";
import {
  fetchExDividendsOfYear,
  fetchMonth,
  nowTaipeiHHMM,
  todayTaipei,
  TwseError,
  type DailyBar,
  type ExDividend,
} from "./twse";

// 證交所個股日成交通常在 14:30 前更新完當日資料
const DAILY_READY_HHMM = "14:30";

type PriceDoc = DailyBar & { code: string };
type DividendDoc = ExDividend & { code: string };
type SecurityDoc = {
  _id: string; // 代號
  name: string | null;
  coveredFrom: string; // 已存的最早月份 YYYY-MM
  reachedListing: boolean; // 是否已回補到上市月份（不用再往前）
  lastMonthSynced: string; // YYYY-MM
  syncedAt: Date;
};
type MetaDoc = { _id: string; syncedAt: Date };

async function collections() {
  const db = await getDb();
  const c = {
    prices: db.collection<PriceDoc>("prices"),
    dividends: db.collection<DividendDoc>("dividends"),
    securities: db.collection<SecurityDoc>("securities"),
    meta: db.collection<MetaDoc>("meta"),
  };
  const g = globalThis as unknown as { _ytIndexes?: Promise<unknown> };
  g._ytIndexes ??= Promise.all([
    c.prices.createIndex({ code: 1, date: 1 }, { unique: true }),
    c.dividends.createIndex({ code: 1, exDate: 1 }, { unique: true }),
  ]);
  await g._ytIndexes;
  return c;
}

// ---------- 時間工具 ----------

const ym = (y: number, m: number) => `${y}-${String(m).padStart(2, "0")}`;
function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return ym(d.getUTCFullYear(), d.getUTCMonth() + 1);
}
function taipeiDateOf(d: Date) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Taipei" }).format(d);
}
function taipeiHHMMOf(d: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Taipei",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

/** 上次同步之後，證交所是否可能有新的日資料 */
function isStale(syncedAt: Date) {
  const today = todayTaipei();
  if (taipeiDateOf(syncedAt) < today) return true;
  return nowTaipeiHHMM() >= DAILY_READY_HHMM && taipeiHHMMOf(syncedAt) < DAILY_READY_HHMM;
}

// 同一檔同時只跑一個同步，避免兩個請求重複回補
const locks = new Map<string, Promise<unknown>>();
function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(key) ?? Promise.resolve();
  const run = prev.catch(() => undefined).then(fn);
  locks.set(key, run);
  return run;
}

export type SyncReport = { requests: number };

// ---------- 股價 ----------

async function saveBars(c: Awaited<ReturnType<typeof collections>>, code: string, bars: DailyBar[]) {
  if (bars.length === 0) return;
  await c.prices.bulkWrite(
    bars.map((b) => ({
      updateOne: { filter: { code, date: b.date }, update: { $set: { ...b, code } }, upsert: true },
    })),
    { ordered: false },
  );
}

/**
 * 從 startMonth 往回逐月抓到 stopMonth（含）。遇到「之前有資料、這個月沒有」就判定到了上市月份。
 * 每抓到一個月就更新 coveredFrom，中斷後重跑會從斷點接續。
 */
async function walkBack(
  c: Awaited<ReturnType<typeof collections>>,
  code: string,
  startMonth: string,
  stopMonth: string,
  report: SyncReport,
  alreadyHasData: boolean,
) {
  let month = startMonth;
  let earliest = startMonth;
  let seen = alreadyHasData;
  let name: string | null = null;
  let reachedListing = false;
  let emptyStreak = 0;

  while (month >= stopMonth) {
    const [y, m] = month.split("-").map(Number);
    const r = await fetchMonth(code, y, m);
    report.requests++;
    if (r.bars.length > 0) {
      await saveBars(c, code, r.bars);
      await c.securities.updateOne(
        { _id: code },
        {
          $set: { coveredFrom: month },
          $setOnInsert: {
            name: r.name,
            reachedListing: false,
            lastMonthSynced: todayTaipei().slice(0, 7),
            syncedAt: new Date(),
          },
        },
        { upsert: true },
      );
      name ??= r.name;
      seen = true;
      emptyStreak = 0;
      earliest = month;
    } else if (seen) {
      reachedListing = true;
      await c.securities.updateOne({ _id: code }, { $set: { reachedListing: true } });
      break;
    } else if (++emptyStreak >= 3) {
      break; // 連續三個月都沒資料，視為查無此代號
    }
    month = shiftMonth(month, -1);
  }
  return { earliest, seen, name, reachedListing };
}

/** 確保資料庫有 code 從 fromDate 到今天的日股價 */
export async function ensurePrices(code: string, fromDate: string, report: SyncReport) {
  return withLock(`price:${code}`, async () => {
    const c = await collections();
    const thisMonth = todayTaipei().slice(0, 7);
    const needFrom = fromDate.slice(0, 7);
    const sec = await c.securities.findOne({ _id: code });

    if (!sec) {
      const r = await walkBack(c, code, thisMonth, needFrom, report, false);
      if (!r.seen) throw new TwseError(`查無 ${code} 的上市成交資料（目前只支援上市證券）`);
      return;
    }

    // 往前延伸
    if (needFrom < sec.coveredFrom && !sec.reachedListing) {
      await walkBack(c, code, shiftMonth(sec.coveredFrom, -1), needFrom, report, true);
    }

    // 增量更新到本月
    if (isStale(sec.syncedAt)) {
      let name = sec.name;
      for (let m = sec.lastMonthSynced; m <= thisMonth; m = shiftMonth(m, 1)) {
        const [y, mm] = m.split("-").map(Number);
        const r = await fetchMonth(code, y, mm);
        report.requests++;
        await saveBars(c, code, r.bars);
        name ??= r.name;
      }
      await c.securities.updateOne(
        { _id: code },
        { $set: { name, lastMonthSynced: thisMonth, syncedAt: new Date() } },
      );
    }
  });
}

// ---------- 除息 ----------

/** 確保資料庫有 fromYear 到今年所有上市證券的除息紀錄（一年一次請求，所有代號共用） */
export async function ensureDividends(fromYear: number, report: SyncReport) {
  return withLock("dividends", async () => {
    const c = await collections();
    const thisYear = Number(todayTaipei().slice(0, 4));
    for (let y = fromYear; y <= thisYear; y++) {
      const meta = await c.meta.findOne({ _id: `exright-${y}` });
      // 某年的資料要在隔年之後同步過才算完整；今年則看是否過期
      const complete = meta && taipeiDateOf(meta.syncedAt) > `${y}-12-31`;
      if (complete || (y === thisYear && meta && !isStale(meta.syncedAt))) continue;

      const rows = await fetchExDividendsOfYear(y);
      report.requests++;
      if (rows.length > 0) {
        await c.dividends.bulkWrite(
          rows.map(({ code, ...d }) => ({
            updateOne: { filter: { code, exDate: d.exDate }, update: { $set: { ...d, code } }, upsert: true },
          })),
          { ordered: false },
        );
      }
      await c.meta.updateOne({ _id: `exright-${y}` }, { $set: { syncedAt: new Date() } }, { upsert: true });
    }
  });
}

// ---------- 讀取 ----------

export async function readSeries(code: string, from: string, to: string, divFrom: string) {
  const c = await collections();
  const [sec, prices, dividends] = await Promise.all([
    c.securities.findOne({ _id: code }),
    c.prices
      .find({ code, date: { $gte: from, $lte: to } }, { projection: { _id: 0, code: 0 } })
      .sort({ date: 1 })
      .toArray(),
    c.dividends
      .find({ code, exDate: { $gte: divFrom, $lte: to } }, { projection: { _id: 0, code: 0 } })
      .sort({ exDate: 1 })
      .toArray(),
  ]);
  return { name: sec?.name ?? null, prices, dividends };
}

export async function closeDb() {
  const { getMongoClient } = await import("./mongodb");
  await (await getMongoClient()).close();
}

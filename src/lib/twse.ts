// 證交所資料來源（個人使用）。只負責「向證交所拿資料」，存放與更新由 sync.ts 處理。
// 所有對外請求排隊送出，至少間隔 REQUEST_GAP_MS，避免對證交所造成負擔。

const REQUEST_GAP_MS = 1500;
// 被限流（例如回 307／429）或暫時錯誤時，依序等待後重試
const RETRY_DELAYS_MS = [10_000, 30_000, 60_000];

export type DailyBar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};
export type ExDividend = {
  exDate: string;
  prevClose: number; // 除息前收盤價（填息目標價）
  refPrice: number; // 除息參考價
  cash: number; // 每股現金股利
};

export class TwseError extends Error {}

let lastRequestAt = 0;
let queue: Promise<unknown> = Promise.resolve();

function throttled<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = lastRequestAt + REQUEST_GAP_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastRequestAt = Date.now();
    return fn();
  });
  queue = run.catch(() => undefined);
  return run;
}

type TwseResponse = { stat: string; title?: string; data?: string[][] };

async function getJson<T = TwseResponse>(url: string): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await throttled(async () => {
        const res = await fetch(url, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(15_000),
        });
        if (!res.ok) throw new TwseError(`證交所回應 HTTP ${res.status}`);
        return (await res.json()) as T;
      });
    } catch (e) {
      if (attempt >= RETRY_DELAYS_MS.length) {
        throw e instanceof TwseError ? e : new TwseError(`無法連線證交所：${e instanceof Error ? e.message : e}`);
      }
      await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
    }
  }
}

const num = (s: string) => Number(s.replace(/,/g, ""));

// 「115/11/25」或「115年11月25日」→ 2026-11-25
function rocToIso(s: string): string {
  const m = s.match(/(\d+)\D+(\d+)\D+(\d+)/);
  if (!m) throw new TwseError(`無法解析日期：${s}`);
  return `${Number(m[1]) + 1911}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
}

export function todayTaipei(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Taipei" }).format(new Date());
}

export function nowTaipeiHHMM(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Taipei",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

/** 個股某月的每日成交（主網站 STOCK_DAY）。查無資料回傳空陣列。 */
export async function fetchMonth(code: string, year: number, month: number) {
  const ym = `${year}${String(month).padStart(2, "0")}`;
  const json = await getJson(
    `https://www.twse.com.tw/rwd/zh/afterTrading/STOCK_DAY?date=${ym}01&stockNo=${encodeURIComponent(code)}&response=json`,
  );
  if (json.stat !== "OK") return { name: null, bars: [] as DailyBar[] };

  // title 例：「115年11月 0056 元大高股息       各日成交資訊」
  const name = json.title?.split(/\s+/).find((_, i, arr) => arr[i - 1] === code) ?? null;
  const bars = (json.data ?? [])
    .map((r) => ({
      date: rocToIso(r[0]),
      volume: num(r[1]),
      open: num(r[3]),
      high: num(r[4]),
      low: num(r[5]),
      close: num(r[6]),
    }))
    .filter((b) => Number.isFinite(b.close) && b.close > 0);
  return { name, bars };
}

/** 某一年所有上市證券的除息紀錄（TWT49U），只取純「息」。 */
export async function fetchExDividendsOfYear(year: number) {
  const json = await getJson(
    `https://www.twse.com.tw/rwd/zh/exRight/TWT49U?startDate=${year}0101&endDate=${year}1231&response=json`,
  );
  if (json.stat !== "OK") return [];
  // 欄位：資料日期, 代號, 名稱, 除權息前收盤價, 除權息參考價, 權值+息值, 權/息, ...
  return (json.data ?? [])
    .filter((r) => r[6] === "息")
    .map((r) => ({
      code: r[1],
      exDate: rocToIso(r[0]),
      prevClose: num(r[3]),
      refPrice: num(r[4]),
      cash: num(r[5]),
    }));
}

export type LiveQuote = { date: string; time: string; price: number };

/**
 * 基本市況報導的即時成交價（延遲約 5 秒）。不經過排隊，因為只在需要今天價格時呼叫一次。
 * 個人使用；若日後商業化，需向證交所申請授權。
 */
export async function fetchLiveQuote(code: string): Promise<LiveQuote | null> {
  try {
    const res = await fetch(
      `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_${encodeURIComponent(code)}.tw&json=1&delay=0`,
      { signal: AbortSignal.timeout(5_000) },
    );
    const json = (await res.json()) as { msgArray?: Record<string, string>[] };
    const m = json.msgArray?.[0];
    const price = Number(m?.z);
    if (!m || !Number.isFinite(price) || price <= 0) return null;
    const d = m.d; // YYYYMMDD
    return { date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`, time: m.t, price };
  } catch {
    return null; // 即時價只是加分項，拿不到就用資料庫最新收盤
  }
}

/** 一次取多檔的即時成交價（單一請求）。盤前或無成交時回傳昨收。 */
export async function fetchLiveQuotes(codes: string[]): Promise<Map<string, LiveQuote & { prevClose: number }>> {
  const out = new Map<string, LiveQuote & { prevClose: number }>();
  if (codes.length === 0) return out;
  try {
    const exCh = codes.map((c) => `tse_${encodeURIComponent(c)}.tw`).join("|");
    const res = await fetch(`https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=${exCh}&json=1&delay=0`, {
      signal: AbortSignal.timeout(5_000),
    });
    const json = (await res.json()) as { msgArray?: Record<string, string>[] };
    for (const m of json.msgArray ?? []) {
      const last = Number(m.z);
      const prevClose = Number(m.y);
      const price = Number.isFinite(last) && last > 0 ? last : prevClose;
      if (!Number.isFinite(price) || price <= 0) continue;
      const d = m.d;
      out.set(m.c, {
        date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`,
        time: m.t,
        price,
        prevClose,
      });
    }
  } catch {
    // 即時價拿不到時，頁面改顯示「無即時價」
  }
  return out;
}

/** 某日三大法人買賣超（T86，所有證券）。資料尚未公布時回傳 null。 */
export async function fetchT86(isoDate: string): Promise<string[][] | null> {
  const json = await getJson(
    `https://www.twse.com.tw/rwd/zh/fund/T86?date=${isoDate.replace(/-/g, "")}&selectType=ALL&response=json`,
  );
  return json.stat === "OK" ? (json.data ?? []) : null;
}

export type UpcomingEx = { code: string; exDate: string; cash: number | null };
let upcomingCache: { at: number; data: UpcomingEx[] } | null = null;

/** 除權除息預告表（OpenAPI TWT48U_ALL，所有上市證券，一次請求）；快取 1 小時 */
export async function fetchUpcomingExDividends(): Promise<UpcomingEx[]> {
  if (upcomingCache && Date.now() - upcomingCache.at < 3_600_000) return upcomingCache.data;
  try {
    const res = await fetch("https://openapi.twse.com.tw/v1/exchangeReport/TWT48U_ALL", { signal: AbortSignal.timeout(8_000) });
    const rows = (await res.json()) as Record<string, string>[];
    const data = rows
      .filter((r) => r.Exdividend?.includes("息"))
      .map((r) => ({
        code: r.Code,
        exDate: rocToIso(`${r.Date.slice(0, r.Date.length - 4)}/${r.Date.slice(-4, -2)}/${r.Date.slice(-2)}`),
        cash: r.CashDividend ? Number(r.CashDividend) : null,
      }));
    upcomingCache = { at: Date.now(), data };
    return data;
  } catch {
    return upcomingCache?.data ?? [];
  }
}

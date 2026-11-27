// 體檢卡與進場提醒共用的市場資料：ETF 折溢價、三大法人買賣超、月線。
import { getDb } from "./mongodb";
import { ensurePrices, type SyncReport } from "./sync";
import { fetchLiveQuote, todayTaipei } from "./twse";

// ---------- ETF 即時淨值與折溢價（基本市況報導，單一請求取得全部 ETF） ----------

export type EtfNav = {
  code: string;
  name: string;
  price: number; // 成交價
  nav: number; // 投信預估淨值
  premiumPct: number; // 折溢價 %，正值為溢價
  units: number; // 已發行受益權單位數
  unitsChange: number; // 與前一日相比的單位數變化（淨申購為正）
  at: string; // 2026-11-27 13:27:30
};

let navCache: { at: number; data: Map<string, EtfNav> } | null = null;

export async function fetchEtfNavs(): Promise<Map<string, EtfNav>> {
  if (navCache && Date.now() - navCache.at < 20_000) return navCache.data;
  const data = new Map<string, EtfNav>();
  try {
    const res = await fetch("https://mis.twse.com.tw/stock/data/all_etf.txt", { signal: AbortSignal.timeout(6_000) });
    const json = (await res.json()) as { a1?: { msgArray?: Record<string, string | number>[] }[] };
    for (const r of (json.a1 ?? []).flatMap((b) => b.msgArray ?? [])) {
      const price = Number(r.e);
      const nav = Number(r.f);
      if (!(price > 0 && nav > 0)) continue;
      const d = String(r.i);
      data.set(String(r.a), {
        code: String(r.a),
        name: String(r.b).replace(/\(.*\)$/, ""), // 去掉「(基金之配息來源可能為收益平準金…)」
        price,
        nav,
        premiumPct: Number(r.g),
        units: Number(r.c),
        unitsChange: Number(r.d),
        at: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)} ${r.j}`,
      });
    }
    navCache = { at: Date.now(), data };
  } catch {
    // 拿不到就回傳空表，體檢卡會把折溢價標成「無資料」
  }
  return data;
}

// ---------- 現價：ETF 用淨值檔，其他用即時報價，最後退回資料庫收盤 ----------

export async function currentPrice(code: string): Promise<{ price: number; at: string } | null> {
  const nav = (await fetchEtfNavs()).get(code);
  if (nav) return { price: nav.price, at: nav.at };
  const q = await fetchLiveQuote(code);
  if (q) return { price: q.price, at: `${q.date} ${q.time}` };
  const db = await getDb();
  const last = await db.collection("prices").find({ code }).sort({ date: -1 }).limit(1).next();
  return last ? { price: last.close as number, at: `${last.date} 收盤` } : null;
}

// ---------- 月線（20 日均線），含今天的即時價 ----------

export async function ma20(code: string, livePrice: number | null, report: SyncReport) {
  const today = todayTaipei();
  const from = new Date(Date.parse(today) - 60 * 86_400_000).toISOString().slice(0, 10);
  await ensurePrices(code, from, report);
  const db = await getDb();
  const rows = await db
    .collection("prices")
    .find({ code, date: { $lt: today } }, { projection: { _id: 0, close: 1 } })
    .sort({ date: -1 })
    .limit(livePrice ? 19 : 20)
    .toArray();
  const closes = rows.map((r) => r.close as number);
  if (livePrice) closes.unshift(livePrice);
  if (closes.length < 20) return null;
  return closes.reduce((s, c) => s + c, 0) / closes.length;
}

// ---------- 三大法人買賣超（T86，一天一次請求，所有證券共用） ----------

type InstDoc = { code: string; date: string; foreign: number; trust: number; dealer: number; total: number };

const n = (s: string) => Number(s.replace(/,/g, ""));

async function ensureInstitutionalDate(date: string, report: SyncReport) {
  const db = await getDb();
  const meta = db.collection<{ _id: string; syncedAt: Date; ok: boolean }>("meta");
  if (await meta.findOne({ _id: `t86-${date}` })) return;

  const { fetchT86 } = await import("./twse");
  const rows = await fetchT86(date);
  report.requests++;
  if (rows === null) return; // 當天資料尚未公布，下次再試
  const docs: InstDoc[] = rows
    .filter((r) => /^00/.test(r[0].trim())) // 只存 ETF
    .map((r) => ({
      code: r[0].trim(),
      date,
      foreign: n(r[4]) + n(r[7]),
      trust: n(r[10]),
      dealer: n(r[11]),
      total: n(r[18]),
    }));
  const col = db.collection<InstDoc>("institutional");
  await col.createIndex({ code: 1, date: 1 }, { unique: true });
  if (docs.length) {
    await col.bulkWrite(
      docs.map((d) => ({ updateOne: { filter: { code: d.code, date: d.date }, update: { $set: d }, upsert: true } })),
      { ordered: false },
    );
  }
  await meta.updateOne({ _id: `t86-${date}` }, { $set: { syncedAt: new Date(), ok: true } }, { upsert: true });
}

/** 最近 5 個交易日的三大法人買賣超（單位：張） */
export async function institutional5d(code: string, report: SyncReport) {
  const db = await getDb();
  // 交易日以 0050 的成交日為準（每天都有成交）
  const dates = (
    await db.collection("prices").find({ code: "0050" }, { projection: { _id: 0, date: 1 } }).sort({ date: -1 }).limit(5).toArray()
  ).map((r) => r.date as string);
  for (const d of dates) await ensureInstitutionalDate(d, report);
  const rows = await db
    .collection<InstDoc>("institutional")
    .find({ code, date: { $in: dates } })
    .toArray();
  const sum = (k: keyof Pick<InstDoc, "foreign" | "trust" | "dealer" | "total">) =>
    Math.round(rows.reduce((s, r) => s + r[k], 0) / 1000);
  return { days: rows.length, from: dates[dates.length - 1], to: dates[0], foreign: sum("foreign"), trust: sum("trust"), dealer: sum("dealer"), total: sum("total") };
}

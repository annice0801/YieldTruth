// 規則 ② 的簡化版：用資料庫最新一次除息紀錄＋即時價，判斷目前的填息狀態。
import { connection } from "next/server";
import { cache } from "react";
import { getDb } from "./mongodb";
import { fetchLiveQuotes, todayTaipei } from "./twse";

export type FillStatus = {
  exDate: string;
  cash: number;
  prevClose: number;
  refPrice: number;
  price: number;
  priceAt: string; // 例：2026-11-26 13:30:00
  progressPct: number; // (現價 − 參考價) ÷ 配息；≥100 已填息，<0 貼息
  state: "filled" | "filling" | "discount";
  daysSince: number; // 日曆天
};

export const getFillStatuses = cache(async (codes: string[]) => {
  await connection(); // 每次請求都重新查，不在建置時預先算
  const db = await getDb();
  const today = todayTaipei();
  const [latest, quotes] = await Promise.all([
    db
      .collection("dividends")
      .aggregate<{ _id: string; exDate: string; cash: number; prevClose: number; refPrice: number }>([
        { $match: { code: { $in: codes }, exDate: { $lte: today } } },
        { $sort: { exDate: -1 } },
        { $group: { _id: "$code", exDate: { $first: "$exDate" }, cash: { $first: "$cash" }, prevClose: { $first: "$prevClose" }, refPrice: { $first: "$refPrice" } } },
      ])
      .toArray(),
    fetchLiveQuotes(codes),
  ]);

  const out = new Map<string, FillStatus>();
  for (const d of latest) {
    const q = quotes.get(d._id);
    if (!q || d.cash <= 0) continue;
    const progressPct = ((q.price - d.refPrice) / d.cash) * 100;
    out.set(d._id, {
      exDate: d.exDate,
      cash: d.cash,
      prevClose: d.prevClose,
      refPrice: d.refPrice,
      price: q.price,
      priceAt: `${q.date} ${q.time}`,
      progressPct,
      state: q.price >= d.prevClose ? "filled" : q.price < d.refPrice ? "discount" : "filling",
      daysSince: Math.round((Date.parse(today) - Date.parse(d.exDate)) / 86_400_000),
    });
  }
  return out;
});

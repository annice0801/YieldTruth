// 進場時機條件提醒：用戶自己勾選條件，成立時通知。
// 個人使用：不分帳號；判斷在伺服器，通知由開著的 YieldTruth 分頁顯示（瀏覽器通知）。
import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";
import { currentPrice, fetchEtfNavs, ma20 } from "./market";
import { todayTaipei } from "./twse";

export type AlertConditions = {
  premiumMax?: number; // 溢價收斂到 X% 以內
  exDiscount?: boolean; // 除息後貼息（現價低於最近一次除息參考價，且在除息後 60 天內）
  ma20Touch?: boolean; // 回測月線：現價距 20 日均線 ±1% 以內
  priceBelow?: number; // 跌到目標價以下
};
export type AlertDoc = {
  _id: ObjectId;
  code: string;
  name: string;
  conditions: AlertConditions;
  mode: "any" | "all";
  active: boolean;
  createdAt: Date;
  lastTriggeredDate?: string; // 同一天只通知一次
};

export const MA20_TOLERANCE_PCT = 1;
export const EX_DISCOUNT_WINDOW_DAYS = 60;

async function col() {
  return (await getDb()).collection<AlertDoc>("alerts");
}

export async function listAlerts() {
  return (await col()).find().sort({ createdAt: -1 }).toArray();
}

export async function createAlert(input: { code: string; name: string; conditions: AlertConditions; mode: "any" | "all" }) {
  const doc: Omit<AlertDoc, "_id"> = { ...input, active: true, createdAt: new Date() };
  const r = await (await col()).insertOne(doc as AlertDoc);
  return r.insertedId;
}

export async function deleteAlert(id: string) {
  await (await col()).deleteOne({ _id: new ObjectId(id) });
}

export type ConditionResult = { key: keyof AlertConditions; label: string; met: boolean; now: string };
export type AlertEvaluation = { id: string; code: string; name: string; mode: "any" | "all"; met: boolean; results: ConditionResult[]; newlyTriggered: boolean };

/** 判斷所有啟用中的提醒；成立且今天還沒通知過的，標記為新觸發 */
export async function evaluateAlerts(): Promise<AlertEvaluation[]> {
  const c = await col();
  const alerts = await c.find({ active: true }).toArray();
  if (alerts.length === 0) return [];
  const navs = await fetchEtfNavs();
  const db = await getDb();
  const today = todayTaipei();
  const out: AlertEvaluation[] = [];

  for (const a of alerts) {
    const price = (await currentPrice(a.code))?.price ?? null;
    const results: ConditionResult[] = [];
    const k = a.conditions;

    if (k.premiumMax !== undefined) {
      const nav = navs.get(a.code);
      results.push({
        key: "premiumMax",
        label: `溢價收斂到 +${k.premiumMax}% 以內`,
        met: !!nav && nav.premiumPct <= k.premiumMax,
        now: nav ? `目前 ${nav.premiumPct > 0 ? "+" : ""}${nav.premiumPct.toFixed(2)}%` : "無淨值資料",
      });
    }
    if (k.exDiscount) {
      const d = await db.collection("dividends").find({ code: a.code, exDate: { $lte: today } }).sort({ exDate: -1 }).limit(1).next();
      const inWindow = d && (Date.parse(today) - Date.parse(d.exDate)) / 86_400_000 <= EX_DISCOUNT_WINDOW_DAYS;
      results.push({
        key: "exDiscount",
        label: "除息後貼息",
        met: !!(d && inWindow && price !== null && price < d.refPrice),
        now: d ? `現價 ${price ?? "—"}／除息參考價 ${d.refPrice}（${d.exDate}）` : "無除息紀錄",
      });
    }
    if (k.ma20Touch) {
      const m = await ma20(a.code, price, { requests: 0 }).catch(() => null);
      const dist = m && price ? ((price - m) / m) * 100 : null;
      results.push({
        key: "ma20Touch",
        label: `回測月線（±${MA20_TOLERANCE_PCT}%）`,
        met: dist !== null && Math.abs(dist) <= MA20_TOLERANCE_PCT,
        now: m ? `現價距月線 ${m.toFixed(2)} ${dist! >= 0 ? "+" : ""}${dist!.toFixed(2)}%` : "均線資料不足",
      });
    }
    if (k.priceBelow !== undefined) {
      results.push({
        key: "priceBelow",
        label: `跌到 ${k.priceBelow} 元以下`,
        met: price !== null && price <= k.priceBelow,
        now: `現價 ${price ?? "—"}`,
      });
    }

    const met = results.length > 0 && (a.mode === "all" ? results.every((r) => r.met) : results.some((r) => r.met));
    const newlyTriggered = met && a.lastTriggeredDate !== today;
    if (newlyTriggered) await c.updateOne({ _id: a._id }, { $set: { lastTriggeredDate: today } });
    out.push({ id: a._id.toHexString(), code: a.code, name: a.name, mode: a.mode, met, results, newlyTriggered });
  }
  return out;
}

// 每日排程：收盤後把證交所資料同步進 MongoDB，並重算配息總表。
// 頁面只讀資料庫，不必在使用者開頁時等證交所。
// Vercel Cron 會帶 Authorization: Bearer <CRON_SECRET>（有設定 CRON_SECRET 時）。
import { ETF_PROFILES } from "@/data/etfProfiles";
import { buildEtfSummary } from "@/lib/etfTable";
import { institutional5d } from "@/lib/market";
import { getDb } from "@/lib/mongodb";
import { ensureDividends, ensurePrices, type SyncReport } from "@/lib/sync";
import { todayTaipei } from "@/lib/twse";

export const maxDuration = 300;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) return request.headers.get("authorization") === `Bearer ${secret}`;
  // 沒設定密鑰時，只接受 Vercel Cron 發出的請求
  return (request.headers.get("user-agent") ?? "").startsWith("vercel-cron");
}

export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ error: "unauthorized" }, { status: 401 });

  const started = Date.now();
  const report: SyncReport = { requests: 0 };
  const today = todayTaipei();
  const from = new Date(Date.parse(today) - 90 * 86_400_000).toISOString().slice(0, 10);

  // 總表的 ETF，加上使用者查過的其他代號（最多 30 檔）
  const tracked = await (await getDb()).collection<{ _id: string }>("securities").find({}, { projection: { _id: 1 } }).limit(30).toArray();
  const codes = [...new Set([...ETF_PROFILES.map((p) => p.code), ...tracked.map((t) => t._id)])];

  await ensureDividends(Number(today.slice(0, 4)) - 1, report);
  const failed: string[] = [];
  for (const code of codes) {
    await ensurePrices(code, from, report).catch(() => failed.push(code));
  }
  await institutional5d("0056", report).catch(() => undefined); // 補齊近 5 日三大法人
  await buildEtfSummary("排程");

  return Response.json({ codes: codes.length, failed, twseRequests: report.requests, ms: Date.now() - started });
}

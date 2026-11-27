// 「取得最新資料」按鈕：必要時才向證交所更新，結果存進 MongoDB，之後所有人都讀這份。
import { ETF_PROFILES } from "@/data/etfProfiles";
import { buildEtfSummary, getSummaryMeta, refreshDecision } from "@/lib/etfTable";
import { ensureDividends, ensurePrices, type SyncReport } from "@/lib/sync";
import { todayTaipei } from "@/lib/twse";

export const maxDuration = 120;

export async function POST() {
  const meta = await getSummaryMeta();
  const decision = refreshDecision(meta ? new Date(meta.updatedAt) : null);
  if (decision.fresh) {
    return Response.json({ status: "fresh", message: decision.reason, updatedAt: meta!.updatedAt });
  }

  const report: SyncReport = { requests: 0 };
  const today = todayTaipei();
  const from = new Date(Date.parse(today) - 90 * 86_400_000).toISOString().slice(0, 10);
  try {
    await ensureDividends(Number(today.slice(0, 4)) - 1, report);
    for (const p of ETF_PROFILES) await ensurePrices(p.code, from, report).catch(() => undefined);
    await buildEtfSummary("按鈕");
  } catch (e) {
    return Response.json({ status: "error", message: `更新失敗：${e instanceof Error ? e.message : e}` }, { status: 502 });
  }
  const after = await getSummaryMeta();
  return Response.json({ status: "updated", message: "已取得最新資料並存入資料庫", updatedAt: after?.updatedAt, twseRequests: report.requests });
}

import { ensureDividends, ensurePrices, readSeries, type SyncReport } from "@/lib/sync";
import { computeTotalReturn, type DailyPrice } from "@/lib/totalReturn";
import { fetchLiveQuote, todayTaipei, TwseError, type LiveQuote } from "@/lib/twse";

const MAX_YEARS = 10;
const isoDate = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const code = (q.get("code") ?? "").trim().toUpperCase();
  const buyDate = q.get("buyDate") ?? "";
  const today = todayTaipei();
  const endDate = q.get("endDate") || today;
  const amount = Number(q.get("amount"));
  const feeDiscount = Number(q.get("feeDiscount") ?? 1);

  if (!/^[0-9A-Z]{4,6}$/.test(code)) return bad("請輸入正確的證券代號，例如 0056");
  if (!isoDate.test(buyDate) || !isoDate.test(endDate)) return bad("日期格式錯誤");
  if (buyDate >= endDate) return bad("買入日期必須早於試算終點");
  if (endDate > today) return bad("試算終點不能晚於今天");
  const minDate = `${Number(today.slice(0, 4)) - MAX_YEARS}${today.slice(4)}`;
  if (buyDate < minDate) return bad(`買入日期最多只能回溯 ${MAX_YEARS} 年`);
  if (!(amount >= 1000 && amount <= 100_000_000)) return bad("投入金額需介於 1,000 至 1 億元");
  if (!(feeDiscount > 0 && feeDiscount <= 1)) return bad("手續費折數需介於 0 到 1 之間");

  // 往前多取一年的配息紀錄，用來算買入當時的標題殖利率
  const divFrom = `${Number(buyDate.slice(0, 4)) - 1}${buyDate.slice(4)}`;
  const report: SyncReport = { requests: 0 };

  try {
    const started = Date.now();
    await ensurePrices(code, buyDate, report);
    await ensureDividends(Number(divFrom.slice(0, 4)), report);
    const { name, prices, dividends } = await readSeries(code, buyDate, endDate, divFrom);
    if (prices.length === 0) return bad(`查無 ${code} 在這段期間的成交資料`, 404);

    // 試算到今天、資料庫還沒有今天收盤價（盤中或證交所尚未更新）→ 疊加即時價
    let live: LiveQuote | null = null;
    const series: DailyPrice[] = prices.map((p) => ({ date: p.date, close: p.close }));
    if (endDate === today && series[series.length - 1].date < today) {
      live = await fetchLiveQuote(code);
      if (live && live.date === today) series.push({ date: today, close: live.price });
      else live = null;
    }

    const result = computeTotalReturn({ amount, feeDiscount, prices: series, dividends });
    return Response.json({
      code,
      name,
      ...result,
      data: {
        lastClose: prices[prices.length - 1].date,
        live,
        twseRequests: report.requests,
        ms: Date.now() - started,
      },
    });
  } catch (e) {
    if (e instanceof TwseError) return bad(e.message, 502);
    if (e instanceof Error) return bad(e.message);
    throw e;
  }
}

function bad(error: string, status = 400) {
  return Response.json({ error }, { status });
}

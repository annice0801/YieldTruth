// 規則 ③：含息總報酬試算（純計算，不碰網路）。
import type { ExDividend } from "./twse";

export type DailyPrice = { date: string; close: number };

export const FEE_RATE = 0.001425; // 券商手續費（未折扣）
export const ETF_TAX_RATE = 0.001; // ETF 證交稅，賣出時收
export const NHI_RATE = 0.0211; // 二代健保補充保費
export const NHI_THRESHOLD = 20000; // 單筆股利達此金額才扣

export type TotalReturnInput = {
  amount: number;
  feeDiscount: number; // 1 = 不打折，0.28 = 2.8 折
  prices: DailyPrice[]; // 買入日起到試算終點，已排序
  dividends: ExDividend[]; // 含買入日前一年（算標題殖利率用），已排序
};

export type DividendRow = ExDividend & {
  shares: number;
  gross: number;
  nhi: number;
  fillDays: number | null; // 以交易日計，除息日當天為第 1 天；null = 期間內未填息
};

export type ChartPoint = {
  date: string;
  close: number;
  marketValue: number; // 持股市值
  cumDividend: number; // 累計已領配息（扣健保）
  total: number; // 市值 + 累計配息
};

export type TotalReturnResult = {
  buy: { date: string; price: number; shares: number; fee: number; invested: number };
  end: { date: string; price: number; marketValue: number; sellFee: number; sellTax: number };
  headline: { yieldPct: number; basis: string } | null;
  dividends: DividendRow[];
  series: ChartPoint[];
  totals: {
    dividendGross: number;
    nhi: number;
    priceGain: number; // 期末市值 − 買入成本（不含費用）
    costs: number; // 買賣手續費 + 證交稅 + 健保補充保費
    net: number; // 實際賺賠
    returnPct: number;
    xirrPct: number | null;
    days: number;
    erosionPct: number | null; // 本金侵蝕率
  };
};

const fee = (value: number, discount: number) =>
  value > 0 ? Math.max(1, Math.floor(value * FEE_RATE * discount)) : 0;

const dayDiff = (a: string, b: string) =>
  (Date.parse(b) - Date.parse(a)) / 86_400_000;

export function computeTotalReturn(input: TotalReturnInput): TotalReturnResult {
  const { amount, feeDiscount, prices, dividends } = input;
  if (prices.length < 2) throw new Error("期間內交易日不足，請拉長試算區間");

  const first = prices[0];
  const last = prices[prices.length - 1];

  // 買入：以第一個交易日收盤價成交，買得起的最大股數（可買零股）
  const shares = Math.floor(amount / (first.close * (1 + FEE_RATE * feeDiscount)));
  if (shares < 1) throw new Error("投入金額不足以買進 1 股");
  const cost = Math.round(shares * first.close);
  const buyFee = fee(cost, feeDiscount);
  const invested = cost + buyFee;

  // 期末：假設以最後一個交易日收盤價全部賣出
  const marketValue = Math.round(shares * last.close);
  const sellFee = fee(marketValue, feeDiscount);
  const sellTax = Math.floor(marketValue * ETF_TAX_RATE);

  // 除息日當天才買不會領到，所以只算除息日在買入日之後的配息
  const held = dividends.filter(
    (d) => d.exDate > first.date && d.exDate <= last.date,
  );
  const rows: DividendRow[] = held.map((d) => {
    const gross = Math.floor(shares * d.cash);
    const nhi = gross >= NHI_THRESHOLD ? Math.round(gross * NHI_RATE) : 0;
    const startIdx = prices.findIndex((p) => p.date >= d.exDate);
    let fillDays: number | null = null;
    if (startIdx >= 0) {
      const hit = prices.slice(startIdx).findIndex((p) => p.close >= d.prevClose);
      if (hit >= 0) fillDays = hit + 1;
    }
    return { ...d, shares, gross, nhi, fillDays };
  });

  const dividendGross = rows.reduce((s, r) => s + r.gross, 0);
  const nhi = rows.reduce((s, r) => s + r.nhi, 0);
  const priceGain = marketValue - cost;
  const costs = buyFee + sellFee + sellTax + nhi;
  const net = marketValue - sellFee - sellTax + dividendGross - nhi - invested;
  const days = dayDiff(first.date, last.date);

  // 現金流：買入為負；配息以除息日入帳近似（實際發放約晚 3–4 週）；期末賣出為正
  const flows = [
    { date: first.date, amount: -invested },
    ...rows.map((r) => ({ date: r.exDate, amount: r.gross - r.nhi })),
    { date: last.date, amount: marketValue - sellFee - sellTax },
  ];

  // 每日資產走勢：配息在除息日計入
  const netByDate = new Map(rows.map((r) => [r.exDate, r.gross - r.nhi]));
  let cum = 0;
  const series: ChartPoint[] = prices.map((p) => {
    cum += netByDate.get(p.date) ?? 0;
    const mv = Math.round(shares * p.close);
    return { date: p.date, close: p.close, marketValue: mv, cumDividend: cum, total: mv + cum };
  });

  return {
    buy: { date: first.date, price: first.close, shares, fee: buyFee, invested },
    end: { date: last.date, price: last.close, marketValue, sellFee, sellTax },
    headline: headlineYield(dividends, first),
    dividends: rows,
    series,
    totals: {
      dividendGross,
      nhi,
      priceGain,
      costs,
      net,
      returnPct: (net / invested) * 100,
      xirrPct: days >= 30 ? xirr(flows) : null,
      days,
      erosionPct:
        dividendGross > 0 ? (Math.max(0, -priceGain) / dividendGross) * 100 : null,
    },
  };
}

// 標題殖利率：買入當時「最近一次配息 × 一年配息次數 ÷ 買入價」，也就是新聞與廣告常見的算法。
function headlineYield(dividends: ExDividend[], buy: DailyPrice) {
  const before = dividends.filter((d) => d.exDate <= buy.date);
  const latest = before[before.length - 1];
  if (!latest) return null;
  const freq = before.filter((d) => dayDiff(d.exDate, latest.exDate) < 365).length;
  return {
    yieldPct: ((latest.cash * freq) / buy.close) * 100,
    basis: `最近一次配息 ${latest.cash} 元 × 一年 ${freq} 次 ÷ 買入價 ${buy.close}`,
  };
}

// XIRR（年化內部報酬率），用二分法求解，結果以 % 表示
function xirr(flows: { date: string; amount: number }[]): number | null {
  const t0 = flows[0].date;
  const npv = (r: number) =>
    flows.reduce((s, f) => s + f.amount / Math.pow(1 + r, dayDiff(t0, f.date) / 365), 0);
  let lo = -0.9999;
  let hi = 10;
  if (npv(lo) * npv(hi) > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (npv(lo) * npv(mid) <= 0) hi = mid;
    else lo = mid;
  }
  return ((lo + hi) / 2) * 100;
}

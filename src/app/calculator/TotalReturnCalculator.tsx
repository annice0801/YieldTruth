"use client";

import { useState } from "react";
import type { TotalReturnResult } from "@/lib/totalReturn";
import { AssetChart, PriceChart } from "./ResultCharts";

type ApiResult = TotalReturnResult & {
  code: string;
  name: string | null;
  data: {
    lastClose: string;
    live: { date: string; time: string; price: number } | null;
    twseRequests: number;
    ms: number;
  };
};

const PERIODS = [
  { key: "1", label: "近 1 年" },
  { key: "3", label: "近 3 年" },
  { key: "5", label: "近 5 年" },
  { key: "custom", label: "自訂" },
] as const;
type PeriodKey = (typeof PERIODS)[number]["key"];

const QUICK_CODES = ["0056", "00878", "00919", "00929", "00940"];

const twd = (n: number) =>
  `${n < 0 ? "−" : ""}${Math.abs(Math.round(n)).toLocaleString("zh-TW")} 元`;
const pct = (n: number, signed = false) =>
  `${signed && n > 0 ? "+" : ""}${n < 0 ? "−" : ""}${Math.abs(n).toFixed(2)}%`;
// 台股慣例：漲紅跌綠
const tone = (n: number) =>
  n > 0 ? "text-rose-600" : n < 0 ? "text-emerald-600" : "";

function yearsAgo(years: number) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toLocaleDateString("sv-SE");
}

export default function TotalReturnCalculator() {
  const [code, setCode] = useState("0056");
  const [amount, setAmount] = useState("100000");
  const [period, setPeriod] = useState<PeriodKey>("1");
  const [buyDate, setBuyDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [discount, setDiscount] = useState("1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResult | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const from = period === "custom" ? buyDate : yearsAgo(Number(period));
    if (!from) return setError("請選擇買入日期");
    const params = new URLSearchParams({
      code,
      buyDate: from,
      amount,
      feeDiscount: discount,
    });
    if (period === "custom" && endDate) params.set("endDate", endDate);

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/total-return?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "試算失敗");
      setResult(data);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "試算失敗");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-6">
      <form
        onSubmit={submit}
        className="yt-card p-5 sm:p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium">ETF／股票代號</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="input mt-1"
              placeholder="0056"
              required
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {QUICK_CODES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCode(c)}
                  className={`yt-chip !px-2.5 !py-0.5 !text-xs ${code === c ? "yt-chip-on" : ""}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </label>

          <label className="block">
            <span className="text-sm font-medium">投入金額（元）</span>
            <input
              type="number"
              min={1000}
              step={1000}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input mt-1"
              required
            />
          </label>

          <div className="sm:col-span-2">
            <span className="text-sm font-medium">持有期間</span>
            <div className="mt-1 flex flex-wrap gap-2">
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPeriod(p.key)}
                  className={`yt-chip ${period === p.key ? "yt-chip-on" : ""}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {period === "custom" && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs text-zinc-500">買入日期</span>
                  <input type="date" value={buyDate} onChange={(e) => setBuyDate(e.target.value)} className="input mt-1" required />
                </label>
                <label className="block">
                  <span className="text-xs text-zinc-500">試算終點（留空＝今天）</span>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input mt-1" />
                </label>
              </div>
            )}
          </div>

          <label className="block">
            <span className="text-sm font-medium">手續費折數</span>
            <select value={discount} onChange={(e) => setDiscount(e.target.value)} className="input mt-1">
              <option value="1">不打折（0.1425%）</option>
              <option value="0.6">6 折</option>
              <option value="0.28">2.8 折</option>
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="yt-btn w-full"
            >
              {loading ? "向證交所取資料中…" : "試算含息總報酬"}
            </button>
          </div>
        </div>
        {loading && (
          <p className="mt-3 text-xs text-zinc-500">
            已存在資料庫的期間會立即算好；第一次查詢的代號或更早的期間，需要先向證交所逐月補抓（每月約 2–3 秒），之後就存在資料庫裡。
          </p>
        )}
      </form>

      {error && (
        <p className="rounded-2xl border border-[#e8e1cc] bg-[#ffe0d6] px-4 py-3 text-sm">
          {error}
        </p>
      )}

      {result && <Result r={result} />}
    </section>
  );
}

function Result({ r }: { r: ApiResult }) {
  const t = r.totals;
  const annualLabel = t.days >= 365 ? "實際年化含息報酬" : "實際含息報酬（未滿一年不年化）";
  const actual = t.days >= 365 && t.xirrPct !== null ? t.xirrPct : t.returnPct;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">
        {r.code} {r.name}
        <span className="ml-2 text-sm font-normal text-zinc-500">
          {r.buy.date} 買入 → {r.end.date}（{Math.round(t.days)} 天）
        </span>
      </h2>
      <p className="-mt-4 text-xs text-zinc-500">
        {r.data.live
          ? `期末價為今日 ${r.data.live.time} 即時成交價 ${r.data.live.price}（基本市況報導，延遲約 5 秒）`
          : `資料更新至 ${r.data.lastClose} 收盤`}
        {r.data.twseRequests > 0 && `｜本次向證交所補抓 ${r.data.twseRequests} 筆，已存入資料庫`}
      </p>

      {/* 標題 vs 實際 */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="yt-card-flat p-5">
          <p className="text-sm text-zinc-500">你看到的標題殖利率</p>
          <p className="mt-1 text-4xl font-bold tabular-nums text-zinc-400 line-through decoration-2">
            {r.headline ? pct(r.headline.yieldPct) : "—"}
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            {r.headline ? r.headline.basis : "買入前一年沒有配息紀錄"}
          </p>
        </div>
        <div className="yt-card bg-[#fff1b8] p-5">
          <p className="text-sm text-zinc-500">{annualLabel}</p>
          <p className={`mt-1 text-4xl font-bold tabular-nums ${tone(actual)}`}>{pct(actual, true)}</p>
          <p className="mt-2 text-xs text-zinc-500">
            含配息、價差、手續費、證交稅與二代健保
            {t.days >= 365 && "，以 XIRR 年化"}
          </p>
        </div>
      </div>

      <Erosion r={r} />

      <AssetChart series={r.series} invested={r.buy.invested} />
      <PriceChart series={r.series} dividends={r.dividends} buyPrice={r.buy.price} />

      {/* 報酬拆解 */}
      <div className="yt-card overflow-hidden">
        <h3 className="border-b border-[#e8e1cc] px-5 py-3 font-bold">報酬拆解</h3>
        <dl className="divide-y divide-zinc-100 text-sm">
          <Row label={`投入本金（${r.buy.shares.toLocaleString()} 股 × ${r.buy.price}，含手續費）`} value={twd(r.buy.invested)} />
          <Row label={`配息收入（${r.dividends.length} 次）`} value={twd(t.dividendGross)} cls={tone(t.dividendGross)} />
          <Row label={`價差損益（${r.buy.price} → ${r.end.price}）`} value={twd(t.priceGain)} cls={tone(t.priceGain)} />
          <Row label="成本與稅費（手續費、證交稅、二代健保）" value={twd(-t.costs)} cls={tone(-t.costs)} />
          <Row label="實際賺賠" value={`${twd(t.net)}（${pct(t.returnPct, true)}）`} cls={`font-semibold ${tone(t.net)}`} />
        </dl>
      </div>

      {/* 配息明細 */}
      {r.dividends.length > 0 && (
        <div className="yt-card-flat overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm tabular-nums">
            <thead className="bg-zinc-50 text-left text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-medium">除息日</th>
                <th className="px-4 py-2 text-right font-medium">每股配息</th>
                <th className="px-4 py-2 text-right font-medium">除息前收盤</th>
                <th className="px-4 py-2 text-right font-medium">領到</th>
                <th className="px-4 py-2 text-right font-medium">填息</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {r.dividends.map((d) => (
                <tr key={d.exDate}>
                  <td className="px-4 py-2">{d.exDate}</td>
                  <td className="px-4 py-2 text-right">{d.cash}</td>
                  <td className="px-4 py-2 text-right">{d.prevClose}</td>
                  <td className="px-4 py-2 text-right">
                    {twd(d.gross)}
                    {d.nhi > 0 && <span className="block text-xs text-zinc-500">扣健保 {d.nhi} 元</span>}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {d.fillDays !== null ? (
                      <span className="text-zinc-600">{d.fillDays} 天</span>
                    ) : (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                        期間內未填息
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Erosion({ r }: { r: ApiResult }) {
  const t = r.totals;
  if (t.erosionPct === null) {
    return <Callout kind="neutral">期間內沒有領到配息，報酬全部來自價差。</Callout>;
  }
  const loss = Math.max(0, -t.priceGain);
  if (loss === 0) {
    return (
      <Callout kind="good">
        本金侵蝕率 0%：期間內股價沒有低於買入價，領到的 {twd(t.dividendGross)} 配息是真正多賺的。
      </Callout>
    );
  }
  if (t.erosionPct >= 100) {
    return (
      <Callout kind="bad">
        本金侵蝕率 {t.erosionPct.toFixed(0)}%：股價跌掉 {twd(loss)}，比領到的配息 {twd(t.dividendGross)} 還多。配息全部只是在拿回自己的本金，而且還倒賠
        {twd(loss - t.dividendGross)}。
      </Callout>
    );
  }
  return (
    <Callout kind="warn">
      本金侵蝕率 {t.erosionPct.toFixed(0)}%：你領到的 {twd(t.dividendGross)} 配息中，有 {twd(loss)} 是自己的本金，真正多賺的只有{" "}
      {twd(t.dividendGross - loss)}。
    </Callout>
  );
}

function Callout({ kind, children }: { kind: "good" | "warn" | "bad" | "neutral"; children: React.ReactNode }) {
  const styles = {
    good: "bg-[#d9f0e4]",
    neutral: "bg-white",
    warn: "bg-[#fff1b8]",
    bad: "bg-[#ffe0d6]",
  }[kind];
  const icon = { good: "●", neutral: "○", warn: "▲", bad: "■" }[kind];
  const color = { good: "var(--status-good)", neutral: "var(--chart-muted)", warn: "var(--status-warning)", bad: "var(--status-critical)" }[kind];
  return (
    <p className={`flex gap-2.5 rounded-3xl border border-[#e8e1cc] px-5 py-4 text-sm leading-relaxed shadow-[0_10px_28px_-14px_rgba(29,29,27,0.28)] ${styles}`}>
      <span aria-hidden style={{ color }}>{icon}</span>
      <span>{children}</span>
    </p>
  );
}

function Row({ label, value, cls = "" }: { label: string; value: string; cls?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-5 py-3">
      <dt className="text-zinc-600">{label}</dt>
      <dd className={`shrink-0 tabular-nums ${cls}`}>{value}</dd>
    </div>
  );
}

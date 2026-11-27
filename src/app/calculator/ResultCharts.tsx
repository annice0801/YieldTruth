"use client";

import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartPoint, DividendRow } from "@/lib/totalReturn";

// recharts 傳給自訂 tooltip 的 props（只取用到的部分）
type TipProps = { active?: boolean; payload?: readonly { payload?: unknown }[] };

const compact = new Intl.NumberFormat("zh-TW", { notation: "compact", maximumFractionDigits: 1 });
const full = (n: number) => Math.round(n).toLocaleString("zh-TW");
const monthTick = (d: string) => `${d.slice(0, 4)}/${d.slice(5, 7)}`;

/** 每月第一個交易日當刻度；期間太長時每隔 n 個月取一個 */
function monthTicks(dates: string[]) {
  const firsts = dates.filter((d, i) => i > 0 && d.slice(0, 7) !== dates[i - 1].slice(0, 7));
  const step = Math.max(1, Math.ceil(firsts.length / 8));
  return firsts.filter((_, i) => i % step === 0);
}

const axisProps = {
  stroke: "var(--chart-grid)",
  tick: { fill: "var(--chart-muted)", fontSize: 12 },
  tickLine: false,
} as const;

function Card({ title, subtitle, legend, children }: { title: string; subtitle: string; legend?: React.ReactNode; children: React.ReactNode }) {
  return (
    <figure className="yt-card p-5">
      <figcaption>
        <h3 className="font-bold">{title}</h3>
        <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>
        {legend && <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600">{legend}</div>}
      </figcaption>
      <div className="mt-3 h-64 sm:h-72">{children}</div>
    </figure>
  );
}

function Key({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg width="16" height="8" aria-hidden>
        <line x1="0" y1="4" x2="16" y2="4" stroke={color} strokeWidth={2} strokeDasharray={dashed ? "3 3" : undefined} />
      </svg>
      {label}
    </span>
  );
}

function TipBox({ title, rows }: { title: string; rows: [string, string, string?][] }) {
  return (
    <div className="min-w-44 rounded-2xl border-2 border-zinc-900 bg-white px-3 py-2 text-xs shadow-[3px_3px_0_#1d1d1b]">
      <p className="mb-1 font-medium">{title}</p>
      {rows.map(([label, value, color]) => (
        <p key={label} className="flex items-center justify-between gap-4 tabular-nums">
          <span className="flex items-center gap-1.5 text-zinc-500">
            {color && <span className="inline-block size-2 rounded-full" style={{ background: color }} />}
            {label}
          </span>
          <span className="text-zinc-900">{value}</span>
        </p>
      ))}
    </div>
  );
}

function AssetTip({ active, payload, invested }: TipProps & { invested: number }) {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload as ChartPoint;
    return (
      <TipBox
        title={p.date}
        rows={[
          ["市值＋累計配息", `${full(p.total)} 元`, "var(--series-1)"],
          ["持股市值", `${full(p.marketValue)} 元`, "var(--series-2)"],
          ["累計配息", `${full(p.cumDividend)} 元`],
          ["相對本金", `${p.total >= invested ? "+" : "−"}${full(Math.abs(p.total - invested))} 元`],
        ]}
      />
    );
}

/** 資產走勢：持股市值 vs 市值＋累計配息，對照投入本金 */
export function AssetChart({ series, invested }: { series: ChartPoint[]; invested: number }) {
  const ticks = monthTicks(series.map((p) => p.date));
  return (
    <Card
      title="資產走勢"
      subtitle="兩條線之間的距離就是累計配息；藍線低於本金線，代表連配息一起算還是虧損"
      legend={
        <>
          <Key color="var(--series-1)" label="市值＋累計配息" />
          <Key color="var(--series-2)" label="持股市值" />
          <Key color="var(--chart-muted)" label={`投入本金 ${full(invested)} 元`} dashed />
        </>
      }
    >
      <ResponsiveContainer>
        <ComposedChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey="date" {...axisProps} ticks={ticks} tickFormatter={monthTick} interval="preserveStartEnd" />
          <YAxis {...axisProps} axisLine={false} width={52} tickFormatter={(v: number) => compact.format(v)} domain={["auto", "auto"]} />
          <ReferenceLine y={invested} stroke="var(--chart-muted)" strokeDasharray="4 4" />
          <Tooltip content={(p) => <AssetTip {...p} invested={invested} />} cursor={{ stroke: "var(--chart-muted)", strokeWidth: 1 }} />
          <Line dataKey="marketValue" stroke="var(--series-2)" strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: "var(--chart-surface)", strokeWidth: 2 }} isAnimationActive={false} />
          <Line dataKey="total" stroke="var(--series-1)" strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: "var(--chart-surface)", strokeWidth: 2 }} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </Card>
  );
}

type PricePoint = { date: string; close: number; ex?: DividendRow };

function PriceTip({ active, payload }: TipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as PricePoint;
  const rows: [string, string, string?][] = [["收盤價", String(p.close), "var(--series-1)"]];
  if (p.ex) {
    rows.push(
      ["除息", `每股 ${p.ex.cash} 元`],
      ["填息目標", String(p.ex.prevClose)],
      ["填息", p.ex.fillDays !== null ? `${p.ex.fillDays} 個交易日` : "期間內未填息"],
    );
  }
  return <TipBox title={p.ex ? `${p.date}　除息日` : p.date} rows={rows} />;
}

/** 股價與除息：收盤價走勢，標出每次除息與填息狀況 */
export function PriceChart({ series, dividends, buyPrice }: { series: ChartPoint[]; dividends: DividendRow[]; buyPrice: number }) {
  const exByDate = new Map(dividends.map((d) => [d.exDate, d]));
  const data: PricePoint[] = series.map((p) => ({ date: p.date, close: p.close, ex: exByDate.get(p.date) }));
  const ticks = monthTicks(data.map((p) => p.date));

  return (
    <Card
      title="股價與除息"
      subtitle="圓點為除息日；除息後股價回到除息前收盤價才算填息"
      legend={
        <>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-full border-2 border-[var(--chart-surface)] bg-[var(--series-1)] ring-1 ring-[var(--series-1)]" />
            除息日
          </span>
          <Key color="var(--chart-muted)" label={`買入價 ${buyPrice}`} dashed />
        </>
      }
    >
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey="date" {...axisProps} ticks={ticks} tickFormatter={monthTick} interval="preserveStartEnd" />
          <YAxis {...axisProps} axisLine={false} width={44} domain={["auto", "auto"]} />
          <ReferenceLine y={buyPrice} stroke="var(--chart-muted)" strokeDasharray="4 4" />
          <Tooltip content={(p) => <PriceTip {...p} />} cursor={{ stroke: "var(--chart-muted)", strokeWidth: 1 }} />
          <Line
            dataKey="close"
            stroke="var(--series-1)"
            strokeWidth={2}
            isAnimationActive={false}
            activeDot={{ r: 5, stroke: "var(--chart-surface)", strokeWidth: 2 }}
            dot={({ cx, cy, payload, index }: { cx?: number; cy?: number; payload?: PricePoint; index?: number }) =>
              payload?.ex && cx !== undefined && cy !== undefined ? (
                <circle key={index} cx={cx} cy={cy} r={5} fill="var(--series-1)" stroke="var(--chart-surface)" strokeWidth={2} />
              ) : (
                <g key={index} />
              )
            }
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Card>
  );
}

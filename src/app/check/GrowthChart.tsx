"use client";

import { useEffect, useRef, useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ChartPoint, DividendRow } from "@/lib/totalReturn";

export type History = {
  buy: { date: string; price: number; shares: number; invested: number };
  end: { date: string; price: number; marketValue: number };
  dividends: DividendRow[];
  series: ChartPoint[];
  totals: { dividendGross: number; priceGain: number; net: number; returnPct: number; erosionPct: number | null };
};

/** 數字跑表動畫 */
export function useCountUp(target: number, ms = 900) {
  const [v, setV] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tick = (t: number) => {
      const p = reduce ? 1 : Math.min(1, (t - start) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      const next = a + (target - a) * eased;
      setV(next);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

type Bucket = { label: string; dividend: number; cumDividend: number; priceGain: number; gainPos: number; gainNeg: number; net: number };

/** 依配息頻率切成每月或每季 */
function buckets(h: History, quarterly: boolean): Bucket[] {
  const map = new Map<string, ChartPoint>();
  for (const p of h.series) {
    const [y, m] = p.date.split("-").map(Number);
    const key = quarterly ? `${y}-Q${Math.ceil(m / 3)}` : `${y}-${String(m).padStart(2, "0")}`;
    map.set(key, p); // 留下每期最後一天
  }
  const cost = Math.round(h.buy.shares * h.buy.price);
  let prevCum = 0;
  return [...map.entries()].map(([key, p]) => {
    const priceGain = p.marketValue - cost;
    const dividend = p.cumDividend - prevCum;
    prevCum = p.cumDividend;
    const label = quarterly ? `${key.slice(2, 4)}${key.slice(4).replace("-", " ")}` : `${Number(key.slice(5))}月`;
    return {
      label,
      dividend,
      cumDividend: p.cumDividend,
      priceGain,
      gainPos: Math.max(0, priceGain),
      gainNeg: Math.min(0, priceGain),
      net: p.cumDividend + priceGain,
    };
  });
}

const yen = (n: number) => `${n < 0 ? "−" : ""}${Math.abs(Math.round(n)).toLocaleString()}`;

export default function GrowthChart({ h, quarterly, animKey }: { h: History; quarterly: boolean; animKey: string }) {
  const data = buckets(h, quarterly);
  const invested = useCountUp(h.buy.invested);
  const divs = useCountUp(h.totals.dividendGross);
  const ret = useCountUp(h.totals.returnPct);
  const lastFew = data.filter((d) => d.dividend > 0).slice(-6);

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <Counter label="本金" value={`${yen(invested)}`} />
        <Counter label="累計領息" value={`+${yen(divs)}`} tone="mustard" />
        <Counter label="含息報酬" value={`${ret > 0 ? "+" : ""}${ret.toFixed(1)}%`} tone={h.totals.returnPct >= 0 ? "green" : "coral"} />
      </div>

      <div className="mt-3 h-44">
        <ResponsiveContainer>
          <ComposedChart key={animKey} data={data} stackOffset="sign" margin={{ top: 6, right: 2, bottom: 0, left: -8 }}>
            <CartesianGrid vertical={false} stroke="#ece6d3" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#7a7466" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10, fill: "#7a7466" }} tickLine={false} axisLine={false} width={40} tickFormatter={(v: number) => (Math.abs(v) >= 10000 ? `${(v / 10000).toFixed(0)}萬` : String(v))} />
            <ReferenceLine y={0} stroke="#1d1d1b" strokeWidth={1.5} />
            <Tooltip
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const b = payload[0].payload as Bucket;
                return (
                  <div className="rounded-xl border-2 border-[#1d1d1b] bg-white px-2.5 py-1.5 text-[11px] shadow-[2px_2px_0_#1d1d1b]">
                    <p className="font-bold">{b.label}</p>
                    <p>本期領息 +{yen(b.dividend)}</p>
                    <p>累計領息 +{yen(b.cumDividend)}</p>
                    <p>股價損益 {yen(b.priceGain)}</p>
                    <p className="font-bold">合計 {yen(b.net)}</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="cumDividend" stackId="a" fill="#e0a91c" stroke="#1d1d1b" strokeWidth={1.5} radius={[4, 4, 0, 0]} animationDuration={900} maxBarSize={22} />
            <Bar dataKey="gainPos" stackId="a" fill="#2f8f6c" stroke="#1d1d1b" strokeWidth={1.5} radius={[4, 4, 0, 0]} animationDuration={900} animationBegin={200} maxBarSize={22} />
            <Bar dataKey="gainNeg" stackId="a" fill="#e5603f" stroke="#1d1d1b" strokeWidth={1.5} radius={[0, 0, 4, 4]} animationDuration={900} animationBegin={200} maxBarSize={22} />
            <Line dataKey="net" stroke="#1d1d1b" strokeWidth={2} dot={{ r: 3, fill: "#fff", stroke: "#1d1d1b", strokeWidth: 2 }} animationDuration={1200} animationBegin={500} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10px] text-[#5b5546]">
        <Key color="#e0a91c" label="累計領息" />
        <Key color="#2f8f6c" label="股價漲" />
        <Key color="#e5603f" label="股價跌（吃掉本金）" />
        <span className="inline-flex items-center gap-1">
          <span className="inline-block size-2 rounded-full border-2 border-[#1d1d1b] bg-white" />
          合計
        </span>
      </div>

      {lastFew.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-bold text-[#5b5546]">{quarterly ? "每季" : "每月"}領到的利息</p>
          <ul className="mt-1.5 flex gap-1.5 overflow-x-auto pb-1">
            {lastFew.map((d, i) => (
              <li
                key={d.label}
                className="yt-pop shrink-0 rounded-full border-2 border-[#1d1d1b] bg-[#fff5cf] px-2.5 py-1 text-[11px] font-bold tabular-nums"
                style={{ animationDelay: `${i * 90}ms` }}
              >
                {d.label} +{yen(d.dividend)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Counter({ label, value, tone }: { label: string; value: string; tone?: "mustard" | "green" | "coral" }) {
  const bg = tone === "mustard" ? "bg-[#fff1b8]" : tone === "green" ? "bg-[#d9f0e4]" : tone === "coral" ? "bg-[#ffe0d6]" : "bg-white";
  return (
    <div className={`rounded-2xl border border-[#e8e1cc] px-1 py-1.5 ${bg}`}>
      <p className="text-[10px] text-[#5b5546]">{label}</p>
      <p className="text-sm font-bold tabular-nums">{value}</p>
    </div>
  );
}

function Key({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-block size-2.5 rounded-sm border border-[#1d1d1b]" style={{ background: color }} />
      {label}
    </span>
  );
}

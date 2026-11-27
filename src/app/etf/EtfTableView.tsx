"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Term from "@/components/Term";
import type { EtfRow, Frequency } from "@/lib/etfTable";

const FREQ_STYLE: Record<Frequency, string> = {
  月配: "bg-[#3b78c9] text-white",
  雙月配: "bg-[#8e6bc7] text-white",
  季配: "bg-[#2f8f6c] text-white",
  半年配: "bg-[#7a7466] text-white",
  年配: "bg-[#7a7466] text-white",
  未配息: "bg-[#e8e1cc] text-zinc-700",
};
const FILTERS = ["全部", "月配", "季配", "主動式"] as const;
const SORTS = {
  annual: { label: "年化殖利率高→低", fn: (a: EtfRow, b: EtfRow) => (b.annualYieldPct ?? -1) - (a.annualYieldPct ?? -1) },
  fill: { label: "平均填息天數短→長", fn: (a: EtfRow, b: EtfRow) => (a.fill.avgDays ?? 9999) - (b.fill.avgDays ?? 9999) },
  next: { label: "下次除息近→遠", fn: (a: EtfRow, b: EtfRow) => (a.next?.exDate ?? "9999").localeCompare(b.next?.exDate ?? "9999") },
  aum: { label: "規模大→小", fn: (a: EtfRow, b: EtfRow) => (b.aumYi ?? 0) - (a.aumYi ?? 0) },
} as const;

const pct = (n: number | null, d = 2) => (n === null ? "—" : `${n.toFixed(d)}%`);
const md = (iso?: string) => (iso ? `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}` : "—");

function FillCell({ f }: { f: EtfRow["fill"] }) {
  if (f.samples === 0) return <span className="text-zinc-400">—</span>;
  return (
    <span className="tabular-nums">
      <span className="font-bold">{f.avgDays === null ? "—" : `${f.avgDays} 天`}</span>
      <span className="block text-[11px] text-zinc-500">
        近 {f.samples} 次{f.unfilled > 0 && `・${f.unfilled} 次未填息`}
      </span>
    </span>
  );
}

function StateBadge({ s }: { s: EtfRow["fill"]["latestState"] }) {
  if (!s) return <span className="text-zinc-400">—</span>;
  const m = {
    filled: { t: "已填息", c: "bg-[#d9f0e4]", i: "●", ic: "var(--status-good)" },
    filling: { t: "填息中", c: "bg-[#fff1b8]", i: "▲", ic: "var(--status-warning)" },
    discount: { t: "貼息", c: "bg-[#ffe0d6]", i: "■", ic: "var(--status-critical)" },
  }[s];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-bold ${m.c}`}>
      <span aria-hidden style={{ color: m.ic }}>{m.i}</span>
      {m.t}
    </span>
  );
}

function HealthDot({ h }: { h: EtfRow["health"] }) {
  if (!h) return <span className="text-xs text-zinc-400">未收錄</span>;
  const m = { good: ["●", "健康", "var(--status-good)"], warn: ["▲", "留意", "var(--status-warning)"], bad: ["■", "警示", "var(--status-critical)"] }[h];
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-bold">
      <span aria-hidden style={{ color: m[2] }}>{m[0]}</span>
      {m[1]}
    </span>
  );
}

export default function EtfTableView({ rows }: { rows: EtfRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("全部");
  const [sort, setSort] = useState<keyof typeof SORTS>("annual");

  const list = useMemo(() => {
    const f = rows.filter((r) => (filter === "全部" ? true : filter === "主動式" ? r.active : r.frequency === filter));
    return [...f].sort(SORTS[sort].fn);
  }, [rows, filter, sort]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="篩選">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f} className={`yt-chip !py-1 ${filter === f ? "yt-chip-on" : ""}`}>
              {f}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-zinc-500">排序</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as keyof typeof SORTS)} className="rounded-full border-2 border-[#d8cfb4] bg-white px-3 py-1.5 text-sm font-bold">
            {Object.entries(SORTS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* 平板以上：表格 */}
      <div className="yt-card mt-4 hidden overflow-x-auto md:block">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="bg-[#1d1d1b] text-left text-xs text-white">
              <th className="rounded-tl-3xl px-4 py-3 font-bold">代號／名稱</th>
              <th className="px-3 py-3 font-bold">配息頻率</th>
              <th className="px-3 py-3 text-right font-bold">最新配息</th>
              <th className="px-3 py-3 text-right font-bold">單次殖利率</th>
              <th className="px-3 py-3 text-right font-bold">
                <Term t="年化殖利率" />
              </th>
              <th className="px-3 py-3 font-bold">
                平均<Term t="填息">填息</Term>天數
              </th>
              <th className="px-3 py-3 font-bold">目前狀態</th>
              <th className="px-3 py-3 font-bold">來源燈號</th>
              <th className="rounded-tr-3xl px-4 py-3 font-bold">下次除息／最後買進</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#efe9d8]">
            {list.map((r) => (
              <tr key={r.code} onClick={() => router.push(`/etf/${r.code}`)} className="cursor-pointer transition hover:bg-[#fff8dc]">
                <td className="px-4 py-3">
                  <Link href={`/etf/${r.code}`} className="font-bold hover:underline" onClick={(e) => e.stopPropagation()}>
                    {r.code}
                  </Link>
                  <span className="block text-xs text-zinc-600">
                    {r.name}
                    {r.active && <span className="ml-1 rounded-full bg-[#f5c93b] px-1.5 text-[10px] font-bold text-zinc-900">主動</span>}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${FREQ_STYLE[r.frequency]}`}>{r.frequency}</span>
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {r.latest ? (
                    <>
                      <span className="font-bold">{r.latest.cash}</span>
                      <span className="block text-[11px] text-zinc-500">{md(r.latest.exDate)} 除息</span>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">{pct(r.periodYieldPct)}</td>
                <td className="px-3 py-3 text-right font-bold tabular-nums">{pct(r.annualYieldPct, 1)}</td>
                <td className="px-3 py-3">
                  <FillCell f={r.fill} />
                </td>
                <td className="px-3 py-3">
                  <StateBadge s={r.fill.latestState} />
                </td>
                <td className="px-3 py-3">
                  <HealthDot h={r.health} />
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {r.next ? (
                    <>
                      <span className="font-bold">{md(r.next.exDate)}</span>
                      <span className="block text-[11px] text-zinc-500">最後買進 {md(r.next.lastBuyDate)}</span>
                    </>
                  ) : (
                    <span className="text-zinc-400">未公告</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 手機：卡片 */}
      <ul className="mt-4 space-y-3 md:hidden">
        {list.map((r) => (
          <li key={r.code}>
            <Link href={`/etf/${r.code}`} className="yt-card block p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold">
                    {r.code} <span className="font-normal">{r.name}</span>
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${FREQ_STYLE[r.frequency]}`}>{r.frequency}</span>
                    {r.active && <span className="rounded-full bg-[#f5c93b] px-2 py-0.5 text-[11px] font-bold">主動</span>}
                    <StateBadge s={r.fill.latestState} />
                  </div>
                </div>
                <span aria-hidden className="text-lg">→</span>
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-2xl bg-[#f3eddc] p-2">
                  <dt className="text-zinc-500">最新配息</dt>
                  <dd className="mt-0.5 font-bold tabular-nums">{r.latest?.cash ?? "—"}</dd>
                </div>
                <div className="rounded-2xl bg-[#f3eddc] p-2">
                  <dt className="text-zinc-500">年化殖利率</dt>
                  <dd className="mt-0.5 font-bold tabular-nums">{pct(r.annualYieldPct, 1)}</dd>
                </div>
                <div className="rounded-2xl bg-[#f3eddc] p-2">
                  <dt className="text-zinc-500">平均填息</dt>
                  <dd className="mt-0.5 font-bold tabular-nums">{r.fill.avgDays === null ? "—" : `${r.fill.avgDays} 天`}</dd>
                </div>
              </dl>
              <p className="mt-2 text-[11px] text-zinc-500">
                {r.next ? `下次除息 ${md(r.next.exDate)}（最後買進 ${md(r.next.lastBuyDate)}）` : "下次除息未公告"}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs leading-relaxed text-zinc-500">
        單次殖利率＝最近一次配息 ÷ 除息前收盤；年化殖利率＝最近一次配息 × 一年配息次數（依配息頻率）÷ 現價。平均填息天數取近 8 次已填息者平均（交易日計，除息日為第 1 天）。最後買進日為除息日前一個平日，遇連假請以券商公告為準。
      </p>
    </div>
  );
}

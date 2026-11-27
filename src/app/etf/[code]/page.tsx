import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Backdrop } from "@/components/Blocks";
import { Bubble, Cat, Dog } from "@/components/Mascots";
import Term from "@/components/Term";
import { withTerms } from "@/components/withTerms";
import { ETF_INSIGHTS } from "@/data/etfInsights";
import { ETF_PROFILES, profileOf, type EtfProfile } from "@/data/etfProfiles";
import { fillHistory } from "@/lib/checkCard";
import { getEtfRows } from "@/lib/etfTable";
import { EtfCard } from "../parts";

export function generateStaticParams() {
  return ETF_PROFILES.map((p) => ({ code: p.code }));
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const p = profileOf((await params).code);
  return p ? { title: `${p.code} ${p.short}｜ETF 配息觀察｜YieldTruth`, description: `${p.short}的配息、填息、經理費與投資標的` } : {};
}

export default async function EtfDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const p = profileOf(code);
  if (!p) notFound();
  const insight = ETF_INSIGHTS.find((e) => e.code === code);
  const active = code.endsWith("A");

  return (
    <div className="relative isolate flex-1">
      <Backdrop />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12">
        <Link href="/etf" className="text-sm font-bold text-zinc-600 hover:underline">
          ← 回配息總表
        </Link>

        {/* 標題 */}
        <header className="yt-dots relative mt-4 overflow-hidden rounded-[40px] bg-[#f3eddc] px-6 py-8 sm:px-10">
          <div aria-hidden className="absolute -right-16 -top-20 size-56 rounded-full bg-[#f5c93b]" />
          <div className="relative flex items-end gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-full bg-zinc-900 px-2.5 py-0.5 text-xs font-bold text-white">{active ? "主動式" : "被動式"}</span>
                {p.themes.map((t) => (
                  <span key={t} className="rounded-full bg-white px-2.5 py-0.5 text-xs font-bold">
                    {t}
                  </span>
                ))}
              </div>
              <h1 className="mt-3 text-4xl leading-tight sm:text-5xl">
                {p.code} <span className="bg-[linear-gradient(transparent_60%,#f5c93b_60%)]">{p.short}</span>
              </h1>
              <p className="mt-2 text-sm text-zinc-600">
                {p.fullName}・{p.issuer}
              </p>
            </div>
            <div className="hidden w-28 shrink-0 text-center sm:block lg:w-32">
              <Bubble text="看仔細！" side="right" className="yt-pop mb-2 !text-sm" />
              {active ? <Dog mood="yellow" className="yt-bob w-full" /> : <Cat mood="green" className="yt-bob w-full" />}
            </div>
          </div>
        </header>

        {/* 關鍵數字 */}
        <Suspense fallback={<div className="mt-6 h-40 animate-pulse rounded-3xl bg-white/70" />}>
          <KeyStats code={code} profile={p} />
        </Suspense>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          {/* 基本資料 */}
          <section className="yt-card p-6">
            <h2 className="font-[family-name:var(--font-huninn)] text-2xl">基本資料</h2>
            <dl className="mt-4 divide-y divide-[#efe9d8] text-sm">
              <Row label="投資標的" value={withTerms(p.strategy)} />
              <Row label={<Term t="標的指數" />} value={p.index ?? (active ? "無（主動式由經理人選股）" : "—")} />
              <Row label="發行投信" value={p.issuer} />
              <Row label="基金經理人" value={p.manager} />
              <Row label={<Term t="經理費" />} value={p.fee} />
              <Row label={<Term t="保管費" />} value={p.custody} />
              <Row label="資產規模" value={`${p.aumYi.toLocaleString()} 億元`} />
              <Row label={<Term t="受益人次" />} value={`${p.holdersWan} 萬人`} />
            </dl>
            <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
              基本資料來自證交所 ETF e添富（{p.asOf}）。經理費與保管費多為依規模分級，依
              <a href={p.feeSource} target="_blank" rel="noopener noreferrer" className="underline">
                公開資料
              </a>
              整理，實際以投信公開說明書為準。
            </p>
          </section>

          {/* 績效 */}
          <section className="yt-card p-6">
            <h2 className="font-[family-name:var(--font-huninn)] text-2xl">報酬表現</h2>
            <p className="mt-1 text-xs text-zinc-500">含息報酬，資料日期 {p.asOf}</p>
            <Performance p={p} />
          </section>
        </div>

        {/* 配息組成與重點 */}
        <section className="mt-6">
          <h2 className="font-[family-name:var(--font-huninn)] text-2xl">配息組成與重點</h2>
          <div className="mt-4">
            {insight ? (
              <EtfCard e={insight} />
            ) : (
              <p className="yt-card-flat p-5 text-sm text-zinc-600">{withTerms("這檔尚未收錄配息組成報導。可在下方歷次配息紀錄查看填息狀況；組成請以投信的收益分配通知書為準。")}</p>
            )}
          </div>
        </section>

        {/* 歷次配息 */}
        <section className="mt-6">
          <h2 className="font-[family-name:var(--font-huninn)] text-2xl">歷次配息與填息紀錄</h2>
          <Suspense fallback={<div className="mt-4 h-64 animate-pulse rounded-3xl bg-white/70" />}>
            <History code={code} />
          </Suspense>
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={`/check?code=${code}`} className="yt-btn">
            下單前體檢這檔 →
          </Link>
          <Link href="/etf" className="yt-chip px-5 py-2.5">
            回配息總表
          </Link>
        </div>
        <p className="mt-6 text-xs text-zinc-500">本頁僅供資訊揭露與個人參考，不構成投資建議。</p>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] gap-3 py-3 sm:grid-cols-[8rem_1fr]">
      <dt className="font-bold text-zinc-600">{label}</dt>
      <dd className="leading-relaxed">{value}</dd>
    </div>
  );
}

function Performance({ p }: { p: EtfProfile }) {
  const max = Math.max(...p.performance.map((x) => Math.abs(x.pct ?? 0)), 1);
  return (
    <ul className="mt-4 space-y-2.5 text-sm">
      {p.performance.map((x) => (
        <li key={x.label} className="grid grid-cols-[3.5rem_1fr_4.5rem] items-center gap-2">
          <span className="text-zinc-600">{x.label}</span>
          <span className="relative h-3.5 rounded-full bg-[#f3eddc]">
            {x.pct !== null && (
              <span
                className="yt-grow absolute top-0 h-full rounded-full"
                style={{
                  width: `${(Math.abs(x.pct) / max) * 50}%`,
                  left: x.pct >= 0 ? "50%" : `${50 - (Math.abs(x.pct) / max) * 50}%`,
                  background: x.pct >= 0 ? "var(--sage)" : "var(--coral)",
                  transformOrigin: x.pct >= 0 ? "left" : "right",
                }}
              />
            )}
            <span aria-hidden className="absolute left-1/2 top-[-3px] h-5 w-px bg-zinc-400" />
          </span>
          <span className={`text-right font-bold tabular-nums ${x.pct === null ? "text-zinc-400" : ""}`}>
            {x.pct === null ? "未滿" : `${x.pct > 0 ? "+" : ""}${x.pct.toFixed(2)}%`}
          </span>
        </li>
      ))}
    </ul>
  );
}

async function KeyStats({ code, profile }: { code: string; profile: EtfProfile }) {
  const row = (await getEtfRows()).find((r) => r.code === code);
  const stats: { label: React.ReactNode; value: string; sub?: string; tone: string }[] = [
    {
      label: "現價",
      value: row?.price ? String(row.price) : "—",
      sub: row?.premiumPct !== null && row?.premiumPct !== undefined ? `${row.premiumPct >= 0 ? "溢價" : "折價"} ${Math.abs(row.premiumPct).toFixed(2)}%` : undefined,
      tone: "bg-white",
    },
    {
      label: "最新配息",
      value: row?.latest ? `${row.latest.cash} 元` : "尚未配息",
      sub: row?.latest ? `${row.latest.exDate} 除息・${row.frequency}` : undefined,
      tone: "bg-[#fff1b8]",
    },
    { label: <Term t="年化殖利率" />, value: row?.annualYieldPct ? `${row.annualYieldPct.toFixed(1)}%` : "—", sub: "最近一次 × 一年次數 ÷ 現價", tone: "bg-white" },
    {
      label: (
        <>
          平均<Term t="填息">填息</Term>天數
        </>
      ),
      value: row?.fill.avgDays !== null && row?.fill.avgDays !== undefined ? `${row.fill.avgDays} 天` : "—",
      sub: row && row.fill.samples ? `近 ${row.fill.samples} 次・${row.fill.unfilled} 次未填息${row.fill.pending ? `・${row.fill.pending} 次觀察中` : ""}` : undefined,
      tone: "bg-[#d9f0e4]",
    },
    {
      label: "下次除息",
      value: row?.next ? row.next.exDate.slice(5).replace("-", "/") : "未公告",
      sub: row?.next ? `最後買進 ${row.next.lastBuyDate.slice(5).replace("-", "/")}` : undefined,
      tone: "bg-[#dbe8f7]",
    },
    { label: "資產規模", value: `${Math.round(profile.aumYi).toLocaleString()} 億`, sub: `受益人 ${profile.holdersWan} 萬`, tone: "bg-white" },
  ];
  return (
    <dl className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      {stats.map((s, i) => (
        <div key={i} className={`yt-card p-4 ${s.tone}`}>
          <dt className="text-xs font-bold text-zinc-500">{s.label}</dt>
          <dd className="mt-1 text-xl font-bold tabular-nums">{s.value}</dd>
          {s.sub && <dd className="mt-0.5 text-[11px] text-zinc-500">{s.sub}</dd>}
        </div>
      ))}
    </dl>
  );
}

async function History({ code }: { code: string }) {
  await connection(); // 配息紀錄每次請求即時讀取，不在建置時預先產生
  const rows = (await fillHistory(code, { requests: 0 }).catch(() => [])).reverse();
  if (rows.length === 0) return <p className="yt-card-flat mt-4 p-5 text-sm text-zinc-600">沒有除息紀錄。</p>;
  return (
    <div className="yt-card mt-4 overflow-x-auto">
      <table className="w-full min-w-[620px] text-sm tabular-nums">
        <thead>
          <tr className="bg-[#f3eddc] text-left text-xs">
            <th className="px-4 py-3 font-bold">除息日</th>
            <th className="px-3 py-3 text-right font-bold">每股配息</th>
            <th className="px-3 py-3 text-right font-bold">除息前收盤</th>
            <th className="px-3 py-3 text-right font-bold">
              <Term t="除息參考價" />
            </th>
            <th className="px-3 py-3 text-right font-bold">單次殖利率</th>
            <th className="px-4 py-3 font-bold">
              <Term t="填息" />
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#efe9d8]">
          {rows.map((r) => (
            <tr key={r.exDate}>
              <td className="px-4 py-3">{r.exDate}</td>
              <td className="px-3 py-3 text-right font-bold">{r.cash}</td>
              <td className="px-3 py-3 text-right">{r.prevClose}</td>
              <td className="px-3 py-3 text-right">{r.refPrice}</td>
              <td className="px-3 py-3 text-right">{((r.cash / r.prevClose) * 100).toFixed(2)}%</td>
              <td className="px-4 py-3">
                {r.pending ? (
                  <span className="rounded-full bg-[#fff1b8] px-2 py-0.5 text-xs font-bold">觀察中</span>
                ) : r.fillDays === null ? (
                  <span className="rounded-full bg-[#ffe0d6] px-2 py-0.5 text-xs font-bold">未填息</span>
                ) : (
                  <span className={`font-bold ${r.fillDays > 60 ? "text-[var(--coral)]" : ""}`}>{r.fillDays} 天</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-4 py-3 text-[11px] text-zinc-500">近 {rows.length} 次。交易日計，除息日為第 1 天；觀察中＝除息後未滿 60 個交易日且尚未填息。</p>
    </div>
  );
}

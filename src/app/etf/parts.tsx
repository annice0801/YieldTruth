import { Suspense } from "react";
import { ETF_INSIGHTS, HOLDER_RANKING, type Composition, type EtfInsight, type Source } from "@/data/etfInsights";
import { withTerms } from "@/components/withTerms";
import { getFillStatuses } from "@/lib/fillStatus";
import { sourceHealth, SHS_WEIGHTS } from "@/lib/sourceHealth";

// 配息觀察頁與各檔詳細頁共用的元件

const CODES = ETF_INSIGHTS.map((e) => e.code);

// ---------- ETF 卡片 ----------

export function EtfCard({ e }: { e: EtfInsight }) {
  const health = sourceHealth(e.composition);
  return (
    <article className="yt-card p-5">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-lg font-semibold">
          {e.code} <span className="font-normal">{e.name}</span>
        </h3>
        <p className="text-xs text-zinc-500">
          <span className="rounded-full border-2 border-zinc-900 bg-[#f5c93b] px-2 py-0.5 font-bold text-zinc-900">{e.kind}</span>
          <span className="ml-2">{e.frequency}</span>
          {e.holders && <span className="ml-2">受益人 {(e.holders.count / 10_000).toFixed(1)} 萬</span>}
        </p>
      </header>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Stat
          label={`最新配息（${e.latest.label}）`}
          value={e.latest.cash === null ? "—" : e.latest.cash === 0 ? "不配息" : `${e.latest.cash} 元`}
          sub={e.latest.exDate ? `${e.latest.exDate} 除息${e.latest.payDate ? `，${e.latest.payDate} 發放` : ""}` : undefined}
        />
        <Stat
          label="收益平準金餘額（每單位）"
          value={e.reserves?.equalizationPerUnit !== undefined ? `${e.reserves.equalizationPerUnit} 元` : "—"}
          sub={
            e.reserves
              ? `${e.reserves.capitalEqualizationPerUnit !== undefined ? `資本損益平準金 ${e.reserves.capitalEqualizationPerUnit} 元，` : ""}${e.reserves.asOf}`
              : undefined
          }
        />
        <div>
          <p className="text-xs text-zinc-500">目前填息狀態</p>
          <Suspense fallback={<p className="mt-1 h-7 w-24 animate-pulse rounded bg-zinc-100" />}>
            <Fill code={e.code} />
          </Suspense>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-medium">
            配息組成
            {e.composition && (
              <span className="ml-2 text-xs font-normal text-zinc-500">
                {e.composition.period}・{e.composition.basis}
              </span>
            )}
          </p>
          <HealthBadge health={health} hasComposition={!!e.composition} />
        </div>
        {e.composition ? (
          <CompositionBar c={e.composition} />
        ) : (
          <p className="mt-2 rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-500">本期未配息，沒有組成可拆解。</p>
        )}
      </div>

      <ul className="mt-4 list-disc space-y-1 pl-5 text-sm leading-relaxed text-zinc-700">
        {e.highlights.map((h) => (
          <li key={h}>{withTerms(h)}</li>
        ))}
      </ul>

      <details className="mt-3 text-xs">
        <summary className="cursor-pointer text-zinc-500 hover:text-zinc-800">資料來源（{e.sources.length}）</summary>
        <ul className="mt-2 space-y-1 pl-1">
          {e.sources.map((s) => (
            <li key={s.url}>
              <SourceLink s={s} />
            </li>
          ))}
        </ul>
      </details>
    </article>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}

export async function Fill({ code }: { code: string }) {
  const s = (await getFillStatuses(CODES)).get(code);
  if (!s) return <p className="mt-1 text-sm text-zinc-500">無除息紀錄或即時價</p>;
  // 貼息時用「還要漲多少才填息」表達；用配息倍數表示會出現 600% 這種難以理解的數字
  const needRise = ((s.prevClose - s.price) / s.price) * 100;
  const label =
    s.state === "filled" ? "已填息" : s.state === "discount" ? `貼息，需漲 ${needRise.toFixed(1)}%` : `填息 ${s.progressPct.toFixed(0)}%`;
  const icon = s.state === "filled" ? "●" : s.state === "discount" ? "■" : "▲";
  const color = s.state === "filled" ? "var(--status-good)" : s.state === "discount" ? "var(--status-critical)" : "var(--status-warning)";
  return (
    <>
      <p className="mt-1 flex items-center gap-1.5 text-lg font-semibold tabular-nums">
        <span aria-hidden style={{ color }} className="text-base">
          {icon}
        </span>
        {label}
      </p>
      <p className="mt-0.5 text-xs text-zinc-500">
        現價 {s.price}，填息目標 {s.prevClose}（除息後 {s.daysSince} 天）
      </p>
    </>
  );
}

// ---------- 配息組成長條 ----------

const SEGMENTS = [
  { key: "dividendIncome", label: "股利所得", color: "var(--src-dividend)", ink: "#ffffff" },
  { key: "capitalGain", label: "已實現資本利得", color: "var(--src-capital)", ink: "#1d1d1b" },
  { key: "equalization", label: "收益平準金", color: "var(--src-equal)", ink: "#1d1d1b" },
  { key: "other", label: "報導未細分", color: "var(--src-other)", ink: "#1d1d1b" },
] as const;

export function CompositionBar({ c }: { c: Composition }) {
  const parts = SEGMENTS.map((s) => ({ ...s, value: c[s.key] ?? 0 })).filter((p) => p.value > 0);
  const aria = parts.map((p) => `${p.label} ${p.value}%`).join("，");
  return (
    <div role="img" aria-label={`配息組成：${aria}`} className="mt-2 flex h-7 gap-0.5" title={aria}>
      {parts.map((p) => (
        <div
          key={p.key}
          className="flex items-center overflow-hidden rounded-lg px-2 text-xs font-bold tabular-nums"
          style={{ width: `${p.value}%`, background: p.color, color: p.ink }}
        >
          {p.value >= 10 && `${Number(p.value.toFixed(1))}%`}
        </div>
      ))}
    </div>
  );
}

export function CompositionLegend() {
  return (
    <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600">
      {SEGMENTS.map((s) => (
        <span key={s.key} className="inline-flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-sm border border-zinc-900" style={{ background: s.color }} />
          {s.label}
        </span>
      ))}
    </p>
  );
}

export function HealthBadge({ health, hasComposition }: { health: ReturnType<typeof sourceHealth>; hasComposition: boolean }) {
  if (!hasComposition) return null;
  if (!health) return <span className="text-xs text-zinc-500">來源健康度：組成未完整揭露，暫不評分</span>;
  const map = {
    good: { icon: "●", text: "健康", color: "var(--status-good)" },
    warn: { icon: "▲", text: "留意", color: "var(--status-warning)" },
    bad: { icon: "■", text: "警示", color: "var(--status-critical)" },
  }[health.level];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border-2 border-zinc-900 bg-white px-2.5 py-0.5 text-xs font-bold"
      title={`SHS = 股利×${SHS_WEIGHTS.dividendIncome} + 資本利得×${SHS_WEIGHTS.capitalGain} + 平準金×${SHS_WEIGHTS.equalization}`}
    >
      <span aria-hidden style={{ color: map.color }}>
        {map.icon}
      </span>
      來源健康度 {health.score} 分・{map.text}（{health.reason}）
    </span>
  );
}

// ---------- 受益人數長條 ----------

export function HolderBars() {
  const max = HOLDER_RANKING.rows[0].count;
  return (
    <ol className="mt-4 space-y-2.5">
      {HOLDER_RANKING.rows.map((r) => (
        <li key={r.code} className="grid grid-cols-[7.5rem_1fr] items-center gap-3 text-sm sm:grid-cols-[11rem_1fr]">
          <span className="truncate">
            <span className="mr-1.5 text-zinc-400 tabular-nums">{r.rank}</span>
            {r.code} <span className="hidden text-zinc-500 sm:inline">{r.name}</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="yt-grow h-4 rounded-r-full" style={{ width: `${(r.count / max) * 80}%`, background: "var(--series-1)" }} />
            <span className="shrink-0 tabular-nums text-zinc-700">{(r.count / 10_000).toFixed(1)} 萬</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export function SourceLink({ s, className = "" }: { s: Source; className?: string }) {
  return (
    <a href={s.url} target="_blank" rel="noopener noreferrer" className={`text-zinc-500 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-900 ${className}`}>
      {s.title}
    </a>
  );
}

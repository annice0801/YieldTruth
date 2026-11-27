import type { Metadata } from "next";
import { Suspense } from "react";
import { Backdrop } from "@/components/Blocks";
import { Bubble, Cat } from "@/components/Mascots";
import { withTerms } from "@/components/withTerms";
import { HOLDER_RANKING, TRENDS } from "@/data/etfInsights";
import { getEtfRows } from "@/lib/etfTable";
import EtfTableView from "./EtfTableView";
import { HolderBars, SourceLink } from "./parts";

export const metadata: Metadata = {
  title: "ETF 配息觀察｜YieldTruth",
  description: "熱門台股 ETF 配息總表：配息頻率、殖利率、平均填息天數、下次除息日，點進去看每一檔的詳細資料",
};

export default function EtfPage() {
  return (
    <div className="relative isolate flex-1">
      <Backdrop />
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-14">
        <header className="yt-dots relative mb-10 overflow-hidden rounded-[40px] bg-[#f3eddc] px-6 py-8 sm:px-10">
          <div aria-hidden className="absolute -bottom-24 -right-10 size-60 rounded-full bg-[#cfe6d8]" />
          <div className="relative flex items-end gap-4">
            <div className="min-w-0 flex-1">
              <p className="inline-block rounded-full border-2 border-zinc-900 bg-white px-3 py-0.5 text-xs font-bold">ETF 配息觀察</p>
              <h1 className="mt-3 text-3xl leading-tight sm:text-5xl">
                台股 ETF
                <span className="bg-[linear-gradient(transparent_60%,#f5c93b_60%)]">配息總表</span>
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600 sm:text-base">
                {withTerms("一張表看完熱門 ETF 的配息頻率、殖利率、平均填息天數和下次除息日。點任一檔，看投資標的、經理費、保管費、配息組成與歷次填息紀錄。")}
              </p>
            </div>
            <div className="hidden w-32 shrink-0 text-center sm:block lg:w-36">
              <Bubble text="拆開來看！" side="right" className="yt-pop mb-2 !text-sm" />
              <Cat mood="green" className="yt-bob w-full" />
            </div>
          </div>
        </header>

        <section aria-labelledby="table">
          <h2 id="table" className="sr-only">
            配息總表
          </h2>
          <Suspense fallback={<div className="h-[520px] animate-pulse rounded-3xl bg-white/70" />}>
            <Table />
          </Suspense>
        </section>

        <section aria-labelledby="trends" className="mt-14">
          <h2 id="trends" className="font-[family-name:var(--font-huninn)] text-2xl">
            本月三個重點
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {TRENDS.map((t, i) => (
              <article key={t.title} className={`yt-card p-5 ${["bg-[#fff1b8]", "bg-[#d9f0e4]", "bg-[#ffe0d6]"][i % 3]}`}>
                <h3 className="font-bold">{t.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-700">{withTerms(t.body)}</p>
                <SourceLink s={t.source} className="mt-3 block text-xs" />
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="ranking" className="mt-14 grid gap-6 lg:grid-cols-[1fr_1.3fr] lg:items-center">
          <div>
            <h2 id="ranking" className="font-[family-name:var(--font-huninn)] text-2xl">
              受益人數排行
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              {HOLDER_RANKING.asOf}，{HOLDER_RANKING.note}。{withTerms("受益人次多代表受歡迎，不代表配息品質好。")}
            </p>
            <p className="mt-2 flex flex-wrap gap-x-3 text-xs">
              {HOLDER_RANKING.sources.map((s) => (
                <SourceLink key={s.url} s={s} />
              ))}
            </p>
          </div>
          <div className="yt-card p-5">
            <HolderBars />
          </div>
        </section>

        <p className="mt-12 text-xs leading-relaxed text-zinc-500">
          本頁僅供資訊揭露與個人參考，不構成投資建議。除息紀錄來自證交所除權除息計算結果表，下次除息日來自除權除息預告表，即時價與淨值來自基本市況報導，基本資料來自證交所 ETF e添富。
        </p>
      </main>
    </div>
  );
}

async function Table() {
  const rows = await getEtfRows();
  return <EtfTableView rows={rows} />;
}

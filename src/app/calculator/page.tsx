import type { Metadata } from "next";
import { Backdrop } from "@/components/Blocks";
import { Bubble, Dog } from "@/components/Mascots";
import TotalReturnCalculator from "./TotalReturnCalculator";

export const metadata: Metadata = {
  title: "含息報酬試算｜YieldTruth",
  description: "用真實歷史股價算出 ETF 含息總報酬與本金侵蝕率",
};

export default function CalculatorPage() {
  return (
    <div className="relative isolate flex-1">
      <Backdrop />
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
      <header className="yt-dots relative mb-8 overflow-hidden rounded-[40px] bg-[#f3eddc] px-6 py-8 sm:px-8">
        <div aria-hidden className="absolute -right-16 -top-20 size-56 rounded-full bg-[#f5c93b]" />
        <div className="relative flex items-end gap-4">
          <div className="min-w-0 flex-1">
            <p className="inline-block rounded-full border-2 border-zinc-900 bg-white px-3 py-0.5 text-xs font-bold">含息報酬試算</p>
            <h1 className="mt-3 text-3xl leading-tight sm:text-4xl">
              高殖利率，
              <br />
              <span className="bg-[linear-gradient(transparent_60%,#f5c93b_60%)]">實際賺多少？</span>
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600 sm:text-base">
              「年化殖利率 15%」只算了配息，沒算股價。除息後股價沒漲回來，領到的配息其實是自己的本金。輸入代號，用真實歷史股價算算看。
            </p>
          </div>
          <div className="hidden w-36 shrink-0 text-center sm:block">
            <Bubble text="15% 是真的嗎？" className="yt-pop mb-2 !px-3 !text-sm" />
            <Dog mood="yellow" className="yt-bob w-full" />
          </div>
        </div>
      </header>

      <TotalReturnCalculator />

      <aside className="mt-14 space-y-6 border-t-2 border-dashed border-zinc-300 pt-8 text-sm">
        <section>
          <h2 className="text-base font-semibold">計算方式與假設</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-zinc-600">
            <li>以買入日（遇假日順延）的收盤價買進可負擔的最大股數（含零股），期末以收盤價全部賣出。</li>
            <li>只有除息日在買入日之後的配息才領得到。</li>
            <li>標題殖利率＝買入當時最近一次配息 × 一年配息次數 ÷ 買入價。</li>
            <li>本金侵蝕率＝價差虧損 ÷ 配息收入。超過 100% 代表配息全被股價下跌抵銷。</li>
            <li>手續費 0.1425%（可選折數，最低 1 元）、ETF 證交稅 0.1%、單筆股利 2 萬元以上扣 2.11% 二代健保。未計股利所得稅。</li>
            <li>試算終點為今天且資料庫尚無今日收盤價時，以即時成交價計算期末市值。</li>
            <li>年化報酬用 XIRR，配息以除息日入帳近似（實際發放約晚 3–4 週）。配息不再投入。</li>
            <li>股價未經分割調整，遇到股票分割（例如 0050 於 2025 年分割）的期間結果會失真。</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold">資料來源</h2>
          <p className="mt-1 text-zinc-600">
            臺灣證券交易所：個股日成交資訊（STOCK_DAY）、除權除息計算結果表（TWT49U）、基本市況報導即時成交價。歷史資料存於資料庫並增量更新，盤中以即時價作為期末價。目前只支援上市證券。本工具僅供資訊揭露與個人參考，不構成投資建議。
          </p>
        </section>
      </aside>
    </main>
    </div>
  );
}

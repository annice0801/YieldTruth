import Link from "next/link";
import { Cat, Dog } from "@/components/Mascots";
import { Logo, NAV_LINKS } from "@/components/site";

/** 頁尾：芥末黃半圓、標誌、分頁連結、資料來源與免責 */
export default function SiteFooter() {
  return (
    <footer className="relative mt-20 overflow-hidden bg-[#f3eddc]">
      <div aria-hidden className="yt-dots absolute inset-0" />
      <div aria-hidden className="absolute left-1/2 top-16 h-[900px] w-[900px] -translate-x-1/2 rounded-full bg-[#f5c93b] sm:w-[1400px]" />

      <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-12">
        <div className="mx-auto flex max-w-md items-end justify-center gap-2">
          <Dog mood="green" className="yt-bob w-24 sm:w-28" />
          <div className="mb-10 rounded-[999px] border-[3px] border-zinc-900 bg-white px-4 py-2 text-center font-[family-name:var(--font-huninn)] text-sm shadow-[3px_3px_0_#1d1d1b]">
            下單前，先體檢！
          </div>
          <Cat mood="green" className="yt-bob w-24 [animation-delay:-1.4s] sm:w-28" />
        </div>

        <div className="mt-10 flex flex-col items-center text-center">
          <Link href="/" className="text-3xl">
            <Logo />
          </Link>
          <p className="mt-2 text-sm">高殖利率，實際賺多少？把配息的真相攤開來看。</p>
          <nav aria-label="頁尾分頁" className="mt-6 flex flex-wrap justify-center gap-2">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="rounded-full border-2 border-zinc-900 bg-white px-4 py-1.5 text-sm font-bold transition hover:-translate-y-0.5 hover:shadow-[2px_2px_0_#1d1d1b]">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mx-auto mt-10 max-w-3xl space-y-2 text-center text-xs leading-relaxed text-zinc-800">
          <p>資料來源：臺灣證券交易所（個股日成交資訊、除權除息計算結果表、三大法人買賣超、基本市況報導）、各投信與媒體公開報導。</p>
          <p>本網站為個人使用之資訊揭露工具，所有內容不構成投資建議；投資前請自行評估風險。</p>
          <p className="pt-2 font-bold">© {2026} YieldTruth</p>
        </div>
      </div>
    </footer>
  );
}

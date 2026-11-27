import Link from "next/link";
import { SideBlock } from "@/components/Blocks";
import { Bubble, Cat, Dog, Rabbit, Turtle } from "@/components/Mascots";
import { Parallax } from "@/components/Parallax";
import UpgradeCompare from "@/components/UpgradeCompare";

// 首頁：介紹 YieldTruth 的功能。範例數字為 2026-11-26 收盤、投入 10 萬元的真實試算（見 docs/product-rules.md）。

const WORRIES = [
  "看到「年化殖利率 15%」就心動",
  "領了配息，卻不知道股價跌了多少",
  "搞不懂收益平準金、資本利得差在哪",
  "不知道什麼時候下單才不會買在高點",
  "不確定自己適合哪一種 ETF",
];

const FEATURES = [
  {
    href: "/check",
    tag: "3 秒看懂",
    title: "下單前體檢",
    desc: "一顆紅黃綠燈＋一句白話原因。把翻投信官網、看籌碼、算折溢價、查填息，濃縮成下單前的最後一眼。",
    points: ["折溢價、配息來源、填息、法人四項體檢", "拖曳滑桿，看貼息時配息有多少是本金"],
    Animal: Dog,
    bg: "bg-[#fff1b8]",
  },
  {
    href: "/calculator",
    tag: "算真的",
    title: "含息報酬試算",
    desc: "用證交所真實歷史股價，算出配息、價差、手續費、證交稅與二代健保之後，你實際賺了多少。",
    points: ["標題殖利率 vs 實際年化報酬", "本金侵蝕率：配息有幾成是自己的錢"],
    Animal: Turtle,
    bg: "bg-[#d9f0e4]",
  },
  {
    href: "/etf",
    tag: "拆開看",
    title: "ETF 配息觀察",
    desc: "整理熱門 ETF 的公開配息組成，看清楚錢是來自股利、資本利得，還是收益平準金。",
    points: ["配息來源健康度評分", "受益人數排行與本月重點"],
    Animal: Cat,
    bg: "bg-[#dbe8f7]",
  },
  {
    href: "/quiz",
    tag: "1 分鐘",
    title: "命定 ETF 測驗",
    desc: "不考專有名詞，只問生活：跌了睡不睡得著、錢什麼時候要用。配對最適合你的 ETF 類型。",
    points: ["4 種動物角色配對", "附一張專屬地雷卡"],
    Animal: Rabbit,
    bg: "bg-[#ffe0d6]",
  },
];

const PROOFS = [
  { value: "−19.2%", label: "00929 今年 7 月買進：標題殖利率 10.1%，實際含息報酬卻是負的", tone: "bg-[#ffe0d6]" },
  { value: "652%", label: "00400A 本金侵蝕率：股價跌掉的錢是領到配息的 6.5 倍", tone: "bg-[#fff1b8]" },
  { value: "92%", label: "00878 第 4 季 1.25 元配息中，來自已實現資本利得的比例", tone: "bg-[#d9f0e4]" },
];

const STEPS = [
  { n: 1, title: "點一檔", desc: "首頁就有本週熱議 ETF，不用想要查什麼。" },
  { n: 2, title: "看燈號", desc: "第一眼只給燈號和一句話，3 秒看懂風險。" },
  { n: 3, title: "看證據", desc: "想深入再展開配息來源、填息紀錄和試算。" },
];

export default function Landing() {
  return (
    <main className="flex-1 overflow-x-hidden">
      {/* ---------- Hero ---------- */}
      <section className="relative">
        <div aria-hidden className="yt-dots absolute inset-0" />
        <Parallax aria-hidden speed={0.35} max={180} className="absolute -right-28 -top-28 size-64 rounded-full bg-[#f5c93b] md:-right-32 md:-top-40 md:size-[440px] lg:size-[520px]" />
        <Parallax aria-hidden speed={0.2} max={120} className="absolute -left-16 top-[60%] size-40 rounded-full bg-[#cfe6d8] opacity-80 md:size-56" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-12 md:pb-24 md:pt-20 lg:grid-cols-[1.1fr_1fr]">
          <Parallax speed={0.06} max={40} className="text-center lg:text-left">
            <p className="inline-block rounded-full border-2 border-zinc-900 bg-white px-3 py-1 text-xs font-bold">ETF 配息真相工具</p>
            <h1 className="mt-5 text-5xl leading-[1.15] sm:text-6xl">
              配息很香，
              <br />
              <span className="bg-[linear-gradient(transparent_62%,#f5c93b_62%)]">本金</span>還在嗎？
            </h1>
            <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-zinc-700 sm:text-lg lg:mx-0">
              「年化殖利率 15%」只算了配息，沒算股價。YieldTruth 用證交所真實資料，幫你在下單前看清楚：這筆配息是賺來的，還是自己的本金。
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
              <Link href="/check" className="yt-btn px-7 py-3 text-lg">
                3 秒體檢一檔 ETF →
              </Link>
              <Link href="/quiz" className="yt-chip px-5 py-3 text-base">
                測我的命定 ETF
              </Link>
            </div>
          </Parallax>

          {/* 角色＋浮動貼紙：各自不同速度，做出前後景深 */}
          <div className="relative mx-auto h-[440px] w-full max-w-[460px] sm:h-[420px]">
            <Parallax speed={-0.18} max={70} className="absolute left-0 top-4 z-10 w-[52%]">
            <div className="rotate-[-4deg] rounded-3xl border border-[#e8e1cc] bg-white p-3 shadow-[0_10px_28px_-14px_rgba(29,29,27,0.35)]">
              <p className="flex items-center gap-1.5 text-xs font-bold">
                <span className="flex size-5 items-center justify-center rounded-full border-2 border-zinc-900 bg-[#d99a00] text-[9px] text-white">▲</span>
                00878 黃燈
              </p>
              <p className="mt-1 text-[13px] font-bold leading-snug">資本利得占比 92%</p>
            </div>
            </Parallax>
            <Parallax speed={-0.3} max={90} className="absolute right-0 top-20 z-10 w-[50%]">
            <div className="rotate-[3deg] rounded-3xl bg-white p-3 shadow-[0_10px_28px_-14px_rgba(29,29,27,0.35)]">
              <p className="text-xs font-bold">本金侵蝕率</p>
              <p className="font-[family-name:var(--font-huninn)] text-3xl">406%</p>
              <p className="text-[11px] text-zinc-700">配息全是自己的錢</p>
            </div>
            </Parallax>
            <Parallax speed={-0.06} max={40} className="absolute bottom-0 left-[4%] w-[34%]">
              <Bubble text="15% 是真的嗎？" className="yt-pop mb-2 whitespace-nowrap !px-3 !text-sm" />
              <Dog mood="yellow" className="yt-bob w-full" />
            </Parallax>
            <Parallax speed={-0.1} max={50} className="absolute bottom-0 right-[4%] w-[34%] text-right">
              <Bubble text="先看清楚！" side="right" className="yt-pop mb-2 whitespace-nowrap !px-3 !text-sm" />
              <Cat mood="green" className="yt-bob w-full [animation-delay:-1.3s]" />
            </Parallax>
          </div>
        </div>
      </section>

      {/* ---------- 煩惱清單 ---------- */}
      <section className="relative isolate py-6">
        <SideBlock side="left" tone="sage" className="inset-y-0 w-[94%] md:w-[72%]" />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-[1fr_1.2fr]">
          <div className="yt-reveal text-center md:text-left">
            <p className="text-sm font-bold text-zinc-500">你也有這些煩惱嗎？</p>
            <h2 className="mt-2 font-[family-name:var(--font-huninn)] text-3xl leading-snug sm:text-4xl">
              配息入帳很開心，
              <br />
              <span className="bg-[linear-gradient(transparent_62%,#cfe6d8_62%)]">但心裡總是不踏實。</span>
            </h2>
            <Parallax speed={-0.12} max={50} className="mx-auto mt-6 w-32 md:mx-0">
              <Turtle mood="yellow" className="yt-bob w-full" />
            </Parallax>
          </div>
          <ul className="space-y-3">
            {WORRIES.map((w, i) => (
              <li key={w} className="yt-reveal flex items-center gap-3 rounded-full bg-white px-4 py-3 font-bold shadow-[0_6px_18px_-12px_rgba(29,29,27,0.35)]" style={{ animationDelay: `${i * 60}ms` }}>
                <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-zinc-900 bg-[#f5c93b] text-sm">
                  ✓
                </span>
                {w}
              </li>
            ))}
            <li className="yt-reveal pt-2 text-center text-sm font-bold md:text-left">
              ↓ YieldTruth 幫你把真相攤開來看
            </li>
          </ul>
        </div>
      </section>

      {/* ---------- 功能（黃色拱門） ---------- */}
      <section className="relative pt-20">
        <div aria-hidden className="absolute inset-x-0 bottom-0 top-20 mx-auto max-w-6xl rounded-t-[999px] bg-[#f5c93b]" />
        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:pt-28">
          <div className="text-center">
            <p className="inline-block rounded-full border-2 border-zinc-900 bg-white px-3 py-1 text-xs font-bold">4 個功能</p>
            <h2 className="mt-3 font-[family-name:var(--font-huninn)] text-3xl leading-snug sm:text-5xl">
              從心動，
              <br className="sm:hidden" />
              到看懂再下單
            </h2>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {FEATURES.map((f, i) => (
              <Link
                key={f.href}
                href={f.href}
                className={`yt-card yt-reveal group flex flex-col p-6 transition hover:-translate-y-1 hover:shadow-[6px_6px_0_#1d1d1b] ${f.bg}`}
                style={{ animationDelay: `${(i % 2) * 80}ms` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="rounded-full border-2 border-zinc-900 bg-white px-2.5 py-0.5 text-xs font-bold">{f.tag}</span>
                    <h3 className="mt-3 font-[family-name:var(--font-huninn)] text-2xl">{f.title}</h3>
                  </div>
                  <f.Animal mood="green" className="w-20 shrink-0 transition group-hover:-rotate-6" />
                </div>
                <p className="mt-3 text-sm leading-relaxed text-zinc-800">{f.desc}</p>
                <ul className="mt-4 flex-1 space-y-1.5 text-sm">
                  {f.points.map((p) => (
                    <li key={p} className="flex gap-2">
                      <span aria-hidden className="font-bold">●</span>
                      {p}
                    </li>
                  ))}
                </ul>
                <span className="mt-5 inline-flex w-fit items-center gap-1 rounded-full border-2 border-zinc-900 bg-white px-4 py-1.5 text-sm font-bold group-hover:bg-zinc-900 group-hover:text-white">
                  去看看 →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- 真實數字 ---------- */}
      <section className="relative isolate py-6">
        <SideBlock side="right" tone="sky" dots className="inset-y-0 w-[94%] md:w-[80%]" />
        <div className="relative mx-auto max-w-6xl px-4 py-16">
          <div className="text-center">
            <p className="text-sm font-bold text-zinc-500">不是嚇你，是真實數字</p>
            <h2 className="mt-2 font-[family-name:var(--font-huninn)] text-3xl sm:text-4xl">標題殖利率背後的事</h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {PROOFS.map((p, i) => (
              <div key={p.label} className={`yt-card yt-reveal p-6 text-center ${p.tone}`} style={{ animationDelay: `${i * 90}ms` }}>
                <p className="font-[family-name:var(--font-huninn)] text-4xl leading-tight sm:text-[2.6rem]">{p.value}</p>
                <p className="mt-3 text-sm leading-relaxed text-zinc-800">{p.label}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-center text-xs text-zinc-500">2026-11-26 收盤、投入 10 萬元，含手續費、證交稅與二代健保；配息組成依公開報導。</p>
        </div>
      </section>

      {/* ---------- 三步驟 ---------- */}
      <section className="relative isolate mt-10 py-6">
        <SideBlock side="left" tone="peach" className="inset-y-0 w-[94%] md:w-[70%]" />
        <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="text-center">
          <p className="text-sm font-bold text-zinc-500">怎麼用？</p>
          <h2 className="mt-2 font-[family-name:var(--font-huninn)] text-3xl sm:text-4xl">三步驟，下單前看清楚</h2>
        </div>
        <ol className="relative mt-12 grid gap-8 md:grid-cols-3">
          <div aria-hidden className="absolute left-[16%] right-[16%] top-12 hidden border-t-[3px] border-dashed border-[#e5a58f] md:block" />
          {STEPS.map((s) => (
            <li key={s.n} className="yt-reveal relative text-center">
              <span className="mx-auto flex size-24 items-center justify-center rounded-full bg-white font-[family-name:var(--font-huninn)] text-5xl shadow-[0_10px_28px_-14px_rgba(29,29,27,0.35)]">
                {s.n}
              </span>
              <h3 className="mt-5 text-xl font-bold">{s.title}</h3>
              <p className="mx-auto mt-2 max-w-60 text-sm leading-relaxed text-zinc-600">{s.desc}</p>
            </li>
          ))}
        </ol>
        </div>
      </section>

      {/* ---------- 方案 ---------- */}
      <section className="relative isolate mt-10 py-6">
        <SideBlock side="right" tone="mint" className="inset-y-0 w-[94%] md:w-[78%]" />
        <div className="yt-reveal mx-auto max-w-6xl px-6 py-12 sm:px-12">
          <div className="text-center">
            <p className="text-sm font-bold text-zinc-700">方案</p>
            <h2 className="mt-2 font-[family-name:var(--font-huninn)] text-3xl sm:text-4xl">風險警示，永遠免費</h2>
          </div>
          <div className="mx-auto mt-8 grid max-w-3xl gap-4 sm:grid-cols-2">
            <Plan name="免費" price="NT$0" items={["紅黃綠燈與一句話原因", "四項體檢摘要", "一年前買進的含息試算", "命定 ETF 測驗"]} />
            <Plan
              name="Pro"
              price="NT$149"
              per="/ 月"
              highlight
              items={["配息來源圓餅圖與評分規則", "近 8 次逐筆填息天數", "到價、溢價收斂提醒（測試中）"]}
              cta={<UpgradeCompare className="mt-5 w-full" />}
            />
          </div>
          <p className="mt-5 text-center text-xs text-zinc-700">目前為個人使用版，所有功能直接開放，不會收費；Pro 定價為規劃示範。</p>
        </div>
      </section>

      {/* ---------- 最後行動 ---------- */}
      <section className="mx-auto max-w-6xl px-4 pt-16 text-center">
        <Parallax speed={-0.1} max={40} className="flex items-end justify-center gap-3">
          <Turtle mood="green" className="yt-bob w-20 sm:w-24" />
          <Rabbit mood="green" className="yt-bob w-20 [animation-delay:-0.8s] sm:w-24" />
        </Parallax>
        <h2 className="mt-4 font-[family-name:var(--font-huninn)] text-3xl sm:text-4xl">下單前，先問問阿柴</h2>
        <p className="mt-3 text-zinc-600">點一檔，3 秒知道該不該再想想。</p>
        <Link href="/check" className="yt-btn mt-7 inline-block px-8 py-3 text-lg">
          開始免費體檢 →
        </Link>
      </section>
    </main>
  );
}

function Plan({ name, price, per, items, highlight, cta }: { name: string; price: string; per?: string; items: string[]; highlight?: boolean; cta?: React.ReactNode }) {
  return (
    <div className={`flex flex-col rounded-[32px] p-6 shadow-[0_10px_28px_-14px_rgba(29,29,27,0.35)] ${highlight ? "bg-[#f5c93b]" : "bg-white"}`}>
      <div className="flex items-baseline justify-between">
        <p className="text-lg font-bold">{name}</p>
        <p>
          <span className="font-[family-name:var(--font-huninn)] text-3xl">{price}</span>
          {per && <span className="text-sm"> {per}</span>}
        </p>
      </div>
      <ul className="mt-4 flex-1 space-y-2 text-sm">
        {items.map((it) => (
          <li key={it} className="flex gap-2">
            <span aria-hidden className="flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-zinc-900 bg-white text-[10px]">
              ✓
            </span>
            {it}
          </li>
        ))}
      </ul>
      {cta}
    </div>
  );
}

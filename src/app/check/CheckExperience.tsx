"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import type { CheckCard, Level } from "@/lib/checkCard";
import GrowthChart, { type History } from "./GrowthChart";
import { Bubble, Cat, Dog, LINES } from "@/components/Mascots";
import TrafficLightGuide from "@/components/TrafficLightGuide";

export const HOT_CODES = [
  { code: "00878", name: "國泰永續高股息", tag: "1.25 元創新高" },
  { code: "00929", name: "復華台灣科技優息", tag: "月配 0.38 元" },
  { code: "00400A", name: "主動國泰動能高息", tag: "12 月預估減半" },
  { code: "00403A", name: "主動統一升級50", tag: "首配 0 元" },
  { code: "0056", name: "元大高股息", tag: "受益人第 2 名" },
];
const AMOUNTS = [50_000, 100_000, 300_000];

const INK = "#1d1d1b";
const LIGHT = {
  green: { label: "綠燈", icon: "●", color: "#2f8f6c", soft: "#d9f0e4" },
  yellow: { label: "黃燈", icon: "▲", color: "#d99a00", soft: "#fff1b8" },
  red: { label: "紅燈", icon: "■", color: "#e5603f", soft: "#ffe0d6" },
  unknown: { label: "無資料", icon: "○", color: "#9a9384", soft: "#f3efe4" },
} as const;

type Entry = { status: "loading" } | { status: "ok"; card: CheckCard } | { status: "error"; error: string };
type HistEntry = { status: "loading" } | { status: "ok"; h: History } | { status: "error"; error: string };

const PRO_KEY = "yt-pro-demo";
// 試算期間：預設 1 年，可切換或自訂買進日期
const PERIODS = [
  { key: "3m", label: "3 個月", months: 3 },
  { key: "6m", label: "6 個月", months: 6 },
  { key: "1y", label: "1 年", months: 12 },
  { key: "3y", label: "3 年", months: 36 },
] as const;
type PeriodKey = (typeof PERIODS)[number]["key"] | "custom";

function monthsAgo(m: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - m);
  return d.toLocaleDateString("sv-SE");
}
const DEFAULT_BUY = () => monthsAgo(12);

export default function CheckExperience() {
  const [cards, setCards] = useState<Record<string, Entry>>({});
  const [hists, setHists] = useState<Record<string, HistEntry>>({});
  const [selected, setSelected] = useState(HOT_CODES[0].code);
  const [amount, setAmount] = useState(100_000);
  const [period, setPeriod] = useState<PeriodKey>("1y");
  const [customDate, setCustomDate] = useState("");
  const [pro, setPro] = useState(false);
  const [paywall, setPaywall] = useState<string | null>(null);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 從瀏覽器儲存讀回示範模式
      setPro(localStorage.getItem(PRO_KEY) === "1");
    } catch {
      // 維持免費版
    }
  }, []);

  const loadCard = useCallback((code: string) => {
    setCards((p) => (p[code]?.status === "ok" ? p : { ...p, [code]: { status: "loading" } }));
    fetch(`/api/check?code=${encodeURIComponent(code)}`)
      .then(async (r) => {
        const d = await r.json();
        setCards((p) => ({ ...p, [code]: r.ok ? { status: "ok", card: d } : { status: "error", error: d.error ?? "體檢失敗" } }));
      })
      .catch(() => setCards((p) => ({ ...p, [code]: { status: "error", error: "連線失敗" } })));
  }, []);

  const loadHist = useCallback((code: string, amt: number, buyDate: string = DEFAULT_BUY()) => {
    const key = `${code}:${amt}:${buyDate}`;
    setHists((p) => (p[key]?.status === "ok" ? p : { ...p, [key]: { status: "loading" } }));
    fetch(`/api/total-return?code=${encodeURIComponent(code)}&buyDate=${buyDate}&amount=${amt}`)
      .then(async (r) => {
        const d = await r.json();
        setHists((p) => ({ ...p, [key]: r.ok ? { status: "ok", h: d } : { status: "error", error: d.error ?? "試算失敗" } }));
      })
      .catch(() => setHists((p) => ({ ...p, [key]: { status: "error", error: "連線失敗" } })));
  }, []);

  // 從其他頁帶代號進來（例如 /check?code=0050）時，直接選取那一檔
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code")?.trim().toUpperCase();
    if (!code || !/^[0-9A-Z]{4,6}$/.test(code)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 讀取網址參數只能在瀏覽器端進行
    setSelected(code);
    loadCard(code);
    loadHist(code, 100_000);
  }, [loadCard, loadHist]);

  // 進站就預先載入熱議清單，點選時立即顯示
  useEffect(() => {
    HOT_CODES.forEach((h) => {
      loadCard(h.code);
      loadHist(h.code, 100_000);
    });
  }, [loadCard, loadHist]);

  // 目前選定期間對應的買進日（自訂日期尚未填時沿用 1 年）
  const buyDate = period === "custom" ? customDate || DEFAULT_BUY() : monthsAgo(PERIODS.find((p) => p.key === period)!.months);

  function ensureHist(code: string, amt: number, date: string) {
    if (!hists[`${code}:${amt}:${date}`]) loadHist(code, amt, date);
  }
  function select(code: string) {
    setSelected(code);
    if (!cards[code] || cards[code].status === "error") loadCard(code);
    ensureHist(code, amount, buyDate);
  }
  function changeAmount(a: number) {
    setAmount(a);
    ensureHist(selected, a, buyDate);
  }
  function changePeriod(p: PeriodKey, date?: string) {
    setPeriod(p);
    if (date !== undefined) setCustomDate(date);
    const d = p === "custom" ? date || customDate || DEFAULT_BUY() : monthsAgo(PERIODS.find((x) => x.key === p)!.months);
    ensureHist(selected, amount, d);
  }
  function setProMode(on: boolean) {
    setPro(on);
    setPaywall(null);
    try {
      localStorage.setItem(PRO_KEY, on ? "1" : "0");
    } catch {
      // 忽略
    }
  }

  const entry = cards[selected];
  const hist = hists[`${selected}:${amount}:${buyDate}`];
  const mood = entry?.status === "ok" ? entry.card.light : "yellow";

  return (
    <div className="grid gap-8 lg:grid-cols-[15rem_1fr] lg:gap-10">
      {/* 左側：標題＋熱議清單 */}
      <div className="min-w-0">
        <p className="inline-block rounded-full border-2 border-[#1d1d1b] bg-white px-3 py-0.5 text-xs font-bold">下單前 3 秒</p>
        <h1 className="mt-3 font-[family-name:var(--font-huninn)] text-4xl leading-tight">
          先體檢，
          <br />
          <span className="bg-[linear-gradient(transparent_60%,#f5c93b_60%)]">再下單</span>
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[#5b5546]">點一檔，手機畫面立刻告訴你：燈號、原因，還有過去買進的話（期間可自己調），每期領到多少、本金變多少。</p>

        <p className="mt-6 text-xs font-bold text-[#5b5546]">本週熱議</p>
        <ul className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
          {[...HOT_CODES, ...(HOT_CODES.some((h) => h.code === selected) ? [] : [{ code: selected, name: "", tag: "你查詢的" }])].map((h) => {
            const c = cards[h.code];
            const light: Level = c?.status === "ok" ? c.card.light : "unknown";
            const active = selected === h.code;
            return (
              <li key={h.code} className="shrink-0">
                <button
                  onClick={() => select(h.code)}
                  aria-pressed={active}
                  className={`flex w-full items-center gap-3 rounded-full border-2 border-[#1d1d1b] py-2 pl-2 pr-4 text-left transition ${
                    active ? "-translate-y-0.5 bg-[#f5c93b] shadow-[3px_3px_0_#1d1d1b]" : "bg-white hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#1d1d1b]"
                  }`}
                >
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-[#1d1d1b] text-xs text-white ${c?.status === "loading" ? "animate-pulse" : ""}`}
                    style={{ background: LIGHT[light].color }}
                    aria-label={LIGHT[light].label}
                  >
                    {LIGHT[light].icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold">{h.code}</span>
                    <span className="block truncate text-[11px] text-[#5b5546]">{h.tag}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <CustomCode onSubmit={select} />
        <ProToggle pro={pro} onChange={setProMode} />
      </div>

      {/* 右側：舞台 */}
      <Stage mood={mood}>
        <Phone>
          {!entry || entry.status === "loading" ? (
            <PhoneSkeleton />
          ) : entry.status === "error" ? (
            <p className="m-4 rounded-2xl border-2 border-[#1d1d1b] bg-[#ffe0d6] p-4 text-sm">{entry.error}</p>
          ) : (
            <AppScreen
              key={entry.card.code}
              card={entry.card}
              hist={hist}
              amount={amount}
              onAmount={changeAmount}
              period={period}
              customDate={customDate}
              buyDate={buyDate}
              onPeriod={changePeriod}
              pro={pro}
              onLocked={setPaywall}
            />
          )}
          {paywall && <Paywall feature={paywall} onUnlock={() => setProMode(true)} onClose={() => setPaywall(null)} />}
        </Phone>
      </Stage>

      {/* 燈號說明：亮起目前這檔的燈 */}
      <section className="lg:col-span-2" aria-labelledby="light-guide">
        <h2 id="light-guide" className="text-center font-[family-name:var(--font-huninn)] text-2xl sm:text-3xl">
          {entry?.status === "ok" ? `${entry.card.code} 現在是${LIGHT[entry.card.light].label}` : "燈號怎麼看？"}
        </h2>
        <div className="mt-6">
          <TrafficLightGuide active={entry?.status === "ok" ? entry.card.light : undefined} mode={entry?.status === "ok" ? "fixed" : "cycle"} compact />
        </div>
      </section>
    </div>
  );
}

// ---------- 舞台：黃色色塊、點點、角色 ----------

function Stage({ mood, children }: { mood: Exclude<Level, "unknown">; children: React.ReactNode }) {
  const lines = LINES[mood];
  return (
    <div className="relative isolate flex min-w-0 justify-center overflow-hidden rounded-[48px] bg-[#f3eddc] px-2 pb-6 pt-48 sm:px-6 sm:pt-56 lg:pt-16">
      {/* 背景 */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(#d8cfb4_1.6px,transparent_1.7px)] [background-size:22px_22px]" />
      <div aria-hidden className="absolute -right-24 -top-24 -z-10 size-80 rounded-full bg-[#f5c93b]" />
      <div aria-hidden className="absolute -bottom-32 -left-28 -z-10 size-96 rounded-full bg-[#cfe6d8]" />

      {/* 角色 */}
      <div className="pointer-events-none absolute left-1 top-3 w-24 sm:left-4 sm:w-32 lg:bottom-6 lg:left-2 lg:top-auto lg:w-44">
        <Bubble key={`d-${mood}`} text={lines.dog} className="yt-pop mb-2 ml-2 lg:mb-3" />
        <Dog mood={mood} className="yt-bob w-full" />
      </div>
      <div className="pointer-events-none absolute right-1 top-3 w-24 text-right sm:right-4 sm:w-32 lg:bottom-6 lg:right-2 lg:top-auto lg:w-44">
        <Bubble key={`c-${mood}`} text={lines.cat} side="right" className="yt-pop mb-2 mr-2 lg:mb-3" />
        <Cat mood={mood} className="yt-bob w-full [animation-delay:-1.2s]" />
      </div>

      {children}
    </div>
  );
}

function Phone({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-10 w-full max-w-[340px] rounded-[46px] border-[10px] border-[#1d1d1b] bg-[#1d1d1b] shadow-[8px_10px_0_rgba(29,29,27,0.18)]">
      <div className="relative h-[660px] overflow-hidden rounded-[36px] bg-[#fbf7ec]">
        <div aria-hidden className="absolute left-1/2 top-2 z-20 h-6 w-24 -translate-x-1/2 rounded-full bg-[#1d1d1b]" />
        <div className="yt-scroll h-full overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

// ---------- 手機裡的 App ----------

function AppScreen({
  card,
  hist,
  amount,
  onAmount,
  period,
  customDate,
  buyDate,
  onPeriod,
  pro,
  onLocked,
}: {
  card: CheckCard;
  hist: HistEntry | undefined;
  amount: number;
  onAmount: (a: number) => void;
  period: PeriodKey;
  customDate: string;
  buyDate: string;
  onPeriod: (p: PeriodKey, date?: string) => void;
  pro: boolean;
  onLocked: (f: string) => void;
}) {
  const l = LIGHT[card.light];
  const quarterly = useMemo(() => {
    if (hist?.status !== "ok") return true;
    const d = hist.h.dividends;
    if (d.length < 2) return false;
    const gap = (Date.parse(d[d.length - 1].exDate) - Date.parse(d[0].exDate)) / 86_400_000 / (d.length - 1);
    return gap > 45;
  }, [hist]);

  return (
    <div className="px-4 pb-6 pt-11 text-[#1d1d1b]">
      <div className="flex items-center justify-between">
        <p className="font-[family-name:var(--font-huninn)] text-lg">YieldTruth</p>
        <span className="rounded-full border-2 border-[#1d1d1b] bg-white px-2 py-0.5 text-[10px] font-bold">{pro ? "Pro" : "免費版"}</span>
      </div>

      {/* 第一層：燈號＋一句話 */}
      <div className="yt-rise mt-3 rounded-3xl border border-[#e8e1cc] p-4 shadow-[0_10px_28px_-14px_rgba(29,29,27,0.28)]" style={{ background: l.soft }}>
        <div className="flex items-center gap-2">
          <span
            className="flex size-9 items-center justify-center rounded-full border-[3px] border-[#1d1d1b] text-sm text-white"
            style={{ background: l.color }}
            aria-hidden
          >
            {l.icon}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold">
              {card.code} <span className="font-normal">{card.name}</span>
            </p>
            {card.price && <p className="text-[11px] text-[#5b5546]">現價 {card.price.value}・{card.price.at.slice(5, 16)}</p>}
          </div>
        </div>
        <p className="mt-3 text-[17px] font-bold leading-snug">{card.headline}</p>
      </div>

      {/* 某段時間前買進的話（期間可調） */}
      <section className="mt-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">
            {period === "custom" ? `${buyDate.replaceAll("-", "/")} 買進的話` : `${PERIODS.find((x) => x.key === period)!.label}前買進的話`}
          </p>
          <div className="flex gap-1">
            {AMOUNTS.map((a) => (
              <button
                key={a}
                onClick={() => onAmount(a)}
                className={`rounded-full border-2 border-[#1d1d1b] px-2 py-0.5 text-[11px] font-bold ${a === amount ? "bg-[#1d1d1b] text-white" : "bg-white"}`}
              >
                {a / 10_000}萬
              </button>
            ))}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1" role="group" aria-label="試算期間">
          {PERIODS.map((x) => (
            <button
              key={x.key}
              onClick={() => onPeriod(x.key)}
              aria-pressed={period === x.key}
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${period === x.key ? "bg-[#f5c93b] shadow-[0_0_0_2px_#1d1d1b]" : "bg-[#f3eddc]"}`}
            >
              {x.label}
            </button>
          ))}
          <button
            onClick={() => onPeriod("custom", customDate || buyDate)}
            aria-pressed={period === "custom"}
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${period === "custom" ? "bg-[#f5c93b] shadow-[0_0_0_2px_#1d1d1b]" : "bg-[#f3eddc]"}`}
          >
            自訂
          </button>
        </div>
        {period === "custom" && (
          <label className="mt-2 flex items-center gap-2 text-[11px]">
            <span className="text-[#5b5546]">買進日期</span>
            <input
              type="date"
              value={customDate}
              min={monthsAgo(119)}
              max={monthsAgo(1)}
              onChange={(e) => e.target.value && onPeriod("custom", e.target.value)}
              className="rounded-full border-2 border-[#d8cfb4] bg-white px-2 py-0.5 text-[12px]"
            />
          </label>
        )}
        <div className="mt-2 rounded-3xl border border-[#e8e1cc] bg-white p-3">
          {!hist || hist.status === "loading" ? (
            <div className="h-60 animate-pulse rounded-2xl bg-[#f3eddc]" />
          ) : hist.status === "error" ? (
            <p className="p-2 text-xs text-[#5b5546]">{hist.error}</p>
          ) : (
            <>
              <GrowthChart h={hist.h} quarterly={quarterly} animKey={`${card.code}-${amount}-${buyDate}`} />
              <p className="mt-2 text-[10px] text-[#7a7466]">
                {hist.h.buy.date} 以 {hist.h.buy.price} 元買進 {hist.h.buy.shares.toLocaleString()} 股，含手續費、證交稅與二代健保。
              </p>
            </>
          )}
        </div>
      </section>

      {/* 第二層：四項體檢（免費） */}
      <Checks card={card} />

      {/* 滑桿：現在買進、除息後會怎樣 */}
      <Simulator card={card} />

      {/* 第三層：證據與解法（Pro） */}
      <Evidence card={card} pro={pro} onLocked={onLocked} />

      <p className="mt-5 text-center text-[10px] text-[#7a7466]">資訊揭露，不構成投資建議</p>
    </div>
  );
}

function Checks({ card }: { card: CheckCard }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <section className="mt-5">
      <p className="text-sm font-bold">為什麼是這個燈？</p>
      <ul className="mt-2 space-y-1.5">
        {card.checks.map((c) => (
          <li key={c.key} className="rounded-2xl border border-[#e8e1cc] bg-white">
            <button onClick={() => setOpen(open === c.key ? null : c.key)} aria-expanded={open === c.key} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px]">
              <span aria-hidden style={{ color: LIGHT[c.level].color }}>{LIGHT[c.level].icon}</span>
              <span className="w-14 shrink-0 text-[11px] text-[#5b5546]">{c.title}</span>
              <span className="min-w-0 flex-1 font-medium">{c.summary}</span>
              <span aria-hidden className="text-[#9a9384]">{open === c.key ? "−" : "+"}</span>
            </button>
            {open === c.key && <p className="px-3 pb-2.5 text-[11px] leading-relaxed text-[#5b5546]">{c.detail}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------- 滑桿試算：拖曳就變色 ----------

const NHI_THRESHOLD = 20000;
const NHI_RATE = 0.0211;

function Simulator({ card }: { card: CheckCard }) {
  const price = card.price?.value ?? 0;
  const cash = card.latestDividend?.cash ?? 0;
  const [lots, setLots] = useState(5);
  const [move, setMove] = useState(0);
  const refMove = price ? -(cash / price) * 100 : 0;

  const r = useMemo(() => {
    const shares = lots * 1000;
    const dividend = Math.floor(shares * cash);
    const nhi = dividend >= NHI_THRESHOLD ? Math.round(dividend * NHI_RATE) : 0;
    const priceGain = Math.round(shares * price * (move / 100));
    const loss = Math.max(0, -priceGain);
    const erosion = dividend > 0 ? (loss / dividend) * 100 : loss > 0 ? Infinity : 0;
    const level: Exclude<Level, "unknown"> = erosion >= 100 ? "red" : erosion > 0 ? "yellow" : "green";
    return { dividend, nhi, priceGain, loss, erosion, total: dividend - nhi + priceGain, level };
  }, [lots, move, cash, price]);

  if (!price) return null;
  const l = LIGHT[r.level];
  const nhiLots = cash > 0 ? Math.ceil(NHI_THRESHOLD / (cash * 1000)) : null;
  const fmt = (n: number) => `${n < 0 ? "−" : n > 0 ? "+" : ""}${Math.abs(n).toLocaleString()}`;

  return (
    <section className="mt-5">
      <p className="text-sm font-bold">現在買，除息後會怎樣？</p>
      <p className="text-[11px] text-[#5b5546]">{cash > 0 ? `以最近一次每股配 ${cash} 元估算` : "這檔目前沒有配息紀錄"}</p>

      <div className="mt-3 space-y-4 rounded-3xl border border-[#e8e1cc] bg-white p-3.5">
        <Slider label="買進張數" value={lots} min={1} max={50} step={1} onChange={setLots} display={`${lots} 張`} hint={nhiLots ? `${nhiLots} 張起單筆配息滿 2 萬，扣 2.11% 健保` : undefined} />
        <Slider
          label="除息後股價"
          value={move}
          min={-20}
          max={10}
          step={0.5}
          onChange={setMove}
          display={`${move > 0 ? "+" : ""}${move.toFixed(1)}%`}
          marker={cash > 0 ? refMove : undefined}
          hint={cash > 0 ? `▲ 除息參考價 ${refMove.toFixed(1)}%，再往左就是貼息` : undefined}
        />
      </div>

      <div className="mt-3 rounded-3xl border border-[#e8e1cc] p-3.5 shadow-[0_10px_28px_-14px_rgba(29,29,27,0.28)] transition-colors duration-300" style={{ background: l.soft }}>
        <div className="flex items-baseline justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[13px] font-bold">
            <span aria-hidden style={{ color: l.color }}>{l.icon}</span>
            {r.level === "green" ? "配息是真的多賺" : r.level === "yellow" ? "部分配息是本金" : cash > 0 ? "配息全是本金" : "價差虧損"}
          </p>
          <p className="text-xl font-bold tabular-nums">{fmt(r.total)}</p>
        </div>
        <dl className="mt-2 grid grid-cols-3 gap-1 text-[11px] tabular-nums">
          <div>
            <dt className="text-[#5b5546]">領到配息</dt>
            <dd className="font-bold">{r.dividend.toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-[#5b5546]">股價損益</dt>
            <dd className="font-bold">{fmt(r.priceGain)}</dd>
          </div>
          <div>
            <dt className="text-[#5b5546]">本金侵蝕</dt>
            <dd className="font-bold">{Number.isFinite(r.erosion) ? `${r.erosion.toFixed(0)}%` : "—"}</dd>
          </div>
        </dl>
        {r.level !== "green" && cash > 0 && (
          <p className="mt-2 text-[12px] leading-relaxed">
            領到的 {r.dividend.toLocaleString()} 元裡，有 {Math.min(r.loss, r.dividend).toLocaleString()} 元是你自己的本金
            {r.loss > r.dividend && `，還倒賠 ${(r.loss - r.dividend).toLocaleString()} 元`}。
          </p>
        )}
        {r.nhi > 0 && <p className="mt-1 text-[11px] text-[#5b5546]">已扣二代健保 {r.nhi.toLocaleString()} 元</p>}
      </div>
    </section>
  );
}

function Slider(props: { label: string; value: number; min: number; max: number; step: number; display: string; onChange: (v: number) => void; marker?: number; hint?: string }) {
  const pos = (v: number) => ((v - props.min) / (props.max - props.min)) * 100;
  return (
    <label className="block">
      <span className="flex items-baseline justify-between text-[12px]">
        <span className="text-[#5b5546]">{props.label}</span>
        <span className="font-bold tabular-nums">{props.display}</span>
      </span>
      <span className="relative mt-1.5 block">
        <input
          type="range"
          min={props.min}
          max={props.max}
          step={props.step}
          value={props.value}
          onChange={(e) => props.onChange(Number(e.target.value))}
          className="yt-range w-full"
          style={{ "--p": `${pos(props.value)}%` } as React.CSSProperties}
        />
        {props.marker !== undefined && props.marker >= props.min && (
          <span aria-hidden className="pointer-events-none absolute -bottom-3 -translate-x-1/2 text-[9px]" style={{ left: `${pos(props.marker)}%` }}>
            ▲
          </span>
        )}
      </span>
      {props.hint && <span className="mt-2 block text-[10px] text-[#7a7466]">{props.hint}</span>}
    </label>
  );
}

// ---------- 第三層：證據與解法（Pro 示範） ----------

function Evidence({ card, pro, onLocked }: { card: CheckCard; pro: boolean; onLocked: (f: string) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const sections = [
    { key: "source", title: "詳細配息來源拆解", body: <SourceDetail card={card} /> },
    { key: "fill", title: "歷史填息天數", body: <FillDetail card={card} /> },
    { key: "alert", title: "到價／溢價收斂提醒", body: <AlertForm card={card} /> },
  ];
  return (
    <section className="mt-5">
      <p className="text-sm font-bold">
        看證據、找解法
        {!pro && <span className="ml-1.5 rounded-full bg-[#1d1d1b] px-1.5 py-0.5 text-[9px] text-white">Pro</span>}
      </p>
      <ul className="mt-2 space-y-1.5">
        {sections.map((s) => (
          <li key={s.key} className="rounded-2xl border border-[#e8e1cc] bg-white">
            <button
              onClick={() => (pro ? setOpen(open === s.key ? null : s.key) : onLocked(s.title))}
              aria-expanded={pro && open === s.key}
              className="flex w-full items-center justify-between px-3 py-2.5 text-left text-[13px] font-medium"
            >
              {s.title}
              <span aria-hidden>{pro ? (open === s.key ? "−" : "+") : "🔒"}</span>
            </button>
            {pro && open === s.key && <div className="px-3 pb-3">{s.body}</div>}
          </li>
        ))}
      </ul>
    </section>
  );
}

const SOURCE_PARTS = [
  { key: "dividendIncome", label: "股利所得", color: "var(--src-dividend)" },
  { key: "capitalGain", label: "已實現資本利得", color: "var(--src-capital)" },
  { key: "equalization", label: "收益平準金", color: "var(--src-equal)" },
  { key: "other", label: "報導未細分", color: "var(--src-other)" },
] as const;

function SourceDetail({ card }: { card: CheckCard }) {
  const c = card.composition;
  if (!c) return <p className="text-[12px] text-[#5b5546]">尚未收錄這檔的配息組成，或最近一期沒有配息。</p>;
  const data = SOURCE_PARTS.map((p) => ({ ...p, value: c[p.key] ?? 0 })).filter((d) => d.value > 0);
  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="size-28 shrink-0">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data} dataKey="value" innerRadius="52%" outerRadius="96%" stroke={INK} strokeWidth={2} animationDuration={800}>
                {data.map((d) => (
                  <Cell key={d.key} fill={d.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="flex-1 space-y-1 text-[12px]">
          {data.map((d) => (
            <li key={d.key} className="flex items-center gap-1.5">
              <span className="inline-block size-2.5 rounded-sm border border-[#1d1d1b]" style={{ background: d.color }} />
              <span className="flex-1">{d.label}</span>
              <span className="font-bold tabular-nums">{Number(d.value.toFixed(1))}%</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-[#7a7466]">
        {c.period}・{c.basis}。評分：股利×1、資本利得×0.5、平準金×0.2；80 分以上綠燈、50–79 黃燈、未滿 50 紅燈。
        <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer" className="ml-1 underline">
          來源
        </a>
      </p>
    </div>
  );
}

function FillDetail({ card }: { card: CheckCard }) {
  if (card.fillHistory.length === 0) return <p className="text-[12px] text-[#5b5546]">沒有除息紀錄。</p>;
  return (
    <div>
      <ul className="space-y-1.5 text-[11px]">
        {[...card.fillHistory].reverse().map((f, i) => {
          const over = f.fillDays === null || f.fillDays > 60;
          return (
            <li key={f.exDate} className="grid grid-cols-[4.2rem_1fr] items-center gap-2">
              <span className="tabular-nums text-[#5b5546]">{f.exDate.slice(2)}</span>
              <span className="flex items-center gap-1.5">
                <span
                  className="yt-grow h-3 rounded-r-full border border-[#1d1d1b]"
                  style={{ width: `${(Math.min(f.fillDays ?? 60, 60) / 60) * 70}%`, minWidth: 6, background: f.pending ? "#f5c93b" : over ? "#e5603f" : "#2f8f6c", animationDelay: `${i * 70}ms` }}
                />
                <span className="shrink-0 font-bold tabular-nums">{f.pending ? "填息中" : f.fillDays === null ? "未填息" : `${f.fillDays} 天`}</span>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[10px] text-[#7a7466]">交易日計，除息日為第 1 天；紅色＝超過 60 天或未填息，黃色＝仍在 60 天觀察期內。</p>
    </div>
  );
}

function AlertForm({ card }: { card: CheckCard }) {
  const isEtf = card.nav !== null;
  const [premiumOn, setPremiumOn] = useState(isEtf);
  const [premiumMax, setPremiumMax] = useState(0.5);
  const [exDiscount, setExDiscount] = useState(true);
  const [ma20Touch, setMa20Touch] = useState(false);
  const [priceOn, setPriceOn] = useState(false);
  const [priceBelow, setPriceBelow] = useState(card.price ? Number((card.price.value * 0.95).toFixed(2)) : 0);
  const [mode, setMode] = useState<"any" | "all">("any");
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    const conditions = {
      ...(premiumOn && isEtf ? { premiumMax } : {}),
      ...(exDiscount ? { exDiscount: true } : {}),
      ...(ma20Touch ? { ma20Touch: true } : {}),
      ...(priceOn ? { priceBelow } : {}),
    };
    const res = await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: card.code, name: card.name, mode, conditions }),
    });
    const data = await res.json();
    if (!res.ok) return setMsg(data.error);
    try {
      if ("Notification" in window && Notification.permission === "default") await Notification.requestPermission();
    } catch {
      // 不支援就只在頁面內提示
    }
    setMsg("設定好了！盤中開著 YieldTruth 時每分鐘檢查一次，成立就通知你。");
    window.dispatchEvent(new Event("yt-alerts-changed"));
  }

  const row = "flex flex-wrap items-center gap-1.5 text-[12px]";
  const num = "w-16 rounded-full border-2 border-[#1d1d1b] bg-white px-2 py-0.5 text-[12px]";
  return (
    <div className="space-y-2">
      <label className={row}>
        <input type="checkbox" checked={premiumOn} disabled={!isEtf} onChange={(e) => setPremiumOn(e.target.checked)} />
        溢價收斂到
        <input type="number" step={0.1} value={premiumMax} disabled={!isEtf} onChange={(e) => setPremiumMax(Number(e.target.value))} className={num} />% 內
        {card.nav && <span className="text-[10px] text-[#7a7466]">（目前 {card.nav.premiumPct > 0 ? "+" : ""}{card.nav.premiumPct.toFixed(2)}%）</span>}
      </label>
      <label className={row}>
        <input type="checkbox" checked={exDiscount} onChange={(e) => setExDiscount(e.target.checked)} />
        除息後貼息（跌破參考價）
      </label>
      <label className={row}>
        <input type="checkbox" checked={ma20Touch} onChange={(e) => setMa20Touch(e.target.checked)} />
        回測月線支撐 ±1%
        {card.ma20 && <span className="text-[10px] text-[#7a7466]">（月線 {card.ma20.toFixed(2)}）</span>}
      </label>
      <label className={row}>
        <input type="checkbox" checked={priceOn} onChange={(e) => setPriceOn(e.target.checked)} />
        跌到
        <input type="number" step={0.01} value={priceBelow} onChange={(e) => setPriceBelow(Number(e.target.value))} className={num} />
        元以下
      </label>
      <div className="flex items-center gap-2 pt-1">
        <select value={mode} onChange={(e) => setMode(e.target.value as "any" | "all")} className="rounded-full border-2 border-[#1d1d1b] bg-white px-2 py-1 text-[11px]">
          <option value="any">任一成立</option>
          <option value="all">全部成立</option>
        </select>
        <button
          onClick={save}
          disabled={!ALERTS_ENABLED}
          className="flex-1 rounded-full border-2 border-[#1d1d1b] bg-[#2f8f6c] py-1.5 text-[12px] font-bold text-white shadow-[2px_2px_0_#1d1d1b] active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
        >
          通知我
        </button>
      </div>
      {!ALERTS_ENABLED && <p className="text-center text-[10px] text-[#7a7466]">測試中，等待開通</p>}
      {msg && <p className="text-[11px] text-[#2f8f6c]">{msg}</p>}
      <AlertList code={card.code} />
    </div>
  );
}

// 進場提醒測試中、等待開通。開通時改為 true，並在 layout.tsx 掛回 <AlertWatcher />
const ALERTS_ENABLED = false;

type AlertRow = { _id: string; code: string; conditions: Record<string, unknown>; mode: string; lastTriggeredDate?: string };

function AlertList({ code }: { code: string }) {
  const [rows, setRows] = useState<AlertRow[]>([]);
  useEffect(() => {
    const refresh = () =>
      fetch("/api/alerts")
        .then((r) => r.json())
        .then((all: AlertRow[]) => setRows(all.filter((a) => a.code === code)))
        .catch(() => undefined);
    refresh();
    window.addEventListener("yt-alerts-changed", refresh);
    return () => window.removeEventListener("yt-alerts-changed", refresh);
  }, [code]);
  if (rows.length === 0) return null;
  const describe = (k: Record<string, unknown>) =>
    [k.premiumMax !== undefined && `溢價≤${k.premiumMax}%`, k.exDiscount && "貼息", k.ma20Touch && "回測月線", k.priceBelow !== undefined && `≤${k.priceBelow}元`].filter(Boolean).join("、");
  return (
    <ul className="space-y-1 border-t border-dashed border-[#d8cfb4] pt-2 text-[11px]">
      {rows.map((a) => (
        <li key={a._id} className="flex items-center gap-2">
          <span className="flex-1">
            🔔 {describe(a.conditions)}（{a.mode === "all" ? "全部" : "任一"}）
          </span>
          <button
            onClick={() => fetch(`/api/alerts?id=${a._id}`, { method: "DELETE" }).then(() => window.dispatchEvent(new Event("yt-alerts-changed")))}
            className="text-[#7a7466] underline"
          >
            刪除
          </button>
        </li>
      ))}
    </ul>
  );
}

// ---------- 付費牆（示範）：手機裡的底部抽屜 ----------

function Paywall({ feature, onUnlock, onClose }: { feature: string; onUnlock: () => void; onClose: () => void }) {
  return (
    <div role="dialog" aria-modal="true" aria-label="升級 Pro" className="absolute inset-0 z-30 flex items-end bg-black/35" onClick={onClose}>
      <div className="yt-sheet w-full rounded-t-[32px] bg-[#fbf7ec] p-5 pb-7" onClick={(e) => e.stopPropagation()}>
        <div aria-hidden className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[#d8cfb4]" />
        <p className="font-[family-name:var(--font-huninn)] text-xl">風險看到了，接著看解法！</p>
        <p className="mt-1.5 text-[12px] text-[#5b5546]">「{feature}」是 Pro 功能。燈號警示永遠免費。</p>
        <ul className="mt-3 space-y-1 text-[12px]">
          <li>✓ 配息來源圓餅圖與評分規則</li>
          <li>✓ 近 8 次逐筆填息天數</li>
          <li>
            ✓ 到價、溢價收斂、貼息、回測月線提醒<span className="ml-1 text-[10px] text-[#7a7466]">（測試中）</span>
          </li>
        </ul>
        <p className="mt-3">
          <span className="font-[family-name:var(--font-huninn)] text-2xl">NT$149</span> <span className="text-[12px]">/ 月</span>
          <span className="ml-1 text-[10px] text-[#7a7466]">定價假設</span>
        </p>
        <button onClick={onUnlock} className="mt-3 w-full rounded-full border-2 border-[#1d1d1b] bg-[#f5c93b] py-2.5 text-sm font-bold shadow-[3px_3px_0_#1d1d1b] active:translate-y-0.5 active:shadow-none">
          示範：直接解鎖 Pro
        </button>
        <button onClick={onClose} className="mt-1 w-full py-2 text-[12px] text-[#7a7466]">
          先不要
        </button>
        <p className="text-center text-[10px] text-[#9a9384]">個人使用版，不會收費</p>
      </div>
    </div>
  );
}

function ProToggle({ pro, onChange }: { pro: boolean; onChange: (on: boolean) => void }) {
  return (
    <div className="mt-6 inline-flex items-center gap-2 text-xs lg:flex">
      <span className="text-[#5b5546]">示範模式</span>
      <span className="inline-flex rounded-full border-2 border-[#1d1d1b] bg-white p-0.5">
        {[false, true].map((v) => (
          <button key={String(v)} onClick={() => onChange(v)} className={`rounded-full px-3 py-0.5 font-bold ${pro === v ? "bg-[#1d1d1b] text-white" : ""}`}>
            {v ? "Pro" : "免費"}
          </button>
        ))}
      </span>
    </div>
  );
}

function CustomCode({ onSubmit }: { onSubmit: (code: string) => void }) {
  const [v, setV] = useState("");
  return (
    <form
      className="mt-3 flex gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        if (v.trim()) onSubmit(v.trim().toUpperCase());
      }}
    >
      <input value={v} onChange={(e) => setV(e.target.value)} placeholder="其他代號，例如 00919" className="min-w-0 flex-1 rounded-full border-2 border-[#1d1d1b] bg-white px-3 py-1.5 text-sm" />
      <button className="rounded-full border-2 border-[#1d1d1b] bg-white px-3 text-sm font-bold">查</button>
    </form>
  );
}

function PhoneSkeleton() {
  return (
    <div className="space-y-3 px-4 pt-12">
      <div className="h-28 animate-pulse rounded-3xl bg-[#f3eddc]" />
      <div className="h-64 animate-pulse rounded-3xl bg-[#f3eddc]" />
      <div className="h-32 animate-pulse rounded-3xl bg-[#f3eddc]" />
    </div>
  );
}

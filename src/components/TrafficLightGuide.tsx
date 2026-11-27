"use client";

import { useEffect, useState } from "react";

// 可愛風格的路口紅綠燈：三顆燈各有表情，下方說明不同燈號代表什麼。
// mode="cycle"：像真的紅綠燈一樣輪流亮（首頁）；傳入 active：固定亮某一顆（體檢頁）。

export type Light = "green" | "yellow" | "red";

const INK = "#1d1d1b";

const LIGHTS: {
  key: Light;
  name: string;
  nick: string;
  color: string;
  soft: string;
  icon: string;
  when: string[];
  meaning: string;
}[] = [
  {
    key: "red",
    name: "紅燈",
    nick: "先別急",
    color: "#e5603f",
    soft: "#ffe0d6",
    icon: "■",
    when: ["配息大量來自收益平準金或本金", "溢價超過 3%，多付錢買同一籃股票", "近 8 次配息多半沒在 60 天內填息"],
    meaning: "風險訊號偏多，先停下來把原因看完。",
  },
  {
    key: "yellow",
    name: "黃燈",
    nick: "先看清楚",
    color: "#f5c93b",
    soft: "#fff1b8",
    icon: "▲",
    when: ["配息多來自已實現資本利得", "溢價 1%–3% 偏高", "外資投信大量賣超，或還沒配過息"],
    meaning: "有一兩項要留意，點開原因再決定。",
  },
  {
    key: "green",
    name: "綠燈",
    nick: "放心看",
    color: "#2f8f6c",
    soft: "#d9f0e4",
    icon: "●",
    when: ["配息主要來自股利所得", "近期大多順利填息", "溢價在 1% 以內，價格合理"],
    meaning: "四項體檢都正常，仍要看自己的資金需求。",
  },
];

/** 單顆燈：燈罩＋發光的臉 */
function Lamp({ l, on, size = 92 }: { l: (typeof LIGHTS)[number]; on: boolean; size?: number }) {
  const face = l.key;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden className={on ? "yt-lamp-on" : ""} style={{ color: l.color }}>
      {/* 光暈 */}
      {on && <circle cx={50} cy={54} r={46} fill={l.color} opacity={0.25} />}
      {/* 燈 */}
      <circle cx={50} cy={54} r={36} fill={on ? l.color : "#5a5750"} stroke={INK} strokeWidth={4} />
      {on && <ellipse cx={36} cy={40} rx={9} ry={6} fill="#fff" opacity={0.55} transform="rotate(-30 36 40)" />}
      {/* 燈罩 */}
      <path d="M10 46 Q12 12 50 10 Q88 12 90 46 L80 46 Q78 22 50 21 Q22 22 20 46 Z" fill={INK} />
      {/* 表情 */}
      <g stroke={INK} strokeWidth={3.5} strokeLinecap="round" fill="none" opacity={on ? 1 : 0.45}>
        {face === "green" && (
          <>
            <path d="M36 52 q5 -6 10 0" />
            <path d="M54 52 q5 -6 10 0" />
            <path d="M40 64 Q50 74 60 64" />
          </>
        )}
        {face === "yellow" && (
          <>
            <circle cx={41} cy={52} r={2.6} fill={INK} />
            <circle cx={59} cy={52} r={2.6} fill={INK} />
            <path d="M41 67 q4.5 -4 9 0 t9 0" />
          </>
        )}
        {face === "red" && (
          <>
            <path d="M35 46 l9 3 M65 46 l-9 3" />
            <circle cx={41} cy={54} r={2.8} fill={INK} />
            <circle cx={59} cy={54} r={2.8} fill={INK} />
            <ellipse cx={50} cy={68} rx={5} ry={6} fill={INK} />
          </>
        )}
      </g>
      {on && face !== "red" && (
        <>
          <ellipse cx={32} cy={63} rx={5} ry={3} fill="#fff" opacity={0.45} />
          <ellipse cx={68} cy={63} rx={5} ry={3} fill="#fff" opacity={0.45} />
        </>
      )}
    </svg>
  );
}

export default function TrafficLightGuide({
  active,
  mode = active ? "fixed" : "cycle",
  compact = false,
}: {
  active?: Light;
  mode?: "cycle" | "fixed";
  compact?: boolean;
}) {
  const [tick, setTick] = useState(2); // 從綠燈開始
  useEffect(() => {
    if (mode !== "cycle" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setTick((x) => (x + 2) % 3), 2200); // 綠 → 黃 → 紅 → 綠
    return () => clearInterval(t);
  }, [mode]);
  const lit: Light = mode === "fixed" && active ? active : LIGHTS[tick].key;

  return (
    <div>
      {/* 燈箱：桌機橫式，手機縮小但仍橫式 */}
      <div className="flex justify-center">
        <div className="relative">
          <div className="flex items-center gap-1 rounded-[40px] bg-[#1d1d1b] px-3 py-2 shadow-[0_14px_30px_-14px_rgba(29,29,27,0.6)] sm:gap-3 sm:px-5 sm:py-3">
            {LIGHTS.map((l) => (
              <Lamp key={l.key} l={l} on={lit === l.key} size={compact ? 64 : 84} />
            ))}
          </div>
          {/* 燈桿 */}
          <div aria-hidden className="mx-auto h-8 w-4 rounded-b-md bg-[#1d1d1b] sm:h-10" />
        </div>
      </div>

      {/* 說明卡 */}
      <ul className={`mt-2 grid gap-3 ${compact ? "md:grid-cols-3" : "md:grid-cols-3 md:gap-5"}`}>
        {LIGHTS.map((l) => {
          const on = lit === l.key;
          return (
            <li
              key={l.key}
              className={`rounded-3xl p-5 transition duration-300 ${on ? "-translate-y-1 shadow-[0_14px_30px_-14px_rgba(29,29,27,0.45)]" : "opacity-60"}`}
              style={{ background: on ? l.soft : "#ffffff" }}
              aria-current={mode === "fixed" && on ? "true" : undefined}
            >
              <p className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-full border-2 border-[#1d1d1b] text-xs text-white" style={{ background: l.color }} aria-hidden>
                  {l.icon}
                </span>
                <span className="font-[family-name:var(--font-huninn)] text-xl">{l.name}</span>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold">{l.nick}</span>
                {mode === "fixed" && on && <span className="ml-auto rounded-full bg-[#1d1d1b] px-2 py-0.5 text-[10px] font-bold text-white">這檔</span>}
              </p>
              <ul className="mt-3 space-y-1.5 text-sm">
                {l.when.map((w) => (
                  <li key={w} className="flex gap-2">
                    <span aria-hidden className="mt-0.5 text-xs" style={{ color: l.key === "yellow" ? "#b07f00" : l.color }}>
                      {l.icon}
                    </span>
                    {w}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm font-bold">{l.meaning}</p>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-center text-xs text-zinc-500">燈號取四項體檢中最差的一項；是資訊揭露，不是買賣建議。</p>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { Bubble, Cat, Dog, Rabbit, Turtle } from "@/components/Mascots";
import { match, minesFor, QUESTIONS, score, TRAIT_LABELS, type Persona, type Trait } from "@/lib/quiz";

const ANIMALS = { Turtle, Dog, Cat, Rabbit } as const;
const GUIDES = [Turtle, Dog, Cat, Rabbit, Dog] as const;
const SOFT = ["bg-[#fff1b8]", "bg-[#d9f0e4]", "bg-[#ffe0d6]", "bg-[#dbe8f7]"];

export default function QuizExperience() {
  const [step, setStep] = useState(-1); // -1 = 開場，0–4 = 題目，5 = 結果
  const [answers, setAnswers] = useState<number[]>([]);
  const [picked, setPicked] = useState<number | null>(null);

  function choose(i: number) {
    if (picked !== null) return;
    setPicked(i);
    // 讓選到的按鈕先彈一下，再進下一題
    setTimeout(() => {
      setAnswers((a) => [...a.slice(0, step), i]);
      setStep((s) => s + 1);
      setPicked(null);
    }, 320);
  }

  function restart() {
    setAnswers([]);
    setStep(0);
  }

  if (step === -1) return <Intro onStart={() => setStep(0)} />;
  if (step >= QUESTIONS.length) return <Result answers={answers} onRestart={restart} />;

  const q = QUESTIONS[step];
  const Guide = GUIDES[step];
  return (
    <div className="grid items-end gap-6 md:grid-cols-[1fr_11rem]">
      <div key={q.id} className="yt-rise">
        {/* 進度 */}
        <div className="flex items-center gap-3">
          <div className="flex flex-1 gap-1.5" aria-label={`第 ${step + 1} 題，共 ${QUESTIONS.length} 題`}>
            {QUESTIONS.map((_, i) => (
              <span key={i} className={`h-2.5 flex-1 rounded-full ${i <= step ? "bg-[#f5c93b]" : "bg-[#e8e1cc]"}`} />
            ))}
          </div>
          <span className="text-sm font-bold tabular-nums">
            {step + 1}/{QUESTIONS.length}
          </span>
        </div>

        <p className="mt-6 text-sm text-zinc-500">{q.scene}</p>
        <h2 className="mt-1 font-[family-name:var(--font-huninn)] text-2xl leading-snug sm:text-3xl">{q.text}</h2>

        <ul className="mt-6 space-y-3">
          {q.options.map((o, i) => (
            <li key={o.label}>
              <button
                onClick={() => choose(i)}
                className={`w-full rounded-full border-2 border-zinc-900 px-5 py-3.5 text-left font-bold transition ${
                  picked === i ? "yt-pop bg-[#f5c93b] shadow-[3px_3px_0_#1d1d1b]" : "bg-white hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#1d1d1b]"
                }`}
              >
                <span className="mr-2 inline-flex size-6 items-center justify-center rounded-full border-2 border-zinc-900 text-xs">{"ABCD"[i]}</span>
                {o.label}
              </button>
            </li>
          ))}
        </ul>

        {step > 0 && (
          <button onClick={() => setStep((s) => s - 1)} className="mt-5 text-sm text-zinc-500 underline">
            ← 上一題
          </button>
        )}
      </div>

      <div className="hidden text-center md:block">
        <Bubble key={q.id} text={["慢慢想～", "這題很重要！", "說實話喔", "冷靜冷靜", "最後一題！"][step]} className="yt-pop mb-2 !text-sm" />
        <Guide mood={picked === null ? "yellow" : "green"} className="yt-bob w-full" />
      </div>
    </div>
  );
}

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <div className="yt-dots relative overflow-hidden rounded-[40px] bg-[#f3eddc] px-6 py-10 text-center sm:px-10">
      <div aria-hidden className="absolute -left-20 -top-20 size-56 rounded-full bg-[#f5c93b]" />
      <div aria-hidden className="absolute -bottom-24 -right-16 size-64 rounded-full bg-[#cfe6d8]" />
      <div className="relative">
        <p className="inline-block rounded-full border-2 border-zinc-900 bg-white px-3 py-0.5 text-xs font-bold">5 題・1 分鐘</p>
        <h1 className="mt-4 text-4xl leading-tight sm:text-5xl">
          你的<span className="bg-[linear-gradient(transparent_60%,#f5c93b_60%)]">命定 ETF</span>
          <br />
          是哪一隻？
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-zinc-600 sm:text-base">
          不考「市值加權還是殖利率因子」，只問你的生活：跌了睡不睡得著、錢什麼時候要用。測完配對最適合的 ETF 類型，再送你一張專屬地雷卡。
        </p>
        <div className="mx-auto mt-8 grid max-w-xl grid-cols-4 gap-2 sm:gap-4">
          {[Turtle, Dog, Cat, Rabbit].map((A, i) => (
            <A key={i} mood="green" className="yt-bob w-full" />
          ))}
        </div>
        <button onClick={onStart} className="yt-btn mt-8 px-10 text-lg">
          開始配對
        </button>
      </div>
    </div>
  );
}

// ---------- 結果 ----------

function Result({ answers, onRestart }: { answers: number[]; onRestart: () => void }) {
  const s = score(answers);
  const { primary, secondary } = match(s);
  const mines = minesFor(s);
  const Animal = ANIMALS[primary.animal];

  return (
    <div className="space-y-6">
      {/* 角色卡 */}
      <section className="yt-card yt-rise relative overflow-hidden bg-[#fff1b8] p-6 sm:p-8">
        <div aria-hidden className="absolute -right-14 -top-14 size-48 rounded-full bg-[#f5c93b]" />
        <div className="relative grid items-center gap-6 sm:grid-cols-[12rem_1fr]">
          <div className="mx-auto w-40 text-center sm:w-full">
            <Bubble text="就是你！" className="yt-pop mb-2 !text-sm" />
            <Animal mood="green" className="yt-bob w-full" />
          </div>
          <div>
            <p className="text-sm font-bold text-zinc-600">你的命定角色是</p>
            <p className="mt-2 inline-block rounded-full border-2 border-zinc-900 bg-white px-3 py-0.5 text-sm font-bold">{primary.title}</p>
            <h1 className="mt-2 text-5xl leading-tight sm:text-6xl">{primary.name}</h1>
            <p className="mt-3 text-base leading-relaxed">{primary.tagline}</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {primary.traits.map((t) => (
                <li key={t} className="rounded-full border-2 border-zinc-900 bg-white px-3 py-1 text-sm font-bold">
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 屬性量表 */}
      <section className="yt-card-flat p-5 sm:p-6">
        <h2 className="font-bold">你的投資屬性</h2>
        <dl className="mt-4 space-y-3.5">
          {(Object.keys(TRAIT_LABELS) as Trait[]).map((k, i) => {
            const t = TRAIT_LABELS[k];
            const pct = Math.min(100, Math.max(4, ((s[k] - t.min) / (t.max - t.min)) * 100));
            return (
              <div key={k} className="grid grid-cols-[5.5rem_1fr] items-center gap-3 text-sm">
                <dt className="font-bold">{t.name}</dt>
                <dd>
                  <div className="h-4 overflow-hidden rounded-full bg-[#f3eddc]">
                    <div className="yt-grow h-full rounded-full bg-[var(--series-1)]" style={{ width: `${pct}%`, animationDelay: `${i * 120}ms` }} />
                  </div>
                  <div className="mt-0.5 flex justify-between text-[11px] text-zinc-500">
                    <span>{t.low}</span>
                    <span>{t.high}</span>
                  </div>
                </dd>
              </div>
            );
          })}
        </dl>
      </section>

      {/* 配對的 ETF 類型 */}
      <section>
        <h2 className="text-lg font-bold">最適合你的 ETF 類型</h2>
        <div className={`mt-3 grid gap-4 ${secondary ? "sm:grid-cols-2" : ""}`}>
          {[primary, ...(secondary ? [secondary] : [])].map((p, i) => (
            <TypeCard key={p.key} p={p} rank={i} soft={SOFT[i + 1]} />
          ))}
        </div>
      </section>

      {/* 專屬地雷卡 */}
      <section className="relative">
        <div className="grid items-end gap-4 md:grid-cols-[1fr_9rem]">
          <div className="yt-card yt-rise overflow-hidden bg-[#ffe0d6] p-0 [animation-delay:200ms]">
            <div className="flex items-center justify-between border-b border-dashed border-[#e5b8a8] px-5 py-3">
              <h2 className="font-[family-name:var(--font-huninn)] text-xl">{primary.name}的專屬地雷卡</h2>
              <span className="rounded-full border-2 border-zinc-900 bg-white px-2.5 py-0.5 text-xs font-bold">先別碰</span>
            </div>
            <ul className="divide-y divide-dashed divide-[#e5b8a8]">
              {mines.map((m) => (
                <li key={m.title} className="flex gap-3 px-5 py-4">
                  <span aria-hidden className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-zinc-900 bg-[var(--coral)] text-xs font-bold text-white">
                    ✕
                  </span>
                  <div>
                    <p className="font-bold">{m.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-700">{m.why}</p>
                    {m.link && (
                      <Link href={m.link.href} className="mt-1.5 inline-block text-sm font-bold underline">
                        {m.link.label} →
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="hidden text-center md:block">
            <Bubble text="WOW!? 小心！" side="right" className="yt-pop mb-2 whitespace-nowrap !text-sm" />
            {/* 地雷卡旁用驚嚇表情的另一隻角色，避免和主角色重複 */}
            {primary.animal === "Rabbit" ? <Cat mood="red" className="yt-bob w-full" /> : <Rabbit mood="red" className="yt-bob w-full" />}
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <button onClick={onRestart} className="yt-chip px-5 py-2.5">
          再測一次
        </button>
        <Link href="/check" className="yt-btn">
          去下單前體檢
        </Link>
      </div>

      <p className="text-xs leading-relaxed text-zinc-500">
        本測驗配對的是 ETF 類型，代號僅為常見代表、非推薦標的；結果供自我了解與資訊參考，不構成投資建議。實際投資前請評估自身財務狀況。
      </p>
    </div>
  );
}

function TypeCard({ p, rank, soft }: { p: Persona; rank: number; soft: string }) {
  const Animal = ANIMALS[p.animal];
  return (
    <article className={`yt-card yt-rise p-5 ${soft}`} style={{ animationDelay: `${rank * 120}ms` }}>
      <div className="flex items-start gap-3">
        <Animal mood="green" className="w-14 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-bold text-zinc-600">{rank === 0 ? "最適合" : "也很適合"}・{p.name}型</p>
          <h3 className="mt-0.5 text-xl font-bold">{p.etfType}</h3>
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed">{p.why}</p>
      <p className="mt-3 text-xs text-zinc-600">常見代表（非推薦，點擊可看體檢燈號）</p>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {p.examples.map((e) =>
          e.otc ? (
            <span key={e.code} className="yt-chip !text-xs !font-normal" title="上櫃債券 ETF，體檢暫不支援">
              {e.code} {e.name}（上櫃，體檢暫不支援）
            </span>
          ) : (
            <Link key={e.code} href={`/check?code=${e.code}`} className="yt-chip !text-xs">
              {e.code} {e.name}
            </Link>
          ),
        )}
      </div>
    </article>
  );
}

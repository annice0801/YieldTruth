"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { TIER_PRINCIPLE, TIERS } from "@/data/plans";

/** 「升級 Pro」按鈕：點擊後彈出免費版與付費版的功能比較 */
export default function UpgradeCompare({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`yt-btn !bg-zinc-900 !text-white ${className}`}>
        升級 Pro，看差異 →
      </button>

      {/* 掛到 body：避免被有 transform（捲動動畫、視差）的祖先元素影響 fixed 定位 */}
      {open &&
        createPortal(
          <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6" onClick={() => setOpen(false)}>
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="compare-title"
              className="yt-sheet max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-t-[32px] bg-[#fbf7ec] p-5 shadow-[0_24px_60px_-20px_rgba(29,29,27,0.5)] sm:rounded-[32px] sm:p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-zinc-500">功能規劃示範</p>
                  <h2 id="compare-title" className="mt-1 font-[family-name:var(--font-huninn)] text-2xl sm:text-3xl">
                    免費版 vs Pro
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="關閉"
                  className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-zinc-900 bg-white text-lg"
                >
                  ×
                </button>
              </div>
              <p className="mt-2 text-sm text-zinc-600">目前為個人使用版本，已完成的功能都直接開放。標示「已完成」的是現在就能用的功能。</p>

              {/* 平板、電腦：表格 */}
              <div className="mt-5 hidden overflow-hidden rounded-3xl border border-[#e8e1cc] bg-white sm:block">
                <table className="w-full text-sm">
                  <thead className="bg-[#f3eddc] text-left">
                    <tr>
                      <th className="px-4 py-3 font-bold">功能</th>
                      <th className="w-[26%] px-4 py-3 font-bold">免費版</th>
                      <th className="w-[30%] bg-[#f5c93b] px-4 py-3 font-bold">Pro</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#efe9d8]">
                    {TIERS.map((t) => (
                      <tr key={t.feature}>
                        <td className="px-4 py-3">
                          {t.feature}
                          {t.live && (
                            <span className="ml-2 whitespace-nowrap rounded-full bg-[#2f8f6c] px-2 py-0.5 text-[10px] font-bold text-white">已完成</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-zinc-600">{t.free}</td>
                        <td className="bg-[#fff8dc] px-4 py-3 font-medium">{t.paid}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 手機：卡片 */}
              <ul className="mt-5 space-y-3 sm:hidden">
                {TIERS.map((t) => (
                  <li key={t.feature} className="rounded-3xl border border-[#e8e1cc] bg-white p-4">
                    <p className="text-sm font-bold">
                      {t.feature}
                      {t.live && <span className="ml-2 whitespace-nowrap rounded-full bg-[#2f8f6c] px-2 py-0.5 text-[10px] text-white">已完成</span>}
                    </p>
                    <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-2xl bg-[#f3eddc] p-2.5">
                        <dt className="font-bold text-zinc-500">免費版</dt>
                        <dd className="mt-0.5">{t.free}</dd>
                      </div>
                      <div className="rounded-2xl bg-[#fff1b8] p-2.5">
                        <dt className="font-bold">Pro</dt>
                        <dd className="mt-0.5 font-medium">{t.paid}</dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>

              <p className="mt-4 rounded-2xl bg-[#d9f0e4] px-4 py-3 text-sm">設計原則：{TIER_PRINCIPLE}</p>
              <div className="mt-5 flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
                <p className="text-xs text-zinc-500">Pro NT$149／月為定價假設；個人使用版不會收費。</p>
                <button type="button" onClick={() => setOpen(false)} className="yt-btn w-full sm:w-auto">
                  知道了
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

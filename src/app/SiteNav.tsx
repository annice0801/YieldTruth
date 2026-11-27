"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo, NAV_LINKS } from "@/components/site";

/**
 * 頁首（響應式）
 * - 手機（< md）：標誌＋漢堡選單，展開後是直式連結與行動按鈕
 * - 平板（md–lg）：標誌＋橫排分頁
 * - 電腦（≥ lg）：再加上右側「免費體檢」按鈕
 */
export default function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // 選單開啟時鎖住背景捲動，按 Esc 關閉
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
    <header className="sticky top-0 z-30 border-b border-[#e8e1cc] bg-[#fbf7ec]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2.5">
        <Link href="/" aria-label="YieldTruth 首頁" className="mr-2 shrink-0 text-xl" onClick={() => setOpen(false)}>
          <Logo />
        </Link>

        <nav aria-label="主要分頁" className="ml-auto hidden items-center gap-1 md:flex lg:ml-4">
          {NAV_LINKS.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`shrink-0 rounded-full border-2 px-3 py-1 text-sm font-bold transition lg:px-3.5 ${
                  active ? "border-zinc-900 bg-[#f5c93b] shadow-[2px_2px_0_#1d1d1b]" : "border-transparent text-zinc-600 hover:border-zinc-900 hover:bg-white"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <Link href="/check" className="yt-btn ml-auto hidden shrink-0 !px-4 !py-1.5 text-sm lg:inline-block">
          免費體檢 →
        </Link>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "關閉選單" : "開啟選單"}
          className="ml-auto flex size-10 items-center justify-center rounded-full border-2 border-zinc-900 bg-white md:hidden"
        >
          <span aria-hidden className="relative block h-3.5 w-5">
            <span className={`absolute left-0 h-0.5 w-5 rounded bg-zinc-900 transition ${open ? "top-1.5 rotate-45" : "top-0"}`} />
            <span className={`absolute left-0 top-1.5 h-0.5 w-5 rounded bg-zinc-900 transition ${open ? "opacity-0" : ""}`} />
            <span className={`absolute left-0 h-0.5 w-5 rounded bg-zinc-900 transition ${open ? "top-1.5 -rotate-45" : "top-3"}`} />
          </span>
        </button>
      </div>

      {/* 手機選單 */}
      {open && (
        <div id="mobile-menu" className="fixed inset-x-0 bottom-0 top-[58px] z-30 bg-black/30 md:hidden" onClick={() => setOpen(false)}>
          <nav
            aria-label="主要分頁"
            className="yt-rise mx-3 mt-2 rounded-[28px] bg-[#fbf7ec] p-4 shadow-[0_18px_40px_-16px_rgba(29,29,27,0.45)]"
            onClick={(e) => e.stopPropagation()}
          >
            <ul className="space-y-2">
              {NAV_LINKS.map((l) => {
                const active = pathname === l.href;
                return (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center justify-between rounded-full px-5 py-3 text-base font-bold ${active ? "bg-[#f5c93b]" : "bg-white"}`}
                    >
                      {l.label}
                      <span aria-hidden>→</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <Link href="/check" onClick={() => setOpen(false)} className="yt-btn mt-4 block text-center">
              免費體檢一檔 ETF
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

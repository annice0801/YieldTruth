"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GLOSSARY } from "@/data/glossary";

const WIDTH = 288;

/**
 * 名詞：點狀底線，點擊後在字下方顯示說明。
 * 說明框掛在 body 上並以 fixed 定位，不會被 overflow-hidden 的容器裁掉；
 * 點外面、按 Esc 或捲動時關閉。
 */
export default function Term({ t, children }: { t: string; children?: React.ReactNode }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const box = useRef<HTMLSpanElement>(null);
  const id = useId();
  const desc = GLOSSARY[t];

  function toggle() {
    if (pos) return setPos(null);
    const r = btn.current!.getBoundingClientRect();
    const w = Math.min(WIDTH, window.innerWidth - 16);
    const left = Math.max(8, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - w - 8));
    setPos({ top: r.bottom + 8, left });
  }

  useEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!btn.current?.contains(target) && !box.current?.contains(target)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, { passive: true });
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close);
      window.removeEventListener("resize", close);
    };
  }, [pos]);

  if (!desc) return <>{children ?? t}</>;
  return (
    <>
      <button
        ref={btn}
        type="button"
        onClick={toggle}
        aria-expanded={!!pos}
        aria-describedby={pos ? id : undefined}
        className="cursor-help font-[inherit] underline decoration-[#d99a00] decoration-dotted decoration-2 underline-offset-4 hover:bg-[#fff1b8]"
      >
        {children ?? t}
      </button>
      {pos &&
        createPortal(
          <span
            ref={box}
            id={id}
            role="tooltip"
            style={{ top: pos.top, left: pos.left, width: Math.min(WIDTH, window.innerWidth - 16) }}
            className="yt-pop fixed z-[60] block rounded-2xl border border-[#e8e1cc] bg-white p-3 text-left text-xs font-normal leading-relaxed text-zinc-800 shadow-[0_14px_32px_-12px_rgba(29,29,27,0.45)]"
          >
            <span className="mb-1 block text-sm font-bold text-zinc-900">{t}</span>
            {desc}
          </span>,
          document.body,
        )}
    </>
  );
}

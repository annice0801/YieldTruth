"use client";

import { useEffect, useRef } from "react";

// 滾動視差：元素依自己相對畫面中心的距離，乘上 speed 位移。
// speed > 0 往下落後（比內容慢，像在遠處）；speed < 0 往上超前（像在近處）。
// 全頁只掛一個 scroll 監聽，每個畫面格最多計算一次；系統設定「減少動態效果」時不位移。

type Item = { el: HTMLElement; speed: number; max: number };
const items = new Set<Item>();
let ticking = false;
let listening = false;

function update() {
  ticking = false;
  const vh = window.innerHeight;
  for (const it of items) {
    const r = it.el.getBoundingClientRect();
    // 移除自己的位移再算位置，避免回饋
    const current = Number(it.el.dataset.py ?? 0);
    const center = r.top - current + r.height / 2;
    if (center < -vh || center > vh * 2) continue; // 畫面外的不算
    // 歸零點：首屏內的元素在頁面頂端（未捲動）時不位移；其餘元素捲到畫面中央時不位移
    const docCenter = center + window.scrollY;
    const rest = docCenter < vh ? docCenter : vh / 2;
    const y = Math.max(-it.max, Math.min(it.max, (center - rest) * it.speed));
    it.el.dataset.py = String(y);
    it.el.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
  }
}

function onScroll() {
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(update);
  }
}

function register(item: Item) {
  items.add(item);
  if (!listening) {
    listening = true;
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
  }
  onScroll();
  return () => {
    items.delete(item);
    item.el.style.transform = "";
    if (items.size === 0 && listening) {
      listening = false;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    }
  };
}

export function Parallax({
  speed = 0.15,
  max = 120,
  className = "",
  style,
  children,
  ...rest
}: {
  speed?: number;
  max?: number;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
} & React.AriaAttributes) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    return register({ el, speed, max });
  }, [speed, max]);
  return (
    <div ref={ref} className={`will-change-transform ${className}`} style={style} {...rest}>
      {children}
    </div>
  );
}

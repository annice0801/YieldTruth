// 左右交錯的大色塊：從畫面左緣或右緣伸出、內側圓角，做出右左右左的節奏。
// 色塊會隨捲動緩慢位移（視差），比內容慢，看起來像在後方。
import { Parallax } from "./Parallax";

export const BLOCK_TONES = {
  mustard: "#f5c93b",
  cream: "#f3eddc",
  sage: "#d9f0e4",
  sky: "#dbe8f7",
  peach: "#ffe0d6",
  mint: "#cfe6d8",
} as const;
export type BlockTone = keyof typeof BLOCK_TONES;

/** 單一側邊色塊，放在 relative 容器內當底色 */
export function SideBlock({
  side,
  tone,
  className = "",
  dots = false,
  speed = 0.12,
}: {
  side: "left" | "right";
  tone: BlockTone;
  className?: string;
  dots?: boolean;
  speed?: number;
}) {
  const shape = side === "left" ? "left-0 rounded-r-[96px] sm:rounded-r-[160px]" : "right-0 rounded-l-[96px] sm:rounded-l-[160px]";
  return (
    <Parallax aria-hidden speed={speed} max={70} className={`absolute -z-10 ${shape} ${className}`} style={{ background: BLOCK_TONES[tone] }}>
      {dots && <div className="yt-dots absolute inset-0 rounded-[inherit] opacity-60" />}
    </Parallax>
  );
}

/** 內頁共用背景：每隔固定距離放一塊，右、左、右、左交錯；頁面越長露出越多塊 */
export function Backdrop() {
  const tones: BlockTone[] = ["mustard", "sage", "sky", "peach", "mint", "cream"];
  const blocks = Array.from({ length: 8 }, (_, i) => ({
    side: i % 2 === 0 ? "right" : "left",
    tone: tones[i % tones.length],
    top: -60 + i * 520,
    width: i % 2 === 0 ? "w-[46%] md:w-[34%]" : "w-[52%] md:w-[38%]",
    speed: [0.18, 0.1, 0.22, 0.12][i % 4],
  }));
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {blocks.map((b) => (
        <Parallax
          key={b.top}
          speed={b.speed}
          max={140}
          className={`absolute h-[300px] opacity-60 sm:h-[380px] ${b.width} ${b.side === "left" ? "left-0 rounded-r-[150px] sm:rounded-r-[190px]" : "right-0 rounded-l-[150px] sm:rounded-l-[190px]"}`}
          style={{ top: b.top, background: BLOCK_TONES[b.tone] }}
        />
      ))}
    </div>
  );
}

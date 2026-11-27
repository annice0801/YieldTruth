// 原創擬人動物角色（粗線條、扁平色）。表情隨燈號變化：green 開心、yellow 疑惑、red 驚嚇。
type Mood = "green" | "yellow" | "red";

const INK = "#1d1d1b";
const S = { stroke: INK, strokeWidth: 3.5, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

function Mouth({ mood, x, y }: { mood: Mood; x: number; y: number }) {
  if (mood === "green") return <path d={`M${x - 9} ${y} Q${x} ${y + 10} ${x + 9} ${y}`} fill="none" {...S} />;
  if (mood === "yellow") return <path d={`M${x - 8} ${y + 3} q4 -5 8 0 t8 0`} fill="none" {...S} />;
  return <ellipse cx={x} cy={y + 3} rx={5} ry={7} fill={INK} />;
}

function Eyes({ mood, lx, rx, y }: { mood: Mood; lx: number; rx: number; y: number }) {
  if (mood === "green")
    return (
      <>
        <path d={`M${lx - 5} ${y + 2} q5 -7 10 0`} fill="none" {...S} />
        <path d={`M${rx - 5} ${y + 2} q5 -7 10 0`} fill="none" {...S} />
      </>
    );
  const r = mood === "red" ? 5.5 : 4;
  return (
    <>
      <circle cx={lx} cy={y} r={r} fill="#fff" {...S} strokeWidth={3} />
      <circle cx={lx + 1} cy={y + 1} r={2} fill={INK} />
      <circle cx={rx} cy={y} r={r} fill="#fff" {...S} strokeWidth={3} />
      <circle cx={rx + 1} cy={y + 1} r={2} fill={INK} />
    </>
  );
}

/** 阿柴：戴藍色棒球帽的柴犬，穿黃色上衣 */
export function Dog({ mood, className = "" }: { mood: Mood; className?: string }) {
  return (
    <svg viewBox="0 0 170 230" className={className} aria-hidden>
      {/* 身體 */}
      <path d="M40 228 L46 150 Q85 128 124 150 L130 228 Z" fill="#f5c93b" {...S} />
      <path d="M62 150 L85 176 L108 150" fill="none" {...S} />
      {/* 手臂 */}
      <path d={mood === "red" ? "M46 160 Q22 140 26 112" : "M46 160 Q26 186 40 206"} fill="none" {...S} strokeWidth={14} stroke={INK} />
      <path d={mood === "red" ? "M46 160 Q22 140 26 112" : "M46 160 Q26 186 40 206"} fill="none" stroke="#f5c93b" strokeWidth={8} strokeLinecap="round" />
      {/* 耳朵 */}
      <path d="M44 62 L40 22 L74 44 Z" fill="#d9822b" {...S} />
      <path d="M126 62 L130 22 L96 44 Z" fill="#d9822b" {...S} />
      {/* 頭 */}
      <ellipse cx={85} cy={92} rx={50} ry={46} fill="#e8913a" {...S} />
      <ellipse cx={85} cy={112} rx={30} ry={22} fill="#fff4e0" {...S} strokeWidth={3} />
      {/* 帽子 */}
      <path d="M38 70 Q85 18 132 70 Z" fill="#3b78c9" {...S} />
      <path d="M118 66 Q150 64 156 76 Q136 80 118 74 Z" fill="#3b78c9" {...S} />
      <Eyes mood={mood} lx={68} rx={102} y={88} />
      <ellipse cx={85} cy={103} rx={7} ry={5} fill={INK} />
      <Mouth mood={mood} x={85} y={116} />
      {mood === "yellow" && <path d="M134 84 q6 10 0 16 q-6 -6 0 -16" fill="#8fd3f4" {...S} strokeWidth={2.5} />}
      {mood === "green" && (
        <>
          <ellipse cx={58} cy={108} rx={7} ry={4} fill="#f49c9c" />
          <ellipse cx={112} cy={108} rx={7} ry={4} fill="#f49c9c" />
        </>
      )}
    </svg>
  );
}

/** 白白：白色貓咪，穿綠色背心 */
export function Cat({ mood, className = "" }: { mood: Mood; className?: string }) {
  return (
    <svg viewBox="0 0 170 230" className={className} aria-hidden>
      <path d="M38 228 L44 152 Q85 130 126 152 L132 228 Z" fill="#2f8f6c" {...S} />
      <circle cx={85} cy={186} r={5} fill="#f5c93b" {...S} strokeWidth={2.5} />
      <path d={mood === "red" ? "M126 160 Q150 136 142 108" : "M126 160 Q146 186 132 206"} fill="none" stroke={INK} strokeWidth={14} strokeLinecap="round" />
      <path d={mood === "red" ? "M126 160 Q150 136 142 108" : "M126 160 Q146 186 132 206"} fill="none" stroke="#2f8f6c" strokeWidth={8} strokeLinecap="round" />
      {/* 耳朵 */}
      <path d="M40 70 L46 24 L78 52 Z" fill="#fff" {...S} />
      <path d="M130 70 L124 24 L92 52 Z" fill="#fff" {...S} />
      <path d="M50 56 L52 38 L64 50 Z" fill="#f7b3c2" />
      <path d="M120 56 L118 38 L106 50 Z" fill="#f7b3c2" />
      {/* 頭 */}
      <ellipse cx={85} cy={96} rx={52} ry={46} fill="#fff" {...S} />
      <Eyes mood={mood} lx={66} rx={104} y={92} />
      <path d="M80 104 L90 104 L85 110 Z" fill="#f08aa0" {...S} strokeWidth={2.5} />
      <Mouth mood={mood} x={85} y={116} />
      {/* 鬍鬚 */}
      <path d="M38 104 L58 108 M38 116 L58 114 M132 104 L112 108 M132 116 L112 114" {...S} strokeWidth={2.5} />
      {mood !== "red" && (
        <>
          <ellipse cx={56} cy={114} rx={7} ry={4} fill="#f7b3c2" />
          <ellipse cx={114} cy={114} rx={7} ry={4} fill="#f7b3c2" />
        </>
      )}
    </svg>
  );
}

/** 對話框 */
export function Bubble({ text, side = "left", className = "" }: { text: string; side?: "left" | "right"; className?: string }) {
  return (
    <div className={`relative inline-block rounded-[999px] border-[3px] border-[#1d1d1b] bg-white px-4 py-2 text-center font-[family-name:var(--font-huninn)] text-base leading-tight text-[#1d1d1b] shadow-[3px_3px_0_#1d1d1b] ${className}`}>
      {text}
      <span
        aria-hidden
        className={`absolute -bottom-[11px] size-4 rotate-45 border-b-[3px] border-r-[3px] border-[#1d1d1b] bg-white ${side === "left" ? "left-6" : "right-6"}`}
      />
    </div>
  );
}

export const LINES: Record<Mood, { dog: string; cat: string }> = {
  green: { dog: "HAPPY！", cat: "穩穩領～" },
  yellow: { dog: "HMM…", cat: "先看清楚再買" },
  red: { dog: "WOW!?", cat: "本金在縮水！" },
};

/** 慢慢龜：戴毛帽的烏龜，背著芥末黃龜殼 */
export function Turtle({ mood, className = "" }: { mood: Mood; className?: string }) {
  return (
    <svg viewBox="0 0 170 230" className={className} aria-hidden>
      {/* 龜殼（身體） */}
      <path d="M28 226 Q20 150 85 140 Q150 150 142 226 Z" fill="#f5c93b" {...S} />
      <path d="M56 226 L62 176 L85 164 L108 176 L114 226 M62 176 L36 196 M108 176 L134 196" fill="none" {...S} strokeWidth={3} />
      {/* 手 */}
      <path d={mood === "red" ? "M40 168 Q18 146 24 118" : "M40 170 Q22 190 34 208"} fill="none" stroke={INK} strokeWidth={14} strokeLinecap="round" />
      <path d={mood === "red" ? "M40 168 Q18 146 24 118" : "M40 170 Q22 190 34 208"} fill="none" stroke="#7cc49a" strokeWidth={8} strokeLinecap="round" />
      {/* 頭 */}
      <ellipse cx={85} cy={96} rx={46} ry={44} fill="#7cc49a" {...S} />
      {/* 毛帽 */}
      <path d="M42 80 Q85 22 128 80 Z" fill="#e5603f" {...S} />
      <path d="M40 82 Q85 70 130 82" fill="none" {...S} strokeWidth={8} stroke="#fff" />
      <path d="M40 82 Q85 70 130 82" fill="none" {...S} />
      <circle cx={85} cy={30} r={9} fill="#fff" {...S} />
      <Eyes mood={mood} lx={68} rx={102} y={100} />
      <Mouth mood={mood} x={85} y={118} />
      {mood !== "red" && (
        <>
          <ellipse cx={58} cy={116} rx={7} ry={4} fill="#f49c9c" />
          <ellipse cx={112} cy={116} rx={7} ry={4} fill="#f49c9c" />
        </>
      )}
    </svg>
  );
}

/** 跳跳兔：戴耳機的兔子，穿珊瑚紅外套 */
export function Rabbit({ mood, className = "" }: { mood: Mood; className?: string }) {
  return (
    <svg viewBox="0 0 170 230" className={className} aria-hidden>
      <path d="M40 228 L46 156 Q85 136 124 156 L130 228 Z" fill="#e5603f" {...S} />
      <path d="M85 150 L85 228" {...S} />
      <path d={mood === "red" ? "M124 164 Q150 140 144 110" : "M124 164 Q148 188 136 208"} fill="none" stroke={INK} strokeWidth={14} strokeLinecap="round" />
      <path d={mood === "red" ? "M124 164 Q150 140 144 110" : "M124 164 Q148 188 136 208"} fill="none" stroke="#e5603f" strokeWidth={8} strokeLinecap="round" />
      {/* 長耳朵 */}
      <ellipse cx={62} cy={36} rx={13} ry={36} fill="#fff" {...S} transform="rotate(-12 62 36)" />
      <ellipse cx={108} cy={36} rx={13} ry={36} fill="#fff" {...S} transform="rotate(12 108 36)" />
      <ellipse cx={62} cy={40} rx={5} ry={24} fill="#f7b3c2" transform="rotate(-12 62 40)" />
      <ellipse cx={108} cy={40} rx={5} ry={24} fill="#f7b3c2" transform="rotate(12 108 40)" />
      {/* 頭 */}
      <ellipse cx={85} cy={104} rx={48} ry={44} fill="#fff" {...S} />
      {/* 耳機 */}
      <path d="M38 100 Q38 52 85 52 Q132 52 132 100" fill="none" {...S} strokeWidth={6} />
      <rect x={28} y={92} width={16} height={26} rx={7} fill="#3b78c9" {...S} />
      <rect x={126} y={92} width={16} height={26} rx={7} fill="#3b78c9" {...S} />
      <Eyes mood={mood} lx={68} rx={102} y={102} />
      <path d="M80 114 L90 114 L85 120 Z" fill="#f08aa0" {...S} strokeWidth={2.5} />
      <Mouth mood={mood} x={85} y={124} />
    </svg>
  );
}

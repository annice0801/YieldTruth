// 頁首與頁尾共用的分頁清單和標誌。
// 放在沒有 "use client" 的檔案，伺服器元件（頁尾）和客戶端元件（頁首）都能匯入。

export const NAV_LINKS = [
  { href: "/check", label: "下單前體檢" },
  { href: "/calculator", label: "含息報酬試算" },
  { href: "/etf", label: "ETF 配息觀察" },
  { href: "/quiz", label: "命定 ETF 測驗" },
] as const;

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-[family-name:var(--font-huninn)] ${className}`}>
      <span aria-hidden className="relative inline-flex size-7 items-center justify-center rounded-full border-2 border-zinc-900 bg-[#f5c93b]">
        <span className="size-2.5 rounded-full border-2 border-zinc-900 bg-white" />
      </span>
      YieldTruth
    </span>
  );
}

import type { Metadata } from "next";
import { Chiron_GoRound_TC, Huninn } from "next/font/google";
import "./globals.css";
import SiteFooter from "./SiteFooter";
import SiteNav from "./SiteNav";

// 中文字型檔很大，不預載，交給瀏覽器依 unicode-range 分段下載
const huninn = Huninn({ weight: "400", variable: "--font-huninn", preload: false, display: "swap" });
const goRound = Chiron_GoRound_TC({ variable: "--font-goround", preload: false, display: "swap" });

export const metadata: Metadata = {
  title: "YieldTruth｜高殖利率，實際賺多少？",
  description: "用真實歷史股價算出 ETF 含息總報酬與本金侵蝕率",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-Hant" className={`${huninn.variable} ${goRound.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteNav />
        {children}
        <SiteFooter />
        {/* 進場提醒測試中、等待開通：開通後在這裡掛回 <AlertWatcher />（src/app/AlertWatcher.tsx） */}
      </body>
    </html>
  );
}

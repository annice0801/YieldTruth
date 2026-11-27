import type { Metadata } from "next";
import { Suspense } from "react";
import { Backdrop } from "@/components/Blocks";
import CheckExperience from "./CheckExperience";

export const metadata: Metadata = {
  title: "下單前體檢｜YieldTruth",
  description: "點一檔 ETF，3 秒看懂紅黃綠燈、配息來源與一年前買進的真實報酬",
};

export default function CheckPage() {
  return (
    <div className="relative isolate flex-1">
      <Backdrop />
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
      {/* 內容依「今天」推算買進日期，需在請求時才渲染 */}
      <Suspense fallback={<div className="h-[720px] animate-pulse rounded-[48px] bg-[#f3eddc]" />}>
        <CheckExperience />
      </Suspense>
    </main>
    </div>
  );
}

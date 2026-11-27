import type { Metadata } from "next";
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
      <CheckExperience />
    </main>
    </div>
  );
}

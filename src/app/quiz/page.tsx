import type { Metadata } from "next";
import { Backdrop } from "@/components/Blocks";
import QuizExperience from "./QuizExperience";

export const metadata: Metadata = {
  title: "命定 ETF 角色配對｜YieldTruth",
  description: "5 題生活情境，配對最適合你的 ETF 類型，附專屬地雷卡",
};

export default function QuizPage() {
  return (
    <div className="relative isolate flex-1">
      <Backdrop />
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <QuizExperience />
    </main>
    </div>
  );
}

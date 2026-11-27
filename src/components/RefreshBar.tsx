"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { SummaryMeta } from "@/lib/etfTable";

function ago(iso: string, now: number) {
  const m = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (m < 1) return "剛剛";
  if (m < 60) return `${m} 分鐘前`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} 小時前`;
  return `${Math.round(h / 24)} 天前`;
}

// 自己組字串（台灣沒有夏令時間，直接 +8 小時），避免伺服器與瀏覽器的日期格式不同造成 hydration 錯誤
const fmt = (iso: string) => {
  const d = new Date(Date.parse(iso) + 8 * 3_600_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
};

/** 資料更新時間＋「取得最新資料」按鈕：按下才向證交所更新，結果存進資料庫供所有人使用 */
export default function RefreshBar({ meta }: { meta: SummaryMeta }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 「幾分鐘前」只能在瀏覽器端依當下時間計算
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  async function refresh() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/etf/refresh", { method: "POST" });
      const data = await res.json();
      setMsg({ text: data.message, ok: res.ok });
      if (data.status === "updated") startTransition(() => router.refresh());
    } catch {
      setMsg({ text: "連線失敗，請稍後再試", ok: false });
    } finally {
      setBusy(false);
    }
  }

  const loading = busy || pending;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white/80 px-4 py-3 shadow-[0_10px_28px_-18px_rgba(29,29,27,0.35)] backdrop-blur">
      <p className="text-sm">
        <span className="mr-1.5 inline-block size-2 rounded-full bg-[var(--sage)] align-middle" aria-hidden />
        {meta ? (
          <>
            資料更新於 <span className="font-bold tabular-nums">{fmt(meta.updatedAt)}</span>
            {now !== null && <span className="text-zinc-500">（{ago(meta.updatedAt, now)}，由{meta.by}更新）</span>}
          </>
        ) : (
          "尚未建立資料"
        )}
        <span className="mt-0.5 block text-xs text-zinc-500">開頁只讀資料庫；按「取得最新資料」才向證交所更新成交價與配息，更新後所有人都會看到。</span>
      </p>
      <div className="flex w-full flex-col gap-1 sm:w-auto sm:items-end">
        <button onClick={refresh} disabled={loading} className="yt-btn w-full !px-4 !py-2 text-sm sm:w-auto">
          {loading ? "向證交所取得中…" : "取得最新資料"}
        </button>
        {msg && (
          <span role="status" className={`text-xs ${msg.ok ? "text-[var(--sage)]" : "text-[var(--coral)]"}`}>
            {msg.text}
          </span>
        )}
      </div>
    </div>
  );
}

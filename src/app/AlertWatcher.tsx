"use client";

import { useEffect, useState } from "react";

type Triggered = { id: string; code: string; name: string; results: { label: string; met: boolean; now: string }[] };

const POLL_MS = 60_000;

/** 台北時間平日 09:00–13:35 才檢查 */
function inTradingHours() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Taipei", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  if (["Sat", "Sun"].includes(get("weekday"))) return false;
  const hm = `${get("hour")}:${get("minute")}`;
  return hm >= "09:00" && hm <= "13:35";
}

/** 全站常駐：開著任一 YieldTruth 分頁時，盤中每分鐘檢查進場提醒 */
export default function AlertWatcher() {
  const [toasts, setToasts] = useState<Triggered[]>([]);

  useEffect(() => {
    let stopped = false;
    async function check() {
      if (stopped || !inTradingHours()) return;
      try {
        const res = await fetch("/api/alerts/check");
        const all = (await res.json()) as (Triggered & { newlyTriggered: boolean })[];
        const fresh = all.filter((a) => a.newlyTriggered);
        if (fresh.length === 0) return;
        setToasts((t) => [...t, ...fresh]);
        for (const a of fresh) {
          const met = a.results.filter((r) => r.met).map((r) => `${r.label}（${r.now}）`).join("、");
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(`${a.code} 進場條件成立`, { body: met });
          }
        }
      } catch {
        // 下一輪再試
      }
    }
    check();
    const t = setInterval(check, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(t);
    };
  }, []);

  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 w-[min(22rem,calc(100vw-2rem))] space-y-2" role="status">
      {toasts.map((a) => (
        <div key={a.id} className="yt-pop rounded-2xl border-[3px] border-[#1d1d1b] bg-[#fff1b8] p-3 text-sm text-[#1d1d1b] shadow-[4px_4px_0_#1d1d1b]">
          <div className="flex items-start justify-between gap-2">
            <p className="font-bold">
              🔔 {a.code} {a.name} 進場條件成立
            </p>
            <button onClick={() => setToasts((t) => t.filter((x) => x.id !== a.id))} aria-label="關閉" className="text-lg leading-none">
              ×
            </button>
          </div>
          <ul className="mt-1 text-xs">
            {a.results
              .filter((r) => r.met)
              .map((r) => (
                <li key={r.label}>
                  ✓ {r.label}：{r.now}
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

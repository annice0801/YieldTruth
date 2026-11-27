// 免費版與付費版的功能切分（規劃示範；目前個人使用，所有已完成功能都直接開放）。
// live：現在就能用的功能。

export type Tier = { feature: string; free: string; paid: string; live?: boolean };

export const TIERS: Tier[] = [
  { feature: "單期配息（金額、除息日、標題殖利率）", free: "✓", paid: "✓", live: true },
  { feature: "含息總報酬試算", free: "單檔、近 1／3 年、不含稅", paid: "自訂期間、含稅與健保、多檔比較", live: true },
  { feature: "本金侵蝕率", free: "✓", paid: "✓", live: true },
  { feature: "填息天數", free: "本期是否已填息", paid: "歷史統計、慣性貼息標記、進度條", live: true },
  { feature: "配息來源健康度", free: "只有燈號", paid: "分數、來源結構、近 8 期趨勢", live: true },
  { feature: "貼息預警推播／除息前搶息預警", free: "—", paid: "✓" },
  { feature: "進場時機提醒（溢價收斂、貼息、回測月線、到價）", free: "—", paid: "測試中，等待開通" },
  { feature: "追蹤清單", free: "3 檔", paid: "無上限" },
];

export const TIER_PRINCIPLE = "紅燈不藏在付費牆後。免費版一定看得到風險訊號，付費版提供原因拆解、歷史紀錄與主動推播。";

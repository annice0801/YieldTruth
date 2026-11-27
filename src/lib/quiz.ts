// 命定 ETF 角色配對：5 題生活情境 → 4 個投資屬性 → 角色（ETF 類型）＋專屬地雷卡。
// 配對的是 ETF「類型」；代號只是常見代表，不是推薦標的。

export type Trait = "risk" | "horizon" | "cash" | "fomo";
export type Scores = Record<Trait, number>;

export type Question = {
  id: string;
  scene: string; // 情境插話
  text: string;
  options: { label: string; effect: Partial<Scores> }[];
};

export const QUESTIONS: Question[] = [
  {
    id: "drop",
    scene: "某天早上打開 App……",
    text: "這個月帳面突然跌了 15%，你會？",
    options: [
      { label: "關掉 App 去睡覺，反正是長期的", effect: { risk: 2 } },
      { label: "有點煩，但生活照常", effect: { risk: 1 } },
      { label: "焦慮到睡不著，想全部賣掉", effect: { risk: -2 } },
      { label: "打折了！趁機加碼", effect: { risk: 2, fomo: -1 } },
    ],
  },
  {
    id: "horizon",
    scene: "想想這筆錢的用途……",
    text: "這筆錢 5 年內動得到嗎？",
    options: [
      { label: "完全不會動，放著讓它滾", effect: { horizon: 2 } },
      { label: "3–5 年後可能買房、結婚會用到", effect: { horizon: 0, risk: -1 } },
      { label: "1–2 年內就要用", effect: { horizon: -3 } },
    ],
  },
  {
    id: "cash",
    scene: "如果每個月多一筆錢入帳……",
    text: "你最想拿它來？",
    options: [
      { label: "貼補生活費、繳房租", effect: { cash: 2 } },
      { label: "一半花掉、一半存起來", effect: { cash: 1 } },
      { label: "全部存起來繼續滾", effect: { cash: -1, horizon: 1 } },
    ],
  },
  {
    id: "fomo",
    scene: "群組裡朋友傳來截圖……",
    text: "「這檔 ETF 一個月漲 30%！」你會？",
    options: [
      { label: "馬上跟，晚了就來不及", effect: { fomo: 2 } },
      { label: "先查查看它在漲什麼", effect: { fomo: 0 } },
      { label: "沒興趣，照自己的計畫走", effect: { fomo: -1 } },
    ],
  },
  {
    id: "habit",
    scene: "最後一題，看看你的日常……",
    text: "哪個最像你的理財習慣？",
    options: [
      { label: "設好定期定額就忘了它", effect: { risk: 1, horizon: 1, fomo: -1 } },
      { label: "每天看盤好幾次", effect: { fomo: 1 } },
      { label: "最愛每個月看到錢進帳的感覺", effect: { cash: 2 } },
      { label: "穩穩的就好，不要大起大落", effect: { risk: -1 } },
    ],
  },
];

export type PersonaKey = "turtle" | "shiba" | "cat" | "rabbit";

export type Persona = {
  key: PersonaKey;
  animal: "Turtle" | "Dog" | "Cat" | "Rabbit";
  name: string;
  title: string; // 角色稱號
  tagline: string;
  traits: string[];
  etfType: string;
  why: string;
  examples: { code: string; name: string; otc?: boolean }[]; // otc：上櫃，體檢暫不支援
};

export const PERSONAS: Record<PersonaKey, Persona> = {
  turtle: {
    key: "turtle",
    animal: "Turtle",
    name: "慢慢龜",
    title: "佛系長跑型",
    tagline: "跌了就睡、漲了也睡，時間是你最好的朋友。",
    traits: ["跌 15% 也睡得著", "錢可以放 5 年以上", "不追熱門、不太看盤"],
    etfType: "市值型 ETF",
    why: "買進整個台股大型公司，不挑題材、費用低，最適合「放著讓時間複利」的人。",
    examples: [
      { code: "0050", name: "元大台灣50" },
      { code: "006208", name: "富邦台50" },
    ],
  },
  shiba: {
    key: "shiba",
    animal: "Dog",
    name: "阿柴",
    title: "月領生活型",
    tagline: "每個月有錢進帳最安心，但要先確認那是真的賺來的。",
    traits: ["喜歡看到配息入帳", "想用配息貼補生活", "能接受一些股價波動"],
    etfType: "高股息 ETF",
    why: "定期配息符合你的現金流需求；但高配息常來自資本利得，買前一定要看配息來源和填息紀錄。",
    examples: [
      { code: "0056", name: "元大高股息" },
      { code: "00878", name: "國泰永續高股息" },
    ],
  },
  cat: {
    key: "cat",
    animal: "Cat",
    name: "白白",
    title: "安心窩居型",
    tagline: "睡得好比賺得多重要，這筆錢要隨時拿得回來。",
    traits: ["帳面下跌會很焦慮", "錢可能幾年內就要用", "偏好穩定、少波動"],
    etfType: "短天期債券 ETF",
    why: "價格波動小、利率變動影響有限，適合短期內要用、或跌了會睡不著的錢。1 年內要用的錢，定存也是好選擇。",
    examples: [
      { code: "00719B", name: "元大美債1-3", otc: true },
      { code: "00720B", name: "元大投資級公司債", otc: true },
    ],
  },
  rabbit: {
    key: "rabbit",
    animal: "Rabbit",
    name: "跳跳兔",
    title: "衝刺成長型",
    tagline: "勇於追求成長，但記得：核心要穩，衝刺只用小錢。",
    traits: ["能承受大起大落", "錢放得夠久", "對新趨勢很有興趣"],
    etfType: "市值型為核心＋科技型為衛星",
    why: "七到八成放市值型當底，再用一小部分參與科技成長；別讓整筆錢都押在單一題材上。",
    examples: [
      { code: "0050", name: "元大台灣50" },
      { code: "0052", name: "富邦科技" },
    ],
  },
};

export type Mine = { title: string; why: string; link?: { href: string; label: string } };

/** 依答案組出專屬地雷卡（2–3 張） */
export function minesFor(s: Scores): Mine[] {
  const all: { when: boolean; mine: Mine }[] = [
    {
      when: s.fomo >= 1 || s.risk <= 0,
      mine: { title: "槓桿型 ETF（正 2、反 1）", why: "每日重設倍數，盤整就會耗損；跌 50% 要漲 100% 才回本，不適合長抱。" },
    },
    {
      when: s.risk <= 0 || s.fomo >= 2,
      mine: { title: "高波動主題型 ETF", why: "AI、電動車、單一產業主題常一年漲跌 30% 以上，熱度退了可能很久回不來。" },
    },
    {
      when: s.cash >= 1,
      mine: {
        title: "只看「年化殖利率」的月配 ETF",
        why: "配息高不等於賺得多；沒填息的配息等於拿回自己的本金。",
        link: { href: "/check", label: "先去體檢配息來源" },
      },
    },
    {
      when: s.horizon <= 0,
      mine: { title: "長天期美債 ETF（20 年以上）", why: "名字有「債」但不保守：利率一升，價格可能一年跌 10%–20%，短期要用的錢別放這裡。" },
    },
    {
      when: s.fomo >= 1,
      mine: { title: "剛上市、正熱門的 ETF", why: "溢價超過 1% 別追；像首次配息 0 元的 00403A，熱度和報酬不一定成正比。" },
    },
  ];
  const picked = all.filter((m) => m.when).map((m) => m.mine);
  // 至少給兩張：補上最普遍的地雷
  for (const fallback of [all[0].mine, all[1].mine]) {
    if (picked.length >= 2) break;
    if (!picked.includes(fallback)) picked.push(fallback);
  }
  return picked.slice(0, 3);
}

export function score(answers: number[]): Scores {
  const s: Scores = { risk: 0, horizon: 0, cash: 0, fomo: 0 };
  answers.forEach((a, i) => {
    const eff = QUESTIONS[i].options[a]?.effect ?? {};
    for (const k of Object.keys(eff) as Trait[]) s[k] += eff[k] ?? 0;
  });
  return s;
}

/** 回傳主角色，以及分數接近的第二角色（最多 2 種 ETF 類型） */
export function match(s: Scores): { primary: Persona; secondary: Persona | null } {
  // 1–2 年內要用的錢，不該放股票型 ETF
  if (s.horizon <= -3) return { primary: PERSONAS.cat, secondary: null };

  const fit: Record<PersonaKey, number> = {
    turtle: s.risk + s.horizon - s.cash * 0.5 - Math.max(0, s.fomo),
    shiba: s.cash * 1.2 + (s.horizon >= 0 ? 0.5 : -2) + (s.risk >= 0 ? 0.5 : -1),
    cat: -s.risk - s.horizon + (s.cash > 0 ? 0.5 : 0),
    rabbit: s.risk + s.horizon + s.fomo - s.cash - 1,
  };
  const ranked = (Object.keys(fit) as PersonaKey[]).sort((a, b) => fit[b] - fit[a]);
  const [top, second] = ranked;
  const close = fit[top] - fit[second] <= 1.5;
  // 兔子的第二類型與烏龜重疊（都含市值型），不重複列出
  const redundant = (top === "rabbit" && second === "turtle") || (top === "turtle" && second === "rabbit");
  return { primary: PERSONAS[top], secondary: close && !redundant ? PERSONAS[second] : null };
}

export const TRAIT_LABELS: Record<Trait, { name: string; low: string; high: string; min: number; max: number }> = {
  risk: { name: "抗跌力", low: "怕跌", high: "跌了也睡得著", min: -3, max: 5 },
  horizon: { name: "資金耐心", low: "很快要用", high: "放很久", min: -3, max: 4 },
  cash: { name: "現金流需求", low: "不需要", high: "每月要用", min: -1, max: 4 },
  fomo: { name: "跟風指數", low: "很淡定", high: "容易心動", min: -3, max: 3 },
};

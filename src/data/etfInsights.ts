// ETF 配息觀察：整理自公開報導（2026-11-26 整理）。
// 這些是媒體與投信期前公告的數字，不是正式收益分配通知書；每一筆都附來源與期別。
// 配息金額與除息日已用證交所除權除息計算結果表（TWT49U）交叉核對。

export type Composition = {
  dividendIncome: number | null; // 股利所得 %
  capitalGain: number | null; // 已實現資本利得 %
  equalization: number | null; // 收益平準金 %
  other?: number; // 報導未細分的部分 %
  period: string; // 對應期別
  basis: "期前預估" | "報導引述" | "期別未明";
};

export type Source = { title: string; url: string };

export type EtfInsight = {
  code: string;
  name: string;
  kind: "被動高股息" | "主動式";
  frequency: string;
  holders?: { count: number; rank?: number; asOf: string };
  latest: { label: string; cash: number | null; exDate?: string; payDate?: string };
  composition: Composition | null;
  reserves?: { equalizationPerUnit?: number; capitalEqualizationPerUnit?: number; asOf: string };
  highlights: string[];
  sources: Source[];
};

export const ETF_INSIGHTS: EtfInsight[] = [
  {
    code: "00878",
    name: "國泰永續高股息",
    kind: "被動高股息",
    frequency: "季配",
    holders: { count: 1_805_822, rank: 3, asOf: "2026-11-20" },
    latest: { label: "2026 第 4 季", cash: 1.25, exDate: "2026-11-17", payDate: "2026-12-11" },
    composition: {
      dividendIncome: 8,
      capitalGain: 92,
      equalization: 0,
      period: "2026 年 11 月除息",
      basis: "報導引述",
    },
    reserves: { equalizationPerUnit: 1.21, capitalEqualizationPerUnit: 18.6, asOf: "2026-10-30" },
    highlights: [
      "1.25 元創新高，但約九成來自已實現資本利得，股利所得只占約 8%，本期沒有動用收益平準金。",
      "上一季（2026 第 3 季）組成也相同：資本利得約 90%、股利約 10%。",
      "收益平準金帳上餘額約 1.2 元，已低於單季配息 1.25 元；高配息能否延續，取決於持股能否繼續實現獲利。",
    ],
    sources: [
      { title: "旺得富：00878 配息 1.25 元確定、組成與補充保費", url: "https://wantrich.chinatimes.com/news/20261113900008-420401" },
      { title: "Yahoo 新聞：國民 ETF 00878 配息 1.25 元新高", url: "https://tw.stock.yahoo.com/news/%E8%B6%85171%E8%90%AC%E8%82%A1%E6%B0%91%E9%A0%90%E6%9C%9F%EF%BC%81%E5%9C%8B%E6%B0%91etf-00878%E9%85%8D%E6%81%AF125%E5%85%83%E6%96%B0%E9%AB%98-%E5%B9%B4%E6%81%AF%E7%8E%87%E9%A3%86%E7%A0%B414-094307394.html" },
      { title: "今周刊：00878 年化配息 15% 能撐多久？", url: "https://www.businesstoday.com.tw/article/category/183013/post/202611100028/" },
      { title: "新光證券：00878 配息 90% 來自價差？", url: "https://www.skis.com.tw/Report/education/KNW20261102-3.html" },
    ],
  },
  {
    code: "00929",
    name: "復華台灣科技優息",
    kind: "被動高股息",
    frequency: "月配",
    latest: { label: "2026 年 11 月", cash: 0.38, exDate: "2026-11-18", payDate: "2026-12-14" },
    composition: {
      dividendIncome: 0,
      capitalGain: 100,
      equalization: 0,
      period: "2026 年 11 月除息",
      basis: "期前預估",
    },
    reserves: { equalizationPerUnit: 1.15, capitalEqualizationPerUnit: 11.52, asOf: "2026-10-30" },
    highlights: [
      "配息從年初每月 0.1 元一路調高，7 月起連續五個月 0.38 元，媒體換算年化配息率約 16%。",
      "11 月這期期前預估組成 100% 為已實現資本利得。",
      "資本損益平準金每單位約 11.5 元，報導估算可再支應兩年以上的配息；但這筆錢來自過去的價差，不是持股股利。",
    ],
    sources: [
      { title: "Money101：00929 最新 0.38 元、除息日與組成", url: "https://www.money101.com.tw/blog/etf%E6%8E%A8%E8%96%A6-%E5%BE%A9%E8%8F%AF%E5%8F%B0%E7%81%A3%E7%A7%91%E6%8A%80%E5%84%AA%E6%81%AF00929-%E6%9C%88%E9%85%8D%E6%81%AF" },
      { title: "TVBS：00929 再配 0.38 元、官股力挺", url: "https://tech.tvbs.com.tw/money/4044764" },
      { title: "工商時報：00929 再度穩配息 16%", url: "https://www.ctee.com.tw/news/20261102701502-430403" },
      { title: "復華投信：00929 基金資訊", url: "https://www.fhtrust.com.tw/ETF/etf_detail/ETF21" },
    ],
  },
  {
    code: "00400A",
    name: "主動國泰動能高息",
    kind: "主動式",
    frequency: "月配",
    latest: { label: "2026 年 11 月", cash: 0.12, exDate: "2026-11-06", payDate: "2026-12-02" },
    composition: {
      dividendIncome: 17.97,
      capitalGain: 82.03,
      equalization: 0,
      period: "近期一期",
      basis: "期別未明",
    },
    reserves: { equalizationPerUnit: 0.08, capitalEqualizationPerUnit: 4.48, asOf: "報導當日" },
    highlights: [
      "7 月掛牌後連續配 0.12 元，但 12 月預估配息降為 0.06 元，首次減半（12/8 除息，預估值）。",
      "報導引述的組成：已實現資本利得約 82%、股利所得約 18%，沒有動用收益平準金。",
      "收益平準金每單位僅約 0.08 元，緩衝很薄；主動式 ETF 的配息會隨經理人操作與市況變動。",
    ],
    sources: [
      { title: "Yahoo 新聞：00400A 確定配息 0.12 元", url: "https://tw.news.yahoo.com/14%E8%90%AC%E8%82%A1%E6%B0%91%E6%B3%A8%E6%84%8F-00400a%E7%A2%BA%E5%AE%9A%E9%85%8D%E6%81%AF0-12%E5%85%83-11-6%E9%99%A4%E6%81%AF-095822681.html" },
      { title: "果仁家：00400A 12 月預估配息 0.06 元", url: "https://applealmondrealty.com/posts/55490" },
      { title: "國泰投信：00400A 產品頁", url: "https://www.cathaysite.com.tw/proj/activethdm/" },
    ],
  },
  {
    code: "00403A",
    name: "主動統一升級50",
    kind: "主動式",
    frequency: "季配（評價月：1、4、7、10 月底）",
    latest: { label: "首次收益評價（2026/10/31）", cash: 0 },
    composition: null,
    reserves: { equalizationPerUnit: 0.02, asOf: "2026-10-22" },
    highlights: [
      "約 79 萬人等待的首次配息確定為 0 元：統一投信評價後決定不分配，未分配收益併入下一期。",
      "淨值約 9.63 元，仍低於 10 元發行價；收益平準金每單位只有約 0.02 元，可分配收益有限。",
      "下次評價最快在 2027 年 1 月底，若配息，除息最快在 2027 年 2 月。",
    ],
    sources: [
      { title: "ETtoday：00403A 宣告不配息", url: "https://finance.ettoday.net/news/3264872" },
      { title: "數位時代：00403A 為何不配息、下次評價日", url: "https://www.bnext.com.tw/article/92841/00403a-first-dividend-2026-q4-zero-or-not" },
      { title: "新光證券：00403A 首次配息掛零", url: "https://www.skis.com.tw/Report/education/KNW20261103.html" },
      { title: "今周刊：00403A 首次配息「0 股息」2 種情境", url: "https://www.businesstoday.com.tw/article/category/183013/post/202610290031/" },
    ],
  },
  {
    code: "0056",
    name: "元大高股息",
    kind: "被動高股息",
    frequency: "季配",
    holders: { count: 1_815_090, rank: 2, asOf: "2026-11-20" },
    latest: { label: "2026 第 4 季", cash: 1.72, exDate: "2026-10-22" },
    composition: {
      dividendIncome: null,
      capitalGain: 82,
      equalization: null,
      other: 18,
      period: "2026 年 10 月除息",
      basis: "期前預估",
    },
    reserves: { equalizationPerUnit: 4.99, asOf: "2026-11-20" },
    highlights: [
      "1.72 元創新高，證交所揭露的預估組成約 82% 為已實現資本利得，其餘報導未細分。",
      "收益平準金餘額約 4.99 元，是幾檔大型高股息 ETF 中緩衝最厚的。",
    ],
    sources: [
      { title: "新光證券：0056、00878、00919 怎麼選", url: "https://www.skis.com.tw/Report/education/KNW20261102.html" },
      { title: "今周刊：0056 配 1.72 元", url: "https://www.businesstoday.com.tw/article/category/183013/post/202610150033/" },
    ],
  },
  {
    code: "00919",
    name: "群益台灣精選高息",
    kind: "被動高股息",
    frequency: "季配",
    holders: { count: 1_534_159, rank: 4, asOf: "2026-11-20" },
    latest: { label: "2026 第 3 季", cash: 1.1, exDate: "2026-09-16" },
    composition: {
      dividendIncome: 0,
      capitalGain: 100,
      equalization: 0,
      period: "2026 年 9 月除息",
      basis: "期前預估",
    },
    reserves: { equalizationPerUnit: 1.69, asOf: "2026-11-20" },
    highlights: [
      "最近一季 1.1 元，預估組成 100% 為已實現資本利得。",
      "12 月配息尚未公告，媒體推估落在 1.14–1.22 元，僅供參考。",
    ],
    sources: [
      { title: "新光證券：0056、00878、00919 怎麼選", url: "https://www.skis.com.tw/Report/education/KNW20261102.html" },
      { title: "今周刊：00919 新一季配息推估", url: "https://www.businesstoday.com.tw/article/category/183013/post/202611230032/" },
    ],
  },
];

export const HOLDER_RANKING = {
  asOf: "2026-11-20",
  note: "集保結算所每週公布的受益人數，證交所 ETF e添富同步揭露",
  rows: [
    { rank: 1, code: "0050", name: "元大台灣50", count: 4_038_137 },
    { rank: 2, code: "0056", name: "元大高股息", count: 1_815_090 },
    { rank: 3, code: "00878", name: "國泰永續高股息", count: 1_805_822 },
    { rank: 4, code: "00919", name: "群益台灣精選高息", count: 1_534_159 },
    { rank: 5, code: "00981A", name: "主動統一台股增長", count: 1_024_224 },
  ],
  sources: [
    { title: "鏡週刊：最受歡迎 10 大 ETF 出爐，0050 破 400 萬人", url: "https://www.mirrormedia.mg/external/setn_1944945" },
    { title: "果仁家：0050 受益人數突破 403 萬、單週增 8.1 萬人", url: "https://applealmondrealty.com/posts/55699" },
    { title: "證交所 ETF e添富", url: "https://www.twse.com.tw/zh/ETFortune/index" },
  ] as Source[],
};

export const TRENDS: { title: string; body: string; source: Source }[] = [
  {
    title: "市場越跌越買",
    body: "0050 外資大賣期間，受益人數單週仍增加約 8.1 萬人；另有 12 檔 ETF 受益人數逆勢成長超過三成。",
    source: { title: "新頭殼：12 檔 ETF 受益人數逆勢增逾 3 成", url: "https://newtalk.tw/news/view/2026-11-24/1073456" },
  },
  {
    title: "主動式 ETF 擠進人氣榜",
    body: "00981A 受益人數破百萬、排名第五；今年 2 月才上市的凱基台灣TOP50（009816）也在 11 月初首度突破百萬人次。",
    source: { title: "工商時報：這檔首躍百萬人次俱樂部", url: "https://www.ctee.com.tw/news/20261109701649-430403" },
  },
  {
    title: "高配息的主力是價差，不是股利",
    body: "2026 年多檔高股息 ETF 創配息新高，但組成多以已實現資本利得為主。這代表配息來自漲多後賣出的獲利；行情反轉時，這部分最先縮水。",
    source: { title: "今周刊：高股息 ETF 抗跌力差在哪", url: "https://www.businesstoday.com.tw/article/category/183013/post/202611180053/" },
  },
];

export const GLOSSARY: { term: string; desc: string }[] = [
  { term: "股利所得", desc: "成分股發放的現金股利，屬經常性收入，是最健康的配息來源。報稅時列為 54C 股利所得。" },
  { term: "已實現資本利得", desc: "基金賣出持股實現的價差獲利。確實是賺來的錢，但要靠行情，不一定每年都有。" },
  { term: "收益平準金", desc: "新投資人申購時，申購價中「已累積但尚未分配的收益」部分。用它配息，本質上是把新進投資人的錢分給舊投資人，避免每單位配息被稀釋。" },
  { term: "資本損益平準金", desc: "與收益平準金類似，但對應的是已累積的資本利得。多檔 ETF 用它作為未來配息的緩衝。" },
  { term: "平準金餘額 vs 本期動用比例", desc: "「帳上還有多少平準金」和「這期配息用了多少平準金」是兩件事，新聞常混用，閱讀時要分清楚。" },
  { term: "期前預估 vs 收益分配通知書", desc: "投信在除息前公告的組成是預估值；正式數字以發放後寄出的收益分配通知書為準。" },
];

// 預先回補常用 ETF 的歷史資料到 MongoDB，之後試算就不用等證交所。
// 用法：npm run backfill            （預設清單，回補 10 年）
//      npm run backfill -- 0050 006208   （指定代號）
// 每次請求間隔 1.5 秒，一檔 10 年約 4–6 分鐘；已存的資料不會重抓，中斷後重跑會接續。
import { closeDb, ensureDividends, ensurePrices, type SyncReport } from "../src/lib/sync";
import { todayTaipei } from "../src/lib/twse";

const DEFAULT_CODES = ["0056", "00878", "00919", "00929", "00940", "00713", "00915", "00918", "0050"];
const YEARS = 10;

async function main() {
  const codes = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_CODES;
  const today = todayTaipei();
  const from = `${Number(today.slice(0, 4)) - YEARS}${today.slice(4)}`;

  const report: SyncReport = { requests: 0 };
  console.log(`除息資料 ${from.slice(0, 4)} 年起…`);
  await ensureDividends(Number(from.slice(0, 4)) - 1, report);

  for (const code of codes) {
    const before = report.requests;
    const t = Date.now();
    try {
      await ensurePrices(code, from, report);
      console.log(`✓ ${code}：${report.requests - before} 次請求，${((Date.now() - t) / 1000).toFixed(0)} 秒`);
    } catch (e) {
      console.log(`✗ ${code}：${e instanceof Error ? e.message : e}`);
    }
  }
  console.log(`完成，共 ${report.requests} 次請求`);
}

main().finally(closeDb);

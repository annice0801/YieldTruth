import { connection } from "next/server";
import { evaluateAlerts } from "@/lib/alerts";

export async function GET() {
  await connection(); // 每次請求才查資料庫，建置時不執行
  return Response.json(await evaluateAlerts());
}

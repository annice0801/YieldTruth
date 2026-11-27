import { buildCheckCard } from "@/lib/checkCard";
import { TwseError } from "@/lib/twse";

export async function GET(request: Request) {
  const code = (new URL(request.url).searchParams.get("code") ?? "").trim().toUpperCase();
  if (!/^[0-9A-Z]{4,6}$/.test(code)) return Response.json({ error: "請輸入正確的證券代號" }, { status: 400 });
  try {
    return Response.json(await buildCheckCard(code));
  } catch (e) {
    const status = e instanceof TwseError ? 502 : 500;
    return Response.json({ error: e instanceof Error ? e.message : "體檢失敗" }, { status });
  }
}

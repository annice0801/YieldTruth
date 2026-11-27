import { connection } from "next/server";
import { createAlert, deleteAlert, listAlerts, type AlertConditions } from "@/lib/alerts";

export async function GET() {
  await connection(); // 每次請求才查資料庫，建置時不執行
  const alerts = await listAlerts();
  return Response.json(alerts.map((a) => ({ ...a, _id: a._id.toHexString() })));
}

export async function POST(request: Request) {
  const body = (await request.json()) as { code?: string; name?: string; mode?: string; conditions?: AlertConditions };
  const code = (body.code ?? "").trim().toUpperCase();
  if (!/^[0-9A-Z]{4,6}$/.test(code)) return Response.json({ error: "代號錯誤" }, { status: 400 });

  const k = body.conditions ?? {};
  const conditions: AlertConditions = {};
  if (typeof k.premiumMax === "number" && k.premiumMax >= -5 && k.premiumMax <= 5) conditions.premiumMax = k.premiumMax;
  if (k.exDiscount === true) conditions.exDiscount = true;
  if (k.ma20Touch === true) conditions.ma20Touch = true;
  if (typeof k.priceBelow === "number" && k.priceBelow > 0) conditions.priceBelow = k.priceBelow;
  if (Object.keys(conditions).length === 0) return Response.json({ error: "請至少勾選一個條件" }, { status: 400 });

  const id = await createAlert({ code, name: body.name ?? code, conditions, mode: body.mode === "all" ? "all" : "any" });
  return Response.json({ id: id.toHexString() });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f]{24}$/.test(id)) return Response.json({ error: "id 錯誤" }, { status: 400 });
  await deleteAlert(id);
  return Response.json({ ok: true });
}

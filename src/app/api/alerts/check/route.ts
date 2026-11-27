import { evaluateAlerts } from "@/lib/alerts";

export async function GET() {
  return Response.json(await evaluateAlerts());
}

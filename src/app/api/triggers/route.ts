import { NextResponse } from "next/server";

import { listTriggerDashboardRows } from "@/lib/triggers";

export async function GET() {
  const triggers = await listTriggerDashboardRows();
  return NextResponse.json({ triggers });
}

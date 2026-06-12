import { NextResponse } from "next/server";

import { clearInstagramAccount, getAppUrl } from "@/lib/instagram-auth";

export async function POST() {
  await clearInstagramAccount();
  return NextResponse.redirect(getAppUrl("/"), { status: 303 });
}

import { NextResponse } from "next/server";

import { clearInstagramAccount } from "@/lib/instagram-auth";

export async function POST(request: Request) {
  await clearInstagramAccount();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}

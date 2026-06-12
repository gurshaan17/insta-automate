import { randomUUID } from "node:crypto";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { buildInstagramLoginUrl, InstagramAuthError } from "@/lib/instagram-auth";

const OAUTH_STATE_COOKIE = "ig_oauth_state";

export async function GET() {
  try {
    const state = randomUUID();
    const loginUrl = buildInstagramLoginUrl(state);
    const cookieStore = await cookies();

    cookieStore.set(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 10,
    });

    return NextResponse.redirect(loginUrl);
  } catch (error) {
    const message =
      error instanceof InstagramAuthError
        ? error.message
        : "Unable to start the Instagram login flow.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

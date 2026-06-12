import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import {
  completeInstagramLogin,
  getAppUrl,
  InstagramAuthError,
} from "@/lib/instagram-auth";

const OAUTH_STATE_COOKIE = "ig_oauth_state";

function redirectWithError(message: string) {
  const url = getAppUrl("/");
  url.searchParams.set("authError", message);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(OAUTH_STATE_COOKIE)?.value;
  const returnedState = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  const errorReason = request.nextUrl.searchParams.get("error_description");

  cookieStore.delete(OAUTH_STATE_COOKIE);

  if (errorReason) {
    return redirectWithError(errorReason);
  }

  if (!code) {
    return redirectWithError("Instagram did not return an authorization code.");
  }

  if (!expectedState || !returnedState || expectedState !== returnedState) {
    return redirectWithError("The Instagram login state could not be verified.");
  }

  try {
    await completeInstagramLogin(code);

    const url = getAppUrl("/");
    url.searchParams.set("auth", "connected");
    return NextResponse.redirect(url);
  } catch (error) {
    const message =
      error instanceof InstagramAuthError
        ? error.message
        : "Instagram login failed while saving the connected account.";

    return redirectWithError(message);
  }
}

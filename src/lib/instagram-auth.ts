import "server-only";

import { setAccount, type InstagramAccount } from "@/lib/db";

const INSTAGRAM_OAUTH_URL = "https://www.instagram.com/oauth/authorize";
const INSTAGRAM_TOKEN_URL = "https://api.instagram.com/oauth/access_token";
const INSTAGRAM_GRAPH_BASE_URL = "https://graph.instagram.com";

const INSTAGRAM_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_comments",
  "instagram_business_manage_messages",
] as const;

type InstagramOAuthTokenResponse = {
  access_token?: string;
  token_type?: string;
  user_id?: number;
  error_type?: string;
  code?: number;
  error_message?: string;
};

type InstagramLongLivedTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: {
    message?: string;
    type?: string;
    code?: number;
  };
};

type InstagramProfileResponse = {
  user_id?: string;
  id?: string;
  username?: string;
  error?: {
    message?: string;
    type?: string;
    code?: number;
  };
};

export class InstagramAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InstagramAuthError";
  }
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new InstagramAuthError(`Missing required environment variable: ${name}`);
  }

  return value;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T;
  return payload;
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload !== "object" || payload === null) {
    return fallback;
  }

  if ("error_message" in payload && typeof payload.error_message === "string") {
    return payload.error_message;
  }

  if ("error" in payload && typeof payload.error === "object" && payload.error !== null) {
    const error = payload.error;

    if ("message" in error && typeof error.message === "string") {
      return error.message;
    }
  }

  return fallback;
}

export function getInstagramAuthConfig() {
  return {
    appId: getRequiredEnv("IG_APP_ID"),
    appSecret: getRequiredEnv("IG_APP_SECRET"),
    redirectUri: getRequiredEnv("IG_REDIRECT_URI"),
    baseUrl: getRequiredEnv("NEXT_PUBLIC_BASE_URL"),
  };
}

export function buildInstagramLoginUrl(state: string): string {
  const { appId, redirectUri } = getInstagramAuthConfig();
  const searchParams = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: INSTAGRAM_SCOPES.join(","),
    state,
    force_authentication: "1",
  });

  return `${INSTAGRAM_OAUTH_URL}?${searchParams.toString()}`;
}

async function exchangeCodeForShortLivedToken(code: string) {
  const { appId, appSecret, redirectUri } = getInstagramAuthConfig();

  const body = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  });

  const response = await fetch(INSTAGRAM_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const payload = await parseResponse<InstagramOAuthTokenResponse>(response);

  if (!response.ok || !payload.access_token) {
    throw new InstagramAuthError(
      getErrorMessage(payload, "Instagram did not return a short-lived access token."),
    );
  }

  return {
    accessToken: payload.access_token,
    userId: payload.user_id ? String(payload.user_id) : null,
  };
}

async function exchangeForLongLivedToken(shortLivedToken: string) {
  const { appSecret } = getInstagramAuthConfig();
  const url = new URL(`${INSTAGRAM_GRAPH_BASE_URL}/access_token`);

  url.searchParams.set("grant_type", "ig_exchange_token");
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("access_token", shortLivedToken);

  const response = await fetch(url, {
    method: "GET",
  });

  const payload = await parseResponse<InstagramLongLivedTokenResponse>(response);

  if (!response.ok || !payload.access_token || typeof payload.expires_in !== "number") {
    throw new InstagramAuthError(
      getErrorMessage(payload, "Instagram did not return a long-lived access token."),
    );
  }

  return payload;
}

export async function fetchInstagramProfile(accessToken: string): Promise<{
  userId: string;
  username: string | null;
}> {
  const url = new URL(`${INSTAGRAM_GRAPH_BASE_URL}/me`);
  url.searchParams.set("fields", "user_id,username");
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url, {
    method: "GET",
  });

  const payload = await parseResponse<InstagramProfileResponse>(response);

  if (!response.ok) {
    throw new InstagramAuthError(
      getErrorMessage(payload, "Instagram profile lookup failed."),
    );
  }

  const userId = payload.user_id ?? payload.id;

  if (!userId) {
    throw new InstagramAuthError("Instagram profile response did not include a user ID.");
  }

  return {
    userId,
    username: payload.username ?? null,
  };
}

export async function completeInstagramLogin(code: string): Promise<InstagramAccount> {
  const shortLivedToken = await exchangeCodeForShortLivedToken(code);
  const longLivedToken = await exchangeForLongLivedToken(shortLivedToken.accessToken);
  const profile = await fetchInstagramProfile(longLivedToken.access_token);

  const account: InstagramAccount = {
    userId: shortLivedToken.userId ?? profile.userId,
    username: profile.username,
    accessToken: longLivedToken.access_token,
    expiresAt: new Date(Date.now() + longLivedToken.expires_in * 1000).toISOString(),
  };

  await setAccount(account);
  return account;
}

export async function clearInstagramAccount() {
  await setAccount(null);
}


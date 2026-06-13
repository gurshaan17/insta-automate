import "server-only";

import { getAccount, type InstagramAccount } from "@/lib/db";
import { InstagramAuthError } from "@/lib/instagram-auth";

const INSTAGRAM_GRAPH_BASE_URL = "https://graph.instagram.com";

export type InstagramPost = {
  id: string;
  caption: string | null;
  mediaType: string;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  permalink: string | null;
};

type InstagramMediaResponse = {
  data?: Array<{
    id?: string;
    caption?: string;
    media_type?: string;
    media_url?: string;
    thumbnail_url?: string;
    permalink?: string;
  }>;
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
  };
};

export class InstagramPostsError extends Error {
  code: "NO_ACCOUNT" | "TOKEN_EXPIRED" | "API_ERROR";

  constructor(code: "NO_ACCOUNT" | "TOKEN_EXPIRED" | "API_ERROR", message: string) {
    super(message);
    this.name = "InstagramPostsError";
    this.code = code;
  }
}

function isExpired(account: InstagramAccount) {
  return new Date(account.expiresAt).getTime() <= Date.now();
}

function getApiErrorMessage(payload: InstagramMediaResponse, fallback: string) {
  return payload.error?.message ?? fallback;
}

function isTokenError(payload: InstagramMediaResponse) {
  const message = payload.error?.message?.toLowerCase() ?? "";
  const code = payload.error?.code;
  const subcode = payload.error?.error_subcode;

  return (
    code === 190 ||
    subcode === 463 ||
    message.includes("expired") ||
    message.includes("invalid oauth")
  );
}

function mapPost(
  media: NonNullable<InstagramMediaResponse["data"]>[number],
): InstagramPost | null {
  if (!media.id || !media.media_type) {
    return null;
  }

  return {
    id: media.id,
    caption: media.caption ?? null,
    mediaType: media.media_type,
    mediaUrl: media.media_url ?? null,
    thumbnailUrl: media.thumbnail_url ?? null,
    permalink: media.permalink ?? null,
  };
}

export async function fetchRecentInstagramPosts(): Promise<InstagramPost[]> {
  const account = await getAccount();

  if (!account) {
    throw new InstagramPostsError(
      "NO_ACCOUNT",
      "Connect an Instagram account before fetching recent posts.",
    );
  }

  if (isExpired(account)) {
    throw new InstagramPostsError(
      "TOKEN_EXPIRED",
      "The stored Instagram access token has expired. Please reconnect the account.",
    );
  }

  const url = new URL(`${INSTAGRAM_GRAPH_BASE_URL}/me/media`);
  url.searchParams.set(
    "fields",
    "id,caption,media_type,media_url,thumbnail_url,permalink",
  );
  url.searchParams.set("access_token", account.accessToken);

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
  });

  const payload = (await response.json()) as InstagramMediaResponse;

  if (!response.ok) {
    if (isTokenError(payload)) {
      throw new InstagramPostsError(
        "TOKEN_EXPIRED",
        "Instagram rejected the stored access token. Please reconnect the account.",
      );
    }

    throw new InstagramPostsError(
      "API_ERROR",
      getApiErrorMessage(payload, "Instagram media lookup failed."),
    );
  }

  return (payload.data ?? []).map(mapPost).filter((post): post is InstagramPost => post !== null);
}

export function toReconnectMessage(error: unknown) {
  if (
    error instanceof InstagramAuthError ||
    (error instanceof InstagramPostsError && error.code === "TOKEN_EXPIRED")
  ) {
    return error.message;
  }

  return null;
}

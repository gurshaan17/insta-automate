import "server-only";

import { getAccount, type TriggerLog } from "@/lib/db";
import { InstagramAuthError } from "@/lib/instagram-auth";
import type { InstagramCommentEvent } from "@/lib/instagram-webhooks";

const INSTAGRAM_GRAPH_BASE_URL = "https://graph.instagram.com";

type InstagramCommentsResponse = {
  data?: Array<{
    id?: string;
    text?: string;
    username?: string;
    from?: {
      id?: string;
      username?: string;
    };
    timestamp?: string;
  }>;
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
  };
};

export class InstagramCommentsError extends Error {
  code: "NO_ACCOUNT" | "TOKEN_EXPIRED" | "API_ERROR";

  constructor(code: "NO_ACCOUNT" | "TOKEN_EXPIRED" | "API_ERROR", message: string) {
    super(message);
    this.name = "InstagramCommentsError";
    this.code = code;
  }
}

function getApiErrorMessage(payload: InstagramCommentsResponse, fallback: string) {
  return payload.error?.message ?? fallback;
}

function isTokenError(payload: InstagramCommentsResponse) {
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

export async function fetchRecentCommentsForPost(postId: string) {
  const account = await getAccount();

  if (!account) {
    throw new InstagramCommentsError(
      "NO_ACCOUNT",
      "Connect an Instagram account before polling comments.",
    );
  }

  if (new Date(account.expiresAt).getTime() <= Date.now()) {
    throw new InstagramAuthError(
      "The stored Instagram access token has expired. Please reconnect the account.",
    );
  }

  const url = new URL(`${INSTAGRAM_GRAPH_BASE_URL}/${postId}/comments`);
  url.searchParams.set("fields", "id,text,from,username,timestamp");
  url.searchParams.set("access_token", account.accessToken);

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
  });

  const payload = (await response.json()) as InstagramCommentsResponse;

  if (!response.ok) {
    if (isTokenError(payload)) {
      throw new InstagramCommentsError(
        "TOKEN_EXPIRED",
        "Instagram rejected the stored access token while polling comments. Please reconnect the account.",
      );
    }

    throw new InstagramCommentsError(
      "API_ERROR",
      getApiErrorMessage(payload, "Instagram comment polling failed."),
    );
  }

  return (payload.data ?? [])
    .map((comment) => {
      if (!comment.id || typeof comment.text !== "string") {
        return null;
      }

      const commenterId =
        comment.from?.id ??
        comment.from?.username ??
        comment.username ??
        comment.id; // fallback: use comment id — sufficient for dedup per post

      if (!commenterId) {
        return null;
      }

      const event: InstagramCommentEvent = {
        commentId: comment.id,
        commentText: comment.text,
        postId,
        commenterId,
      };

      return event;
    })
    .filter((event): event is InstagramCommentEvent => event !== null);
}

export type TriggerDashboardRow = TriggerLog & {
  automationKeyword: string | null;
  automationTarget: string | "ALL" | null;
  automationMessage: string | null;
};

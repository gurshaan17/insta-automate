import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { InstagramAuthError } from "@/lib/instagram-auth";

export type InstagramCommentEvent = {
  commentId: string;
  commentText: string;
  postId: string;
  commenterId: string;
};

type InstagramWebhookPayload = {
  object?: string;
  entry?: Array<{
    changes?: Array<{
      field?: string;
      value?: {
        id?: string;
        text?: string;
        media?: {
          id?: string;
        };
        media_id?: string;
        from?: {
          id?: string;
        };
        from_id?: string;
      };
    }>;
  }>;
};

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new InstagramAuthError(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getInstagramWebhookVerifyToken() {
  return getRequiredEnv("IG_WEBHOOK_VERIFY_TOKEN");
}

export function verifyInstagramWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
) {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
    return false;
  }

  const appSecret = getRequiredEnv("IG_APP_SECRET");
  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const expectedBuffer = Buffer.from(`sha256=${expected}`);
  const actualBuffer = Buffer.from(signatureHeader);

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

function getCommentText(value: NonNullable<
  NonNullable<NonNullable<InstagramWebhookPayload["entry"]>[number]["changes"]>[number]["value"]
>) {
  return typeof value.text === "string" ? value.text : "";
}

function getCommentId(value: NonNullable<
  NonNullable<NonNullable<InstagramWebhookPayload["entry"]>[number]["changes"]>[number]["value"]
>) {
  return typeof value.id === "string" ? value.id : null;
}

function getPostId(value: NonNullable<
  NonNullable<NonNullable<InstagramWebhookPayload["entry"]>[number]["changes"]>[number]["value"]
>) {
  if (typeof value.media?.id === "string") {
    return value.media.id;
  }

  if (typeof value.media_id === "string") {
    return value.media_id;
  }

  return null;
}

function getCommenterId(value: NonNullable<
  NonNullable<NonNullable<InstagramWebhookPayload["entry"]>[number]["changes"]>[number]["value"]
>) {
  if (typeof value.from?.id === "string") {
    return value.from.id;
  }

  if (typeof value.from_id === "string") {
    return value.from_id;
  }

  return null;
}

export function parseInstagramCommentEvents(rawPayload: unknown) {
  const payload = rawPayload as InstagramWebhookPayload;
  const events: InstagramCommentEvent[] = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "comments" || !change.value) {
        continue;
      }

      const commentId = getCommentId(change.value);
      const postId = getPostId(change.value);
      const commenterId = getCommenterId(change.value);

      if (!commentId || !postId || !commenterId) {
        continue;
      }

      events.push({
        commentId,
        commentText: getCommentText(change.value),
        postId,
        commenterId,
      });
    }
  }

  return events;
}

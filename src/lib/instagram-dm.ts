import "server-only";

import { getAccount } from "@/lib/db";
import { InstagramAuthError } from "@/lib/instagram-auth";

const INSTAGRAM_GRAPH_BASE_URL = "https://graph.instagram.com";

type InstagramDmApiResponse = {
  message_id?: string;
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
  };
};

export class InstagramDmError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InstagramDmError";
  }
}

function getApiErrorMessage(payload: InstagramDmApiResponse, fallback: string) {
  return payload.error?.message ?? fallback;
}

export async function sendPrivateReplyDm(input: {
  commentId: string;
  message: string;
}) {
  const account = await getAccount();

  if (!account) {
    throw new InstagramDmError("Connect an Instagram account before sending private replies.");
  }

  if (new Date(account.expiresAt).getTime() <= Date.now()) {
    throw new InstagramAuthError(
      "The stored Instagram access token has expired. Please reconnect the account.",
    );
  }

  const url = new URL(`${INSTAGRAM_GRAPH_BASE_URL}/${account.userId}/messages`);

  // Instagram private replies to comments are time-limited.
  // If Meta rejects the request because the reply window elapsed, we store that API error
  // message in the trigger log so the dashboard can explain why the DM was not sent.
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({
      recipient: {
        comment_id: input.commentId,
      },
      message: {
        text: input.message,
      },
      access_token: account.accessToken,
    }),
  });

  const payload = (await response.json()) as InstagramDmApiResponse;

  if (!response.ok) {
    throw new InstagramDmError(
      getApiErrorMessage(payload, "Instagram rejected the private reply DM request."),
    );
  }

  return {
    messageId: payload.message_id ?? null,
  };
}

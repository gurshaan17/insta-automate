import { NextRequest, NextResponse } from "next/server";

import { processComment } from "@/lib/automation-engine";
import {
  getInstagramWebhookVerifyToken,
  parseInstagramCommentEvents,
  verifyInstagramWebhookSignature,
} from "@/lib/instagram-webhooks";

export const runtime = "nodejs";

// Meta webhook deliveries must reach a public HTTPS URL.
// For local development, point your webhook subscription at an ngrok or Cloudflare Tunnel URL.

export async function GET(request: NextRequest) {
  try {
    const mode = request.nextUrl.searchParams.get("hub.mode");
    const token = request.nextUrl.searchParams.get("hub.verify_token");
    const challenge = request.nextUrl.searchParams.get("hub.challenge");

    if (
      mode === "subscribe" &&
      token === getInstagramWebhookVerifyToken() &&
      challenge
    ) {
      return new Response(challenge, {
        status: 200,
        headers: {
          "Content-Type": "text/plain",
        },
      });
    }

    return NextResponse.json({ error: "Webhook verification failed." }, { status: 403 });
  } catch {
    return NextResponse.json(
      { error: "Webhook verification is not configured correctly." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-hub-signature-256");

    if (!verifyInstagramWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as unknown;
    const commentEvents = parseInstagramCommentEvents(payload);

    for (const event of commentEvents) {
      await processComment(event);
    }

    return new Response("EVENT_RECEIVED", {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Webhook payload could not be processed." },
      { status: 400 },
    );
  }
}

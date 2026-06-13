import { NextResponse } from "next/server";

import { processComment } from "@/lib/automation-engine";
import {
  fetchRecentCommentsForPost,
  InstagramCommentsError,
} from "@/lib/instagram-comments";
import { InstagramAuthError } from "@/lib/instagram-auth";
import { fetchRecentInstagramPosts } from "@/lib/instagram-posts";

export const runtime = "nodejs";

// Manual fallback for cases where Meta webhooks are not reachable from local development.
// Use your public HTTPS tunnel for webhooks first; fall back to this route only when needed.

export async function POST() {
  try {
    const posts = await fetchRecentInstagramPosts();
    const processed = [];

    for (const post of posts) {
      const comments = await fetchRecentCommentsForPost(post.id);

      for (const comment of comments) {
        const results = await processComment(comment);
        processed.push({
          postId: post.id,
          commentId: comment.commentId,
          commenterId: comment.commenterId,
          results,
        });
      }
    }

    return NextResponse.json({
      processed,
      checkedPosts: posts.length,
    });
  } catch (error) {
    const message =
      error instanceof InstagramCommentsError || error instanceof InstagramAuthError
        ? error.message
        : "Unable to poll Instagram comments.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

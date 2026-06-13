import { NextResponse } from "next/server";

import { fetchRecentInstagramPosts, InstagramPostsError } from "@/lib/instagram-posts";

export async function GET() {
  try {
    const posts = await fetchRecentInstagramPosts();
    return NextResponse.json({ posts });
  } catch (error) {
    if (error instanceof InstagramPostsError) {
      const status =
        error.code === "NO_ACCOUNT" ? 401 : error.code === "TOKEN_EXPIRED" ? 401 : 502;

      return NextResponse.json(
        {
          error: error.message,
          reconnect: error.code === "TOKEN_EXPIRED",
        },
        { status },
      );
    }

    return NextResponse.json(
      {
        error: "Unable to fetch Instagram posts.",
        reconnect: false,
      },
      { status: 500 },
    );
  }
}

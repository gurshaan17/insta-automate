import AutomationManager from "@/components/automation-manager";
import TriggerDashboard from "@/components/trigger-dashboard";
import { getAccount } from "@/lib/db";
import { listAutomations } from "@/lib/automations";
import {
  fetchRecentInstagramPosts,
  type InstagramPost,
  InstagramPostsError,
} from "@/lib/instagram-posts";
import { listTriggerDashboardRows } from "@/lib/triggers";

type HomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Home({ searchParams }: HomePageProps) {
  const account = await getAccount();
  const params = searchParams ? await searchParams : {};
  const authError = getSingleParam(params.authError);
  const authStatus = getSingleParam(params.auth);
  const isConnected = Boolean(account);
  const automations = await listAutomations();
  const triggers = await listTriggerDashboardRows();
  let posts: InstagramPost[] = [];
  let postsError: string | null = null;
  let needsReconnect = false;

  if (isConnected) {
    try {
      posts = await fetchRecentInstagramPosts();
    } catch (error) {
      if (error instanceof InstagramPostsError) {
        postsError = error.message;
        needsReconnect = error.code === "TOKEN_EXPIRED";
      } else {
        postsError = "Unable to fetch recent Instagram posts right now.";
      }
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7f4ec_0%,#efe8d8_100%)] px-6 py-10 text-stone-950">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <section className="rounded-3xl border border-stone-300/70 bg-white/90 p-8 shadow-[0_18px_60px_rgba(120,90,20,0.08)] backdrop-blur">
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-stone-950">
            Instagram Auto-DM Comment Responder
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-stone-700">
            Connect an Instagram Business or Creator account to start pulling
            posts and configuring keyword-driven DM automations in later phases.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            {isConnected ? (
              <form action="/api/auth/logout" method="post">
                <button
                  type="submit"
                  className="rounded-full bg-stone-950 px-5 py-3 text-sm font-medium text-stone-50 transition hover:bg-stone-800"
                >
                  Logout
                </button>
              </form>
            ) : (
              <a
                href="/api/auth/login"
                className="rounded-full bg-gray-300 px-5 py-3 text-sm font-medium text-stone-50 transition hover:bg-gray-400"
              >
                Login with Instagram
              </a>
            )}

            <p className="text-sm text-stone-600">
              Tokens stay server-side and are stored only in the local JSON database.
            </p>
          </div>

          {authStatus === "connected" ? (
            <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Instagram account connected successfully.
            </p>
          ) : null}

          {authError ? (
            <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {authError}
            </p>
          ) : null}

          {needsReconnect ? (
            <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Your Instagram token needs to be refreshed. Log out and reconnect
              to continue fetching posts.
            </p>
          ) : null}
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-stone-300/70 bg-stone-50 p-5">
            <p className="text-sm font-medium text-stone-500">Account</p>
            <h2 className="mt-3 text-lg font-semibold">
              {isConnected
                ? `Connected as @${account?.username ?? "unknown"}`
                : "Disconnected"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-700">
              {isConnected
                ? `Instagram user ID ${account?.userId} with a token expiring on ${new Date(account?.expiresAt ?? "").toLocaleString()}.`
                : "Use Instagram Login to authorize the account before fetching posts or building automations."}
            </p>
          </article>

          <article className="rounded-2xl border border-stone-300/70 bg-stone-50 p-5">
            <p className="text-sm font-medium text-stone-500">Recent Posts</p>
            <h2 className="mt-3 text-lg font-semibold">
              {isConnected ? `${posts.length} loaded` : "Connect to load posts"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-700">
              Number of recent posts will appear here.
            </p>
          </article>

          <article className="rounded-2xl border border-stone-300/70 bg-stone-50 p-5">
            <p className="text-sm font-medium text-stone-500">Trigger Logs</p>
            <h2 className="mt-3 text-lg font-semibold">
              {triggers.length} recorded
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-700">
              Sent and failed DM attempts are stored here, with a manual polling
              fallback when webhook delivery is unavailable.
            </p>
          </article>
        </section>

        <section className="rounded-3xl border border-stone-300/70 bg-white/85 p-6 shadow-[0_14px_40px_rgba(120,90,20,0.06)]">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-stone-500">
                Recent Posts
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-stone-950">
                Instagram media ready for targeting
              </h2>
            </div>
            <a
              href="/api/posts"
              className="text-sm font-medium text-stone-700 underline decoration-stone-400 underline-offset-4"
            >
              View raw `/api/posts` response
            </a>
          </div>

          {!isConnected ? (
            <p className="mt-6 rounded-2xl border border-stone-300 bg-stone-50 px-4 py-4 text-sm text-stone-700">
              Connect your Instagram account to fetch recent posts.
            </p>
          ) : null}

          {postsError ? (
            <p className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-800">
              {postsError}
            </p>
          ) : null}

          {isConnected && !postsError && posts.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-stone-300 bg-stone-50 px-4 py-4 text-sm text-stone-700">
              No recent posts were returned for this account yet.
            </p>
          ) : null}

          {posts.length > 0 ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {posts.map((post) => {
                const previewUrl = post.thumbnailUrl ?? post.mediaUrl;
                const captionSnippet = post.caption?.trim()
                  ? post.caption.trim().slice(0, 140)
                  : "No caption available.";

                return (
                  <article
                    key={post.id}
                    className="overflow-hidden rounded-2xl border border-stone-300/80 bg-stone-50"
                  >
                    <div className="aspect-4/3 bg-stone-200">
                      {previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={previewUrl}
                          alt={post.caption ?? `Instagram post ${post.id}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-stone-500">
                          No preview image
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <span className="rounded-full bg-stone-200 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-stone-700">
                          {post.mediaType}
                        </span>
                        {post.permalink ? (
                          <a
                            href={post.permalink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-medium text-stone-700 underline decoration-stone-400 underline-offset-4"
                          >
                            Open post
                          </a>
                        ) : null}
                      </div>

                      <p className="text-sm leading-6 text-stone-700">
                        {captionSnippet}
                        {post.caption && post.caption.trim().length > 140 ? "..." : ""}
                      </p>

                      <p className="font-mono text-xs text-stone-500">
                        Post ID: {post.id}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </section>

        <AutomationManager
          initialAutomations={automations}
          posts={posts}
          isConnected={isConnected}
        />

        <TriggerDashboard initialTriggers={triggers} isConnected={isConnected} />
      </div>
    </main>
  );
}

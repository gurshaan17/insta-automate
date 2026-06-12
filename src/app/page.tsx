import { getAccount } from "@/lib/db";

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

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7f4ec_0%,#efe8d8_100%)] px-6 py-10 text-stone-950">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <section className="rounded-3xl border border-stone-300/70 bg-white/90 p-8 shadow-[0_18px_60px_rgba(120,90,20,0.08)] backdrop-blur">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-stone-500">
            Phase 2 OAuth
          </p>
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
            <p className="text-sm font-medium text-stone-500">Automations</p>
            <h2 className="mt-3 text-lg font-semibold">0 configured</h2>
            <p className="mt-2 text-sm leading-6 text-stone-700">
              The automation CRUD flow will arrive in Phase 4 after posts can be
              fetched from the connected account.
            </p>
          </article>

          <article className="rounded-2xl border border-stone-300/70 bg-stone-50 p-5">
            <p className="text-sm font-medium text-stone-500">Trigger Logs</p>
            <h2 className="mt-3 text-lg font-semibold">No activity yet</h2>
            <p className="mt-2 text-sm leading-6 text-stone-700">
              Comment matches and DM send attempts will be recorded here once
              the webhook and messaging flow are in place.
            </p>
          </article>
        </section>

        <section className="rounded-3xl border border-dashed border-stone-400 bg-white/70 p-6">
          <h2 className="text-lg font-semibold text-stone-900">
            What&apos;s in Phase 2
          </h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-stone-700">
            <li>OAuth login route that redirects to Instagram with the required business messaging scopes.</li>
            <li>Callback exchange flow that stores the long-lived access token and connected account details in `data/db.json`.</li>
            <li>Logout action that clears the stored account without exposing tokens to the client.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}

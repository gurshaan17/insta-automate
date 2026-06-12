export default function Home() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7f4ec_0%,#efe8d8_100%)] px-6 py-10 text-stone-950">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <section className="rounded-3xl border border-stone-300/70 bg-white/90 p-8 shadow-[0_18px_60px_rgba(120,90,20,0.08)] backdrop-blur">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-stone-500">
            Phase 1 Scaffold
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-stone-950">
            Instagram Auto-DM Comment Responder
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-stone-700">
            The project shell and local JSON storage are ready. OAuth login,
            post syncing, automations, and trigger processing will be added in
            later phases.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-stone-300/70 bg-stone-50 p-5">
            <p className="text-sm font-medium text-stone-500">Account</p>
            <h2 className="mt-3 text-lg font-semibold">Disconnected</h2>
            <p className="mt-2 text-sm leading-6 text-stone-700">
              Phase 2 will add Instagram Login and persist the connected account
              in the local JSON store.
            </p>
          </article>

          <article className="rounded-2xl border border-stone-300/70 bg-stone-50 p-5">
            <p className="text-sm font-medium text-stone-500">Automations</p>
            <h2 className="mt-3 text-lg font-semibold">0 configured</h2>
            <p className="mt-2 text-sm leading-6 text-stone-700">
              Rules that map a keyword and target post to an outbound DM will
              live here in Phase 4.
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
            What&apos;s in the scaffold
          </h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-stone-700">
            <li>Typed local storage helpers for account, automations, and triggers.</li>
            <li>`data/db.json` seeded with the initial empty structure.</li>
            <li>A minimal homepage that reflects the project roadmap instead of the default starter screen.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}

"use client";

import { useState, useTransition, useEffect } from "react";

import type { TriggerDashboardRow } from "@/lib/instagram-comments";

type TriggerDashboardProps = {
  initialTriggers: TriggerDashboardRow[];
  isConnected: boolean;
};

type PollCommentsResponse = {
  error?: string;
};

function formatTarget(target: string | "ALL" | null, postId: string) {
  if (target === "ALL") {
    return "All posts";
  }

  return target ?? postId;
}

export default function TriggerDashboard({
  initialTriggers,
  isConnected,
}: TriggerDashboardProps) {
  const [triggers] = useState(initialTriggers);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [formattedTimestamps, setFormattedTimestamps] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      initialTriggers.map((t) => [String(t.id), new Date(t.timestamp).toISOString()]),
    ),
  );

  useEffect(() => {
    const map: Record<string, string> = {};
    for (const t of initialTriggers) {
      map[String(t.id)] = new Date(t.timestamp).toLocaleString();
    }
    setFormattedTimestamps(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handlePollNow() {
    setFeedback(null);
    setError(null);

    startTransition(async () => {
      const response = await fetch("/api/poll-comments", {
        method: "POST",
      });

      const payload = (await response.json()) as PollCommentsResponse;

      if (!response.ok) {
        setError(payload.error ?? "Unable to poll recent comments.");
        return;
      }

      setFeedback(
        "Polling completed. Refresh the page to load any new trigger log entries.",
      );
    });
  }

  return (
    <section className="rounded-3xl border border-stone-300/70 bg-white/85 p-6 shadow-[0_14px_40px_rgba(120,90,20,0.06)]">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-stone-500">
            Trigger Logs
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-stone-950">
            Delivery history and fallback polling
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="/api/triggers"
            className="text-sm font-medium text-stone-700 underline decoration-stone-400 underline-offset-4"
          >
            View raw `/api/triggers` response
          </a>
          <button
            type="button"
            onClick={handlePollNow}
            disabled={!isConnected || isPending}
            className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Checking..." : "Check now"}
          </button>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-stone-700">
        Webhooks are the primary delivery path. Use manual polling only when your public
        webhook endpoint is unavailable during development.
      </p>

      {feedback ? (
        <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {feedback}
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-stone-300/80">
        <table className="min-w-full divide-y divide-stone-300 text-sm">
          <thead className="bg-stone-100 text-left text-stone-600">
            <tr>
              <th className="px-4 py-3 font-medium">Timestamp</th>
              <th className="px-4 py-3 font-medium">Post</th>
              <th className="px-4 py-3 font-medium">Commenter</th>
              <th className="px-4 py-3 font-medium">Comment</th>
              <th className="px-4 py-3 font-medium">Keyword</th>
              <th className="px-4 py-3 font-medium">Automation</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 bg-white text-stone-700">
            {triggers.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-stone-500">
                  No trigger activity yet.
                </td>
              </tr>
            ) : (
              triggers.map((trigger) => (
                <tr key={trigger.id}>
                  <td className="px-4 py-4 align-top">
                    {formattedTimestamps[String(trigger.id)]}
                  </td>
                  <td className="px-4 py-4 align-top">{trigger.postId}</td>
                  <td className="px-4 py-4 align-top">{trigger.commenterId}</td>
                  <td className="px-4 py-4 align-top">{trigger.commentText}</td>
                  <td className="px-4 py-4 align-top">
                    {trigger.automationKeyword ?? "Unknown"}
                  </td>
                  <td className="px-4 py-4 align-top">
                    {formatTarget(trigger.automationTarget, trigger.postId)}
                  </td>
                  <td className="px-4 py-4 align-top">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] ${
                        trigger.status === "sent"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {trigger.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 align-top text-stone-600">
                    {trigger.reason ?? "Delivered successfully."}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

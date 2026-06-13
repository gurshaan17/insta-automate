"use client";

import { useEffect, useState, useTransition } from "react";

import type { Automation } from "@/lib/db";
import type { InstagramPost } from "@/lib/instagram-posts";

type AutomationManagerProps = {
  initialAutomations: Automation[];
  posts: InstagramPost[];
  isConnected: boolean;
};

type CreateAutomationResponse = {
  automation?: Automation;
  error?: string;
};

type DeleteAutomationResponse = {
  success?: boolean;
  error?: string;
};

function getPostLabel(post: InstagramPost) {
  const caption = post.caption?.trim();
  const snippet = caption ? caption.slice(0, 50) : "No caption";
  const suffix = caption && caption.length > 50 ? "..." : "";
  return `${snippet}${suffix} (${post.id})`;
}

export default function AutomationManager({
  initialAutomations,
  posts,
  isConnected,
}: AutomationManagerProps) {
  const [automations, setAutomations] = useState(initialAutomations);
  const [targetPostId, setTargetPostId] = useState<string>("ALL");
  const [keyword, setKeyword] = useState("");
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasMounted, setHasMounted] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setHasMounted(true);
  }, []);

  function resetFeedback() {
    setFeedback(null);
    setError(null);
  }

  function handleSubmit(formData: FormData) {
    const nextTarget = String(formData.get("postId") ?? "ALL");
    const nextKeyword = String(formData.get("keyword") ?? "");
    const nextMessage = String(formData.get("message") ?? "");

    resetFeedback();

    startTransition(async () => {
      const response = await fetch("/api/automations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          postId: nextTarget,
          keyword: nextKeyword,
          message: nextMessage,
        }),
      });

      const payload = (await response.json()) as CreateAutomationResponse;

      if (!response.ok || !payload.automation) {
        setError(payload.error ?? "Unable to create automation.");
        return;
      }

      setAutomations((current) => [payload.automation!, ...current]);
      setTargetPostId("ALL");
      setKeyword("");
      setMessage("");
      setFeedback("Automation created.");
    });
  }

  function handleDelete(id: string) {
    resetFeedback();

    startTransition(async () => {
      const response = await fetch(`/api/automations?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      const payload = (await response.json()) as DeleteAutomationResponse;

      if (!response.ok || !payload.success) {
        setError(payload.error ?? "Unable to delete automation.");
        return;
      }

      setAutomations((current) => current.filter((automation) => automation.id !== id));
      setFeedback("Automation deleted.");
    });
  }

  function formatCreatedAt(createdAt: string) {
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) {
      return createdAt;
    }

    if (!hasMounted) {
      return date.toLocaleString("en-GB", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone: "UTC",
      });
    }

    return date.toLocaleString();
  }

  return (
    <section className="rounded-3xl border border-stone-300/70 bg-white/85 p-6 shadow-[0_14px_40px_rgba(120,90,20,0.06)]">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-stone-500">
            Automations
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-stone-950">
            Keyword to DM rules
          </h2>
        </div>
        <a
          href="/api/automations"
          className="text-sm font-medium text-stone-700 underline decoration-stone-400 underline-offset-4"
        >
          View raw `/api/automations` response
        </a>
      </div>

      {!isConnected ? (
        <p className="mt-6 rounded-2xl border border-stone-300 bg-stone-50 px-4 py-4 text-sm text-stone-700">
          Connect Instagram before creating automations.
        </p>
      ) : null}

      <form
        action={handleSubmit}
        className="mt-6 grid gap-4 rounded-2xl border border-stone-300/80 bg-stone-50 p-5"
      >
        <label className="grid gap-2 text-sm text-stone-700">
          <span className="font-medium">Target</span>
          <select
            name="postId"
            value={targetPostId}
            onChange={(event) => setTargetPostId(event.target.value)}
            disabled={!isConnected || isPending}
            className="rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none"
          >
            <option value="ALL">All posts</option>
            {posts.map((post) => (
              <option key={post.id} value={post.id}>
                {getPostLabel(post)}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm text-stone-700">
          <span className="font-medium">Trigger keyword</span>
          <input
            name="keyword"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            disabled={!isConnected || isPending}
            placeholder="comment to win"
            className="rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none"
          />
        </label>

        <label className="grid gap-2 text-sm text-stone-700">
          <span className="font-medium">DM message</span>
          <textarea
            name="message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            disabled={!isConnected || isPending}
            placeholder="Thanks for commenting. Check your DMs for the next steps."
            rows={5}
            className="rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none"
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={!isConnected || isPending}
            className="rounded-full bg-stone-950 px-5 py-3 text-sm font-medium text-stone-50 transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            {isPending ? "Saving..." : "Create automation"}
          </button>
          <p className="text-sm text-stone-600">
            Keywords and targets must be unique per automation.
          </p>
        </div>
      </form>

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
              <th className="px-4 py-3 font-medium">Target</th>
              <th className="px-4 py-3 font-medium">Keyword</th>
              <th className="px-4 py-3 font-medium">Message</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 bg-white text-stone-700">
            {automations.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-stone-500">
                  No automations yet.
                </td>
              </tr>
            ) : (
              automations.map((automation) => (
                <tr key={automation.id}>
                  <td className="px-4 py-4 align-top">
                    {automation.postId === "ALL" ? "All posts" : automation.postId}
                  </td>
                  <td className="px-4 py-4 align-top">{automation.keyword}</td>
                  <td className="px-4 py-4 align-top">{automation.message}</td>
                  <td className="px-4 py-4 align-top">
                    {formatCreatedAt(automation.createdAt)}
                  </td>
                  <td className="px-4 py-4 align-top">
                    <button
                      type="button"
                      onClick={() => handleDelete(automation.id)}
                      disabled={isPending}
                      className="rounded-full border border-stone-300 px-3 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Delete
                    </button>
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

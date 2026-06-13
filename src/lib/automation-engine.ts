import "server-only";

import { randomUUID } from "node:crypto";

import { listAutomations } from "@/lib/automations";
import {
  getTriggers,
  setTriggers,
  type Automation,
  type TriggerLog,
} from "@/lib/db";
import { InstagramDmError, sendPrivateReplyDm } from "@/lib/instagram-dm";
import { InstagramAuthError } from "@/lib/instagram-auth";
import type { InstagramCommentEvent } from "@/lib/instagram-webhooks";

export type ProcessCommentResult =
  | {
      status: "ignored";
      reason: string;
      automationId: null;
      postId: string;
      commenterId: string;
      commentId: string;
    }
  | {
      status: "duplicate";
      reason: string;
      automationId: string;
      postId: string;
      commenterId: string;
      commentId: string;
    }
  | {
      status: "sent" | "failed";
      reason: string;
      automationId: string;
      postId: string;
      commenterId: string;
      commentId: string;
    };

function keywordMatches(commentText: string, keyword: string) {
  return commentText.toLowerCase().includes(keyword.toLowerCase());
}

function hasExistingTrigger(
  automationId: string,
  postId: string,
  commenterId: string,
  existingTriggers: Awaited<ReturnType<typeof getTriggers>>,
) {
  return existingTriggers.some(
    (trigger) =>
      trigger.automationId === automationId &&
      trigger.postId === postId &&
      trigger.commenterId === commenterId &&
      trigger.status === "sent",
  );
}

function getMatchingAutomations(
  automations: Automation[],
  comment: InstagramCommentEvent,
) {
  const specificMatches = automations.filter(
    (automation) =>
      automation.postId === comment.postId &&
      keywordMatches(comment.commentText, automation.keyword),
  );

  if (specificMatches.length > 0) {
    return specificMatches;
  }

  return automations.filter(
    (automation) =>
      automation.postId === "ALL" &&
      keywordMatches(comment.commentText, automation.keyword),
  );
}

function buildTriggerLog(input: {
  automationId: string;
  postId: string;
  commenterId: string;
  commentText: string;
  status: "sent" | "failed";
  reason: string | null;
}): TriggerLog {
  return {
    id: randomUUID(),
    automationId: input.automationId,
    postId: input.postId,
    commenterId: input.commenterId,
    commentText: input.commentText,
    status: input.status,
    reason: input.reason,
    timestamp: new Date().toISOString(),
  };
}

async function appendTriggerLog(trigger: TriggerLog) {
  const existingTriggers = await getTriggers();
  await setTriggers([trigger, ...existingTriggers]);
}

export async function processComment(
  comment: InstagramCommentEvent,
): Promise<ProcessCommentResult[]> {
  const [automations, triggers] = await Promise.all([
    listAutomations(),
    getTriggers(),
  ]);
  const matches = getMatchingAutomations(automations, comment);

  if (matches.length === 0) {
    return [
      {
        status: "ignored",
        reason: "No automation matched this comment.",
        automationId: null,
        postId: comment.postId,
        commenterId: comment.commenterId,
        commentId: comment.commentId,
      },
    ];
  }

  const results: ProcessCommentResult[] = [];

  for (const automation of matches) {
    if (
      hasExistingTrigger(
        automation.id,
        comment.postId,
        comment.commenterId,
        triggers,
      )
    ) {
      results.push({
        status: "duplicate",
        reason: "A DM was already sent to this commenter for the same automation and post.",
        automationId: automation.id,
        postId: comment.postId,
        commenterId: comment.commenterId,
        commentId: comment.commentId,
      });
      continue;
    }

    try {
      await sendPrivateReplyDm({
        commentId: comment.commentId,
        message: automation.message,
      });

      await appendTriggerLog(
        buildTriggerLog({
          automationId: automation.id,
          postId: comment.postId,
          commenterId: comment.commenterId,
          commentText: comment.commentText,
          status: "sent",
          reason: null,
        }),
      );

      results.push({
        status: "sent",
        reason: "Private reply DM sent.",
        automationId: automation.id,
        postId: comment.postId,
        commenterId: comment.commenterId,
        commentId: comment.commentId,
      });
    } catch (error) {
      const reason =
        error instanceof InstagramDmError || error instanceof InstagramAuthError
          ? error.message
          : "Failed to send the Instagram private reply DM.";

      await appendTriggerLog(
        buildTriggerLog({
          automationId: automation.id,
          postId: comment.postId,
          commenterId: comment.commenterId,
          commentText: comment.commentText,
          status: "failed",
          reason,
        }),
      );

      results.push({
        status: "failed",
        reason,
        automationId: automation.id,
        postId: comment.postId,
        commenterId: comment.commenterId,
        commentId: comment.commentId,
      });
    }
  }

  return results;
}

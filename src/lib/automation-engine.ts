import "server-only";

import { listAutomations } from "@/lib/automations";
import { getTriggers, type Automation } from "@/lib/db";
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
      status: "deferred";
      reason: string;
      automationId: string;
      postId: string;
      commenterId: string;
      commentId: string;
    };

type SendDmInput = {
  automation: Automation;
  comment: InstagramCommentEvent;
};

type SendDmResult = {
  status: "deferred";
  reason: string;
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

async function sendPrivateReplyDm(input: SendDmInput): Promise<SendDmResult> {
  void input;

  return {
    status: "deferred",
    reason: "DM sending is intentionally deferred until Phase 6 is implemented.",
  };
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

    const sendResult = await sendPrivateReplyDm({
      automation,
      comment,
    });

    results.push({
      status: sendResult.status,
      reason: sendResult.reason,
      automationId: automation.id,
      postId: comment.postId,
      commenterId: comment.commenterId,
      commentId: comment.commentId,
    });
  }

  return results;
}

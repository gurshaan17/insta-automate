import "server-only";

import { randomUUID } from "node:crypto";

import {
  getAutomations,
  setAutomations,
  type Automation,
} from "@/lib/db";

export type CreateAutomationInput = {
  postId: string | "ALL";
  keyword: string;
  message: string;
};

export class AutomationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AutomationValidationError";
  }
}

function normalizeKeyword(keyword: string) {
  return keyword.trim().toLowerCase();
}

function normalizeMessage(message: string) {
  return message.trim();
}

function normalizePostId(postId: string) {
  const trimmed = postId.trim();
  return trimmed === "ALL" ? "ALL" : trimmed;
}

function validateInput(input: CreateAutomationInput) {
  const postId = normalizePostId(input.postId);
  const keyword = normalizeKeyword(input.keyword);
  const message = normalizeMessage(input.message);

  if (!keyword) {
    throw new AutomationValidationError("Keyword is required.");
  }

  if (!message) {
    throw new AutomationValidationError("Message is required.");
  }

  if (!postId) {
    throw new AutomationValidationError("Target post is required.");
  }

  return {
    postId,
    keyword,
    message,
  };
}

function hasDuplicate(
  automations: Automation[],
  input: { postId: string | "ALL"; keyword: string },
) {
  return automations.some(
    (automation) =>
      automation.postId === input.postId &&
      normalizeKeyword(automation.keyword) === input.keyword,
  );
}

export async function listAutomations() {
  const automations = await getAutomations();
  return automations.sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

export async function createAutomation(input: CreateAutomationInput) {
  const normalized = validateInput(input);
  const automations = await getAutomations();

  if (hasDuplicate(automations, normalized)) {
    throw new AutomationValidationError(
      "An automation with this keyword and target already exists.",
    );
  }

  const automation: Automation = {
    id: randomUUID(),
    postId: normalized.postId,
    keyword: normalized.keyword,
    message: normalized.message,
    createdAt: new Date().toISOString(),
  };

  const nextAutomations = [automation, ...automations];
  await setAutomations(nextAutomations);

  return automation;
}

export async function deleteAutomation(id: string) {
  const trimmedId = id.trim();

  if (!trimmedId) {
    throw new AutomationValidationError("Automation id is required.");
  }

  const automations = await getAutomations();
  const nextAutomations = automations.filter((automation) => automation.id !== trimmedId);

  if (nextAutomations.length === automations.length) {
    throw new AutomationValidationError("Automation not found.");
  }

  await setAutomations(nextAutomations);
}

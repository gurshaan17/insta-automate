import "server-only";

import { getAutomations } from "@/lib/db";
import { getTriggers, type TriggerLog } from "@/lib/db";

import type { TriggerDashboardRow } from "@/lib/instagram-comments";

export function sortTriggersNewestFirst(triggers: TriggerLog[]) {
  return [...triggers].sort(
    (left, right) =>
      new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
  );
}

export async function listTriggerDashboardRows(): Promise<TriggerDashboardRow[]> {
  const [triggers, automations] = await Promise.all([getTriggers(), getAutomations()]);
  const automationsById = new Map(automations.map((automation) => [automation.id, automation]));

  return sortTriggersNewestFirst(triggers).map((trigger) => {
    const automation = automationsById.get(trigger.automationId);

    return {
      ...trigger,
      automationKeyword: automation?.keyword ?? null,
      automationTarget: automation?.postId ?? null,
      automationMessage: automation?.message ?? null,
    };
  });
}

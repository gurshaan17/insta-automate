import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type InstagramAccount = {
  userId: string;
  username: string | null;
  accessToken: string;
  expiresAt: string;
};

export type Automation = {
  id: string;
  postId: string | "ALL";
  keyword: string;
  message: string;
  createdAt: string;
};

export type TriggerLog = {
  id: string;
  automationId: string;
  postId: string;
  commenterId: string;
  commentText: string;
  status: "sent" | "failed";
  reason: string | null;
  timestamp: string;
};

export type Database = {
  account: InstagramAccount | null;
  automations: Automation[];
  triggers: TriggerLog[];
};

const DB_PATH = path.join(process.cwd(), "data", "db.json");

const EMPTY_DB: Database = {
  account: null,
  automations: [],
  triggers: [],
};

async function ensureDBFile() {
  await mkdir(path.dirname(DB_PATH), { recursive: true });

  try {
    await readFile(DB_PATH, "utf8");
  } catch {
    await writeFile(DB_PATH, JSON.stringify(EMPTY_DB, null, 2), "utf8");
  }
}

export async function readDB(): Promise<Database> {
  await ensureDBFile();

  const content = await readFile(DB_PATH, "utf8");
  const parsed = JSON.parse(content) as Partial<Database>;

  return {
    account: parsed.account ?? null,
    automations: parsed.automations ?? [],
    triggers: parsed.triggers ?? [],
  };
}

export async function writeDB(nextDB: Database): Promise<void> {
  await ensureDBFile();
  await writeFile(DB_PATH, JSON.stringify(nextDB, null, 2), "utf8");
}

export async function getAccount(): Promise<InstagramAccount | null> {
  const db = await readDB();
  return db.account;
}

export async function setAccount(
  account: InstagramAccount | null,
): Promise<InstagramAccount | null> {
  const db = await readDB();
  const nextDB: Database = {
    ...db,
    account,
  };

  await writeDB(nextDB);
  return nextDB.account;
}

export async function getAutomations(): Promise<Automation[]> {
  const db = await readDB();
  return db.automations;
}

export async function setAutomations(
  automations: Automation[],
): Promise<Automation[]> {
  const db = await readDB();
  const nextDB: Database = {
    ...db,
    automations,
  };

  await writeDB(nextDB);
  return nextDB.automations;
}

export async function getTriggers(): Promise<TriggerLog[]> {
  const db = await readDB();
  return db.triggers;
}

export async function setTriggers(triggers: TriggerLog[]): Promise<TriggerLog[]> {
  const db = await readDB();
  const nextDB: Database = {
    ...db,
    triggers,
  };

  await writeDB(nextDB);
  return nextDB.triggers;
}

import type { BackupPayload } from "../types";
import { getAllData, replaceAllData } from "../db/repository";
import { nowIso } from "../utils/time";

const BACKUP_VERSION = 1;

export async function createBackupPayload(): Promise<BackupPayload> {
  const data = await getAllData();
  return {
    version: BACKUP_VERSION,
    exportedAt: nowIso(),
    ...data,
  };
}

export function serializeBackup(payload: BackupPayload): string {
  return JSON.stringify(payload, null, 2);
}

export function parseBackup(raw: string): BackupPayload {
  const parsed = JSON.parse(raw) as BackupPayload;
  if (!parsed || parsed.version !== BACKUP_VERSION || !Array.isArray(parsed.planItems) || !Array.isArray(parsed.events)) {
    throw new Error("This is not a valid LifeOS backup file.");
  }
  return parsed;
}

export async function restoreBackup(raw: string): Promise<void> {
  const payload = parseBackup(raw);
  await replaceAllData(payload);
}

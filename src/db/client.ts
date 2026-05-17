import * as SQLite from "expo-sqlite";
import { DATABASE_NAME, DATABASE_VERSION, schemaSql } from "./schema";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DATABASE_NAME);
  }
  return dbPromise;
}

export async function initializeDatabase(): Promise<void> {
  const db = await getDb();
  await db.execAsync(schemaSql);
  const row = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  if ((row?.user_version ?? 0) < DATABASE_VERSION) {
    await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
  }
}

export async function resetDatabase(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM life_events;
    DELETE FROM focus_sessions;
    DELETE FROM plan_items;
    DELETE FROM preferences;
  `);
}

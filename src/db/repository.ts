import AsyncStorage from "@react-native-async-storage/async-storage";
import type { FocusSession, LifeEvent, PlanItem, UserPreference } from "../types";
import { dateKey, endOfDayIso, nowIso, startOfDayIso } from "../utils/time";
import { assertIsoRange, assertTitle, createId, sanitizeNote, sanitizeText, safeNumber } from "../utils/validation";
import { getDb } from "./client";
import type { FocusSessionRow, LifeEventRow, PlanItemRow } from "./schema";

const PREF_PREFIX = "lifeos:";

function mapPlan(row: PlanItemRow): PlanItem {
  return {
    id: row.id,
    date: row.date,
    title: row.title,
    notes: row.notes,
    kind: row.kind,
    priority: row.priority,
    startAt: row.start_at,
    endAt: row.end_at,
    durationMinutes: row.duration_minutes,
    status: row.status,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapEvent(row: LifeEventRow): LifeEvent {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    note: row.note,
    startAt: row.start_at,
    endAt: row.end_at,
    taskId: row.task_id,
    energy: row.energy,
    createdAt: row.created_at,
  };
}

function mapFocus(row: FocusSessionRow): FocusSession {
  return {
    id: row.id,
    taskId: row.task_id,
    title: row.title,
    startAt: row.start_at,
    endAt: row.end_at,
    plannedMinutes: row.planned_minutes,
    completed: row.completed === 1,
    createdAt: row.created_at,
  };
}

export async function listPlanItems(day = dateKey(), includeArchived = false): Promise<PlanItem[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<PlanItemRow>(
    `SELECT * FROM plan_items WHERE date = ? ${includeArchived ? "" : "AND status != 'archived'"} ORDER BY sort_order ASC, created_at ASC`,
    [day],
  );
  return rows.map(mapPlan);
}

export async function createPlanItem(input: Partial<PlanItem> & { title: string; date?: string }): Promise<PlanItem> {
  const db = await getDb();
  const createdAt = nowIso();
  const item: PlanItem = {
    id: input.id ?? createId("plan"),
    date: input.date ?? dateKey(),
    title: assertTitle(input.title),
    notes: sanitizeNote(input.notes ?? ""),
    kind: input.kind ?? "task",
    priority: input.priority ?? "medium",
    startAt: input.startAt ?? null,
    endAt: input.endAt ?? null,
    durationMinutes: safeNumber(input.durationMinutes, 30, 0, 24 * 60),
    status: input.status ?? "planned",
    sortOrder: safeNumber(input.sortOrder, Date.now(), 0, Number.MAX_SAFE_INTEGER),
    createdAt: input.createdAt ?? createdAt,
    updatedAt: input.updatedAt ?? createdAt,
  };
  assertIsoRange(item.startAt, item.endAt);
  await db.runAsync(
    `INSERT INTO plan_items (id, date, title, notes, kind, priority, start_at, end_at, duration_minutes, status, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.id,
      item.date,
      item.title,
      item.notes,
      item.kind,
      item.priority,
      item.startAt,
      item.endAt,
      item.durationMinutes,
      item.status,
      item.sortOrder,
      item.createdAt,
      item.updatedAt,
    ],
  );
  return item;
}

export async function updatePlanItem(id: string, patch: Partial<PlanItem>): Promise<void> {
  const db = await getDb();
  const existing = await getPlanItem(id);
  if (!existing) throw new Error("Plan item not found.");
  const next = { ...existing, ...patch, updatedAt: nowIso() };
  next.title = assertTitle(next.title);
  next.notes = sanitizeNote(next.notes);
  assertIsoRange(next.startAt, next.endAt);
  await db.runAsync(
    `UPDATE plan_items SET date = ?, title = ?, notes = ?, kind = ?, priority = ?, start_at = ?, end_at = ?,
     duration_minutes = ?, status = ?, sort_order = ?, updated_at = ? WHERE id = ?`,
    [
      next.date,
      next.title,
      next.notes,
      next.kind,
      next.priority,
      next.startAt,
      next.endAt,
      next.durationMinutes,
      next.status,
      next.sortOrder,
      next.updatedAt,
      id,
    ],
  );
}

export async function getPlanItem(id: string): Promise<PlanItem | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<PlanItemRow>("SELECT * FROM plan_items WHERE id = ?", [id]);
  return row ? mapPlan(row) : null;
}

export async function reorderPlanItems(items: PlanItem[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const [index, item] of items.entries()) {
      await db.runAsync("UPDATE plan_items SET sort_order = ?, updated_at = ? WHERE id = ?", [index, nowIso(), item.id]);
    }
  });
}

export async function listEvents(day = dateKey()): Promise<LifeEvent[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<LifeEventRow>(
    "SELECT * FROM life_events WHERE start_at >= ? AND start_at <= ? ORDER BY start_at ASC",
    [startOfDayIso(day), endOfDayIso(day)],
  );
  return rows.map(mapEvent);
}

export async function createEvent(input: Partial<LifeEvent> & { title: string; type: LifeEvent["type"] }): Promise<LifeEvent> {
  const db = await getDb();
  const createdAt = nowIso();
  const event: LifeEvent = {
    id: input.id ?? createId("event"),
    type: input.type,
    title: assertTitle(input.title),
    note: sanitizeNote(input.note ?? ""),
    startAt: input.startAt ?? createdAt,
    endAt: input.endAt ?? null,
    taskId: input.taskId ?? null,
    energy: input.energy ?? null,
    createdAt: input.createdAt ?? createdAt,
  };
  assertIsoRange(event.startAt, event.endAt);
  await db.runAsync(
    `INSERT INTO life_events (id, type, title, note, start_at, end_at, task_id, energy, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [event.id, event.type, event.title, event.note, event.startAt, event.endAt, event.taskId, event.energy, event.createdAt],
  );
  return event;
}

export async function startFocusSession(title: string, plannedMinutes = 25, taskId: string | null = null): Promise<FocusSession> {
  const db = await getDb();
  const createdAt = nowIso();
  const session: FocusSession = {
    id: createId("focus"),
    taskId,
    title: assertTitle(title),
    startAt: createdAt,
    endAt: null,
    plannedMinutes: safeNumber(plannedMinutes, 25, 1, 240),
    completed: false,
    createdAt,
  };
  await db.runAsync(
    `INSERT INTO focus_sessions (id, task_id, title, start_at, end_at, planned_minutes, completed, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [session.id, session.taskId, session.title, session.startAt, session.endAt, session.plannedMinutes, 0, session.createdAt],
  );
  await createEvent({ type: "focus_start", title: session.title, taskId: session.taskId, startAt: session.startAt });
  return session;
}

export async function getActiveFocusSession(): Promise<FocusSession | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<FocusSessionRow>(
    "SELECT * FROM focus_sessions WHERE end_at IS NULL ORDER BY start_at DESC LIMIT 1",
  );
  return row ? mapFocus(row) : null;
}

export async function finishFocusSession(id: string, completed = true): Promise<void> {
  const db = await getDb();
  const session = await getFocusSession(id);
  if (!session || session.endAt) return;
  const endedAt = nowIso();
  await db.runAsync("UPDATE focus_sessions SET end_at = ?, completed = ? WHERE id = ?", [endedAt, completed ? 1 : 0, id]);
  await createEvent({ type: "focus_end", title: session.title, taskId: session.taskId, startAt: endedAt });
}

export async function getFocusSession(id: string): Promise<FocusSession | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<FocusSessionRow>("SELECT * FROM focus_sessions WHERE id = ?", [id]);
  return row ? mapFocus(row) : null;
}

export async function listFocusSessions(day = dateKey()): Promise<FocusSession[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<FocusSessionRow>(
    "SELECT * FROM focus_sessions WHERE start_at >= ? AND start_at <= ? ORDER BY start_at ASC",
    [startOfDayIso(day), endOfDayIso(day)],
  );
  return rows.map(mapFocus);
}

export async function setPreference(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)", [key, value]);
  await AsyncStorage.setItem(`${PREF_PREFIX}${key}`, value);
}

export async function getPreference(key: string, fallback = ""): Promise<string> {
  const db = await getDb();
  const row = await db.getFirstAsync<UserPreference>("SELECT * FROM preferences WHERE key = ?", [key]);
  if (row) return row.value;
  const asyncValue = await AsyncStorage.getItem(`${PREF_PREFIX}${key}`);
  return asyncValue ?? fallback;
}

export async function listPreferences(): Promise<UserPreference[]> {
  const db = await getDb();
  return db.getAllAsync<UserPreference>("SELECT * FROM preferences ORDER BY key ASC");
}

export async function replaceAllData(payload: {
  planItems: PlanItem[];
  events: LifeEvent[];
  focusSessions: FocusSession[];
  preferences: UserPreference[];
}): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.execAsync("DELETE FROM life_events; DELETE FROM focus_sessions; DELETE FROM plan_items; DELETE FROM preferences;");
    for (const item of payload.planItems) {
      await db.runAsync(
        `INSERT INTO plan_items (id, date, title, notes, kind, priority, start_at, end_at, duration_minutes, status, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.date,
          assertTitle(item.title),
          sanitizeNote(item.notes),
          item.kind,
          item.priority,
          item.startAt,
          item.endAt,
          safeNumber(item.durationMinutes, 30, 0, 24 * 60),
          item.status,
          safeNumber(item.sortOrder, 0, 0, Number.MAX_SAFE_INTEGER),
          item.createdAt,
          item.updatedAt,
        ],
      );
    }
    for (const session of payload.focusSessions) {
      await db.runAsync(
        `INSERT INTO focus_sessions (id, task_id, title, start_at, end_at, planned_minutes, completed, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          session.id,
          session.taskId,
          sanitizeText(session.title),
          session.startAt,
          session.endAt,
          safeNumber(session.plannedMinutes, 25, 1, 240),
          session.completed ? 1 : 0,
          session.createdAt,
        ],
      );
    }
    for (const event of payload.events) {
      await db.runAsync(
        `INSERT INTO life_events (id, type, title, note, start_at, end_at, task_id, energy, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          event.id,
          event.type,
          assertTitle(event.title),
          sanitizeNote(event.note),
          event.startAt,
          event.endAt,
          event.taskId,
          event.energy,
          event.createdAt,
        ],
      );
    }
    for (const pref of payload.preferences) {
      await db.runAsync("INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)", [pref.key, pref.value]);
      await AsyncStorage.setItem(`${PREF_PREFIX}${pref.key}`, pref.value);
    }
  });
}

export async function getAllData(): Promise<{
  planItems: PlanItem[];
  events: LifeEvent[];
  focusSessions: FocusSession[];
  preferences: UserPreference[];
}> {
  const db = await getDb();
  const planRows = await db.getAllAsync<PlanItemRow>("SELECT * FROM plan_items ORDER BY date ASC, sort_order ASC");
  const eventRows = await db.getAllAsync<LifeEventRow>("SELECT * FROM life_events ORDER BY start_at ASC");
  const focusRows = await db.getAllAsync<FocusSessionRow>("SELECT * FROM focus_sessions ORDER BY start_at ASC");
  return {
    planItems: planRows.map(mapPlan),
    events: eventRows.map(mapEvent),
    focusSessions: focusRows.map(mapFocus),
    preferences: await listPreferences(),
  };
}

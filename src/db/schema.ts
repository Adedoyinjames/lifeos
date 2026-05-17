import type { EventType, PlanKind, PlanStatus, Priority } from "../types";

export const DATABASE_NAME = "lifeos.db";
export const DATABASE_VERSION = 1;

export const schemaSql = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS plan_items (
  id TEXT PRIMARY KEY NOT NULL,
  date TEXT NOT NULL,
  title TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL CHECK (kind IN ('task', 'time_block', 'goal')),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
  start_at TEXT,
  end_at TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('planned', 'completed', 'archived')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS life_events (
  id TEXT PRIMARY KEY NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('focus_start', 'focus_end', 'log', 'note', 'distraction', 'break', 'meeting', 'context_switch')),
  title TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  start_at TEXT NOT NULL,
  end_at TEXT,
  task_id TEXT,
  energy TEXT CHECK (energy IN ('low', 'medium', 'high')),
  created_at TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES plan_items(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS focus_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  task_id TEXT,
  title TEXT NOT NULL,
  start_at TEXT NOT NULL,
  end_at TEXT,
  planned_minutes INTEGER NOT NULL DEFAULT 25,
  completed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES plan_items(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS preferences (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_plan_items_date_sort ON plan_items(date, status, sort_order);
CREATE INDEX IF NOT EXISTS idx_life_events_start ON life_events(start_at);
CREATE INDEX IF NOT EXISTS idx_life_events_type ON life_events(type);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_start ON focus_sessions(start_at);
`;

export interface PlanItemRow {
  id: string;
  date: string;
  title: string;
  notes: string;
  kind: PlanKind;
  priority: Priority;
  start_at: string | null;
  end_at: string | null;
  duration_minutes: number;
  status: PlanStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface LifeEventRow {
  id: string;
  type: EventType;
  title: string;
  note: string;
  start_at: string;
  end_at: string | null;
  task_id: string | null;
  energy: "low" | "medium" | "high" | null;
  created_at: string;
}

export interface FocusSessionRow {
  id: string;
  task_id: string | null;
  title: string;
  start_at: string;
  end_at: string | null;
  planned_minutes: number;
  completed: number;
  created_at: string;
}

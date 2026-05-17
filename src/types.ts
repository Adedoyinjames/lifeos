export type Priority = "low" | "medium" | "high";
export type PlanKind = "task" | "time_block" | "goal";
export type PlanStatus = "planned" | "completed" | "archived";
export type EventType =
  | "focus_start"
  | "focus_end"
  | "log"
  | "note"
  | "distraction"
  | "break"
  | "meeting"
  | "context_switch";

export type EnergyLevel = "low" | "medium" | "high";

export interface PlanItem {
  id: string;
  date: string;
  title: string;
  notes: string;
  kind: PlanKind;
  priority: Priority;
  startAt: string | null;
  endAt: string | null;
  durationMinutes: number;
  status: PlanStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface LifeEvent {
  id: string;
  type: EventType;
  title: string;
  note: string;
  startAt: string;
  endAt: string | null;
  taskId: string | null;
  energy: EnergyLevel | null;
  createdAt: string;
}

export interface FocusSession {
  id: string;
  taskId: string | null;
  title: string;
  startAt: string;
  endAt: string | null;
  plannedMinutes: number;
  completed: boolean;
  createdAt: string;
}

export interface UserPreference {
  key: string;
  value: string;
}

export interface TimelineSegment {
  id: string;
  title: string;
  type: EventType | "gap" | "planned" | "focus";
  startAt: string;
  endAt: string;
  minutes: number;
  sourceId: string | null;
  plannedTitle?: string;
  driftMinutes?: number;
  productive: boolean;
}

export interface DaySnapshot {
  date: string;
  planItems: PlanItem[];
  events: LifeEvent[];
  focusSessions: FocusSession[];
  timeline: TimelineSegment[];
}

export interface ProductivityScore {
  score: number;
  accountabilityScore: number;
  plannedMinutes: number;
  actualProductiveMinutes: number;
  focusedMinutes: number;
  leakedMinutes: number;
  untrackedMinutes: number;
  checkIns: number;
  completedTasks: number;
  totalTasks: number;
  driftMinutes: number;
  focusStreak: number;
  grade: "excellent" | "good" | "mixed" | "poor";
}

export interface PatternInsight {
  title: string;
  detail: string;
  severity: "positive" | "neutral" | "warning";
}

export interface OfflineInsight {
  date: string;
  summary: string;
  nextBestAction: string;
  score: ProductivityScore;
  patterns: PatternInsight[];
  leakage: PatternInsight[];
  suggestionsForTomorrow: string[];
}

export interface WeeklyReport {
  startDate: string;
  endDate: string;
  averageScore: number;
  focusedMinutes: number;
  leakedMinutes: number;
  completedTasks: number;
  commonDistractions: PatternInsight[];
  peakEnergyWindows: PatternInsight[];
  daily: OfflineInsight[];
}

export interface BackupPayload {
  version: number;
  exportedAt: string;
  planItems: PlanItem[];
  events: LifeEvent[];
  focusSessions: FocusSession[];
  preferences: UserPreference[];
}

export interface AccountabilityQuestion {
  id: string;
  question: string;
  actionLabel: string;
  severity: "calm" | "warning" | "urgent";
  taskId?: string;
}

export interface AccountabilityState {
  promised: PlanItem[];
  dueNow: PlanItem[];
  overdue: PlanItem[];
  questions: AccountabilityQuestion[];
  lastCheckInAt: string | null;
  untrackedMinutes: number;
  accountabilityScore: number;
}

export type AssistantActionType =
  | "answer"
  | "add_task"
  | "start_focus"
  | "stop_focus"
  | "log_event"
  | "call"
  | "open_app"
  | "open_camera"
  | "pick_file"
  | "play_music"
  | "open_settings";

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  createdAt: string;
}

export interface AssistantCommandResult {
  spokenText: string;
  actionType: AssistantActionType;
  success: boolean;
  detail?: string;
  route?: string;
}

export interface AssistantProfile {
  hotword: string;
  speakReplies: boolean;
}

import type { AccountabilityQuestion, AccountabilityState, DaySnapshot, PlanItem } from "../types";
import { diffMinutes, formatClock } from "../utils/time";

function overlapsNow(item: PlanItem, nowMs: number): boolean {
  if (!item.startAt || !item.endAt || item.status !== "planned") return false;
  return new Date(item.startAt).getTime() <= nowMs && new Date(item.endAt).getTime() >= nowMs;
}

function isOverdue(item: PlanItem, nowMs: number): boolean {
  if (item.status !== "planned") return false;
  if (item.endAt) return new Date(item.endAt).getTime() < nowMs;
  if (item.startAt) return new Date(item.startAt).getTime() + item.durationMinutes * 60 * 1000 < nowMs;
  return false;
}

export function getAccountabilityState(snapshot: DaySnapshot, now = new Date()): AccountabilityState {
  const promised = snapshot.planItems.filter((item) => item.status !== "archived");
  const nowMs = now.getTime();
  const dueNow = promised.filter((item) => overlapsNow(item, nowMs));
  const overdue = promised.filter((item) => isOverdue(item, nowMs));
  const lastEvent = [...snapshot.events].sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())[0];
  const untrackedMinutes = snapshot.timeline.filter((segment) => segment.type === "gap").reduce((sum, segment) => sum + segment.minutes, 0);
  const checkIns = snapshot.events.filter((event) => ["log", "note", "distraction", "break", "meeting", "context_switch"].includes(event.type)).length;
  const completionRatio = promised.length ? promised.filter((item) => item.status === "completed").length / promised.length : 0;
  const trackingPenalty = Math.min(untrackedMinutes / 180, 1) * 45;
  const accountabilityScore = Math.max(0, Math.min(100, Math.round(40 + completionRatio * 45 + Math.min(checkIns, 8) * 3 - trackingPenalty)));
  const questions: AccountabilityQuestion[] = [];

  if (dueNow[0]) {
    questions.push({
      id: `due_${dueNow[0].id}`,
      question: `You said you would be doing "${dueNow[0].title}" now. Are you doing it?`,
      actionLabel: "Start or log it",
      severity: "urgent",
      taskId: dueNow[0].id,
    });
  }
  if (overdue[0]) {
    questions.push({
      id: `overdue_${overdue[0].id}`,
      question: `You mentioned "${overdue[0].title}" for today. Did it happen, or should it move?`,
      actionLabel: "Answer honestly",
      severity: "warning",
      taskId: overdue[0].id,
    });
  }
  if (!lastEvent || diffMinutes(lastEvent.startAt, now.toISOString()) >= 45) {
    questions.push({
      id: "stale_check_in",
      question: "I have not seen a recent check-in. What are you doing right now?",
      actionLabel: "Check in",
      severity: "warning",
    });
  }
  if (untrackedMinutes >= 60) {
    questions.push({
      id: "untracked_time",
      question: `There is over an hour of untracked time. Can you reconstruct what happened?`,
      actionLabel: "Repair timeline",
      severity: "warning",
    });
  }
  if (questions.length === 0) {
    const next = promised.find((item) => item.status === "planned");
    questions.push({
      id: "steady",
      question: next ? `Next commitment: "${next.title}". What is the first visible step?` : "Your plan is clear. What is the best next action?",
      actionLabel: "Keep moving",
      severity: "calm",
      taskId: next?.id,
    });
  }

  return {
    promised,
    dueNow,
    overdue,
    questions,
    lastCheckInAt: lastEvent?.startAt ?? null,
    untrackedMinutes,
    accountabilityScore,
  };
}

export function parseDailyBrainDump(raw: string): Array<{ title: string; priority: PlanItem["priority"]; start?: string; end?: string }> {
  return raw
    .split("\n")
    .map((line) => line.trim().replace(/^[-*]\s*/, ""))
    .filter(Boolean)
    .map((line) => {
      const priority = line.startsWith("!!!") || /^high:/i.test(line) ? "high" : /^low:/i.test(line) ? "low" : "medium";
      const clean = line.replace(/^!!!\s*/, "").replace(/^!\s*/, "").replace(/^(high|medium|low):\s*/i, "");
      const range = clean.match(/\b([01]?\d|2[0-3]):([0-5]\d)\s*-\s*([01]?\d|2[0-3]):([0-5]\d)\b/);
      const title = clean.replace(/\b([01]?\d|2[0-3]):([0-5]\d)\s*-\s*([01]?\d|2[0-3]):([0-5]\d)\b/, "").trim();
      return {
        title: title || clean,
        priority,
        start: range ? `${range[1].padStart(2, "0")}:${range[2]}` : undefined,
        end: range ? `${range[3].padStart(2, "0")}:${range[4]}` : undefined,
      };
    });
}

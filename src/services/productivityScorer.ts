import type { DaySnapshot, ProductivityScore } from "../types";
import { diffMinutes } from "../utils/time";

export function scoreProductivity(snapshot: DaySnapshot): ProductivityScore {
  const plannedMinutes = snapshot.planItems
    .filter((item) => item.status !== "archived")
    .reduce((sum, item) => sum + (item.durationMinutes || (item.startAt && item.endAt ? diffMinutes(item.startAt, item.endAt) : 0)), 0);
  const actualProductiveMinutes = snapshot.timeline.filter((segment) => segment.productive).reduce((sum, segment) => sum + segment.minutes, 0);
  const focusedMinutes = snapshot.focusSessions.reduce(
    (sum, session) => sum + (session.endAt ? diffMinutes(session.startAt, session.endAt) : diffMinutes(session.startAt, new Date().toISOString())),
    0,
  );
  const leakedMinutes = snapshot.timeline
    .filter((segment) => !segment.productive && segment.type !== "planned")
    .reduce((sum, segment) => sum + segment.minutes, 0);
  const untrackedMinutes = snapshot.timeline.filter((segment) => segment.type === "gap").reduce((sum, segment) => sum + segment.minutes, 0);
  const checkIns = snapshot.events.filter((event) => ["log", "note", "distraction", "break", "meeting", "context_switch"].includes(event.type)).length;
  const tasks = snapshot.planItems.filter((item) => item.kind !== "goal" && item.status !== "archived");
  const completedTasks = tasks.filter((item) => item.status === "completed").length;
  const completionRatio = tasks.length ? completedTasks / tasks.length : 0;
  const planRatio = plannedMinutes ? Math.min(actualProductiveMinutes / plannedMinutes, 1) : actualProductiveMinutes > 0 ? 0.7 : 0.2;
  const focusRatio = plannedMinutes ? Math.min(focusedMinutes / Math.max(plannedMinutes * 0.5, 1), 1) : focusedMinutes > 0 ? 0.8 : 0.2;
  const leakagePenalty = Math.min(leakedMinutes / 180, 1) * 25;
  const driftMinutes = snapshot.timeline.reduce((sum, segment) => sum + Math.abs(segment.driftMinutes ?? 0), 0);
  const driftPenalty = Math.min(driftMinutes / 120, 1) * 10;
  const accountabilityScore = Math.max(0, Math.min(100, Math.round(completionRatio * 45 + Math.min(checkIns, 10) * 4 + 35 - Math.min(untrackedMinutes / 180, 1) * 35)));
  const score = Math.max(0, Math.min(100, Math.round(planRatio * 35 + completionRatio * 30 + focusRatio * 25 + 10 - leakagePenalty - driftPenalty)));

  return {
    score,
    accountabilityScore,
    plannedMinutes,
    actualProductiveMinutes,
    focusedMinutes,
    leakedMinutes,
    untrackedMinutes,
    checkIns,
    completedTasks,
    totalTasks: tasks.length,
    driftMinutes,
    focusStreak: snapshot.focusSessions.filter((session) => session.completed).length,
    grade: score >= 85 ? "excellent" : score >= 70 ? "good" : score >= 45 ? "mixed" : "poor",
  };
}

import type { DaySnapshot, PatternInsight, ProductivityScore } from "../types";
import { formatDuration, hourBucket } from "../utils/time";

export function detectLeakage(snapshot: DaySnapshot): PatternInsight[] {
  const leakage = snapshot.timeline.filter((segment) => !segment.productive && segment.type !== "planned");
  const byTitle = new Map<string, number>();
  for (const segment of leakage) {
    byTitle.set(segment.title, (byTitle.get(segment.title) ?? 0) + segment.minutes);
  }
  return [...byTitle.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([title, minutes]) => ({
      title,
      detail: `${formatDuration(minutes)} lost or weakly tracked.`,
      severity: minutes > 45 ? "warning" : "neutral",
    }));
}

export function detectBehaviorPatterns(snapshot: DaySnapshot, score: ProductivityScore): PatternInsight[] {
  const insights: PatternInsight[] = [];
  if (score.focusedMinutes >= 90) {
    insights.push({
      title: "Deep work protected",
      detail: `${formatDuration(score.focusedMinutes)} of focus time captured today.`,
      severity: "positive",
    });
  }
  if (score.leakedMinutes > 90) {
    insights.push({
      title: "Time leakage is high",
      detail: `${formatDuration(score.leakedMinutes)} went to gaps, breaks, or distractions.`,
      severity: "warning",
    });
  }
  if (score.totalTasks > 0 && score.completedTasks === score.totalTasks) {
    insights.push({
      title: "Plan closed cleanly",
      detail: "Every planned task was marked complete.",
      severity: "positive",
    });
  }
  const contextSwitches = snapshot.events.filter((event) => event.type === "context_switch").length;
  if (contextSwitches >= 4) {
    insights.push({
      title: "Frequent context switching",
      detail: `${contextSwitches} switches were logged. Batch similar work tomorrow.`,
      severity: "warning",
    });
  }
  const energyHours = snapshot.events.filter((event) => event.energy === "high").map((event) => hourBucket(event.startAt));
  if (energyHours.length) {
    insights.push({
      title: "Peak energy window",
      detail: `High energy appeared around ${energyHours[0]}. Put your hardest work there.`,
      severity: "positive",
    });
  }
  return insights.length
    ? insights
    : [
        {
          title: "Keep logging",
          detail: "More timeline entries will make insights sharper.",
          severity: "neutral",
        },
      ];
}

export function suggestTomorrow(snapshot: DaySnapshot, score: ProductivityScore): string[] {
  const suggestions = [
    "Start tomorrow with one 25 minute focus session before opening low-value apps.",
    "Plan only three high-priority outcomes and leave buffer for context switches.",
  ];
  if (score.leakedMinutes > 60) suggestions.unshift("Add two intentional recovery breaks so unplanned leakage does not steal the afternoon.");
  if (snapshot.planItems.some((item) => item.status === "planned")) suggestions.unshift("Carry over unfinished planned work or consciously archive it.");
  if (score.driftMinutes > 45) suggestions.push("Use tighter start reminders for scheduled blocks.");
  return suggestions.slice(0, 4);
}

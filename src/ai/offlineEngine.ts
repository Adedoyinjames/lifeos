import type { DaySnapshot, OfflineInsight, WeeklyReport } from "../types";
import { daysBetween, weekStart } from "../utils/time";
import { scoreProductivity } from "../services/productivityScorer";
import { summarizeDay } from "./summarizer";
import { detectBehaviorPatterns, detectLeakage } from "./patterns";

export interface LocalInferenceAdapter {
  isAvailable(): Promise<boolean>;
  summarize(snapshot: DaySnapshot): Promise<OfflineInsight | null>;
}

class DisabledLocalInferenceAdapter implements LocalInferenceAdapter {
  async isAvailable(): Promise<boolean> {
    return false;
  }

  async summarize(): Promise<OfflineInsight | null> {
    return null;
  }
}

let adapter: LocalInferenceAdapter = new DisabledLocalInferenceAdapter();

export function registerLocalInferenceAdapter(nextAdapter: LocalInferenceAdapter): void {
  adapter = nextAdapter;
}

export async function analyzeDay(snapshot: DaySnapshot): Promise<OfflineInsight> {
  try {
    if (await adapter.isAvailable()) {
      const inferred = await adapter.summarize(snapshot);
      if (inferred) return inferred;
    }
  } catch {
    // Deterministic fallback is the reliability layer.
  }
  return summarizeDay(snapshot, scoreProductivity(snapshot));
}

export async function analyzeWeek(snapshots: DaySnapshot[], startDate = weekStart()): Promise<WeeklyReport> {
  const daily = await Promise.all(snapshots.map(analyzeDay));
  const averageScore = daily.length ? Math.round(daily.reduce((sum, item) => sum + item.score.score, 0) / daily.length) : 0;
  const focusedMinutes = daily.reduce((sum, item) => sum + item.score.focusedMinutes, 0);
  const leakedMinutes = daily.reduce((sum, item) => sum + item.score.leakedMinutes, 0);
  const completedTasks = daily.reduce((sum, item) => sum + item.score.completedTasks, 0);
  const combinedSnapshot = snapshots[0] ?? { date: startDate, planItems: [], events: [], focusSessions: [], timeline: [] };
  const days = daysBetween(startDate, 7);
  return {
    startDate,
    endDate: days[6],
    averageScore,
    focusedMinutes,
    leakedMinutes,
    completedTasks,
    commonDistractions: detectLeakage({
      ...combinedSnapshot,
      timeline: snapshots.flatMap((snapshot) => snapshot.timeline),
      events: snapshots.flatMap((snapshot) => snapshot.events),
    }),
    peakEnergyWindows: detectBehaviorPatterns(
      {
        ...combinedSnapshot,
        timeline: snapshots.flatMap((snapshot) => snapshot.timeline),
        events: snapshots.flatMap((snapshot) => snapshot.events),
      },
      {
        score: averageScore,
        plannedMinutes: 0,
        actualProductiveMinutes: 0,
        focusedMinutes,
        leakedMinutes,
        untrackedMinutes: leakedMinutes,
        checkIns: 0,
        completedTasks,
        totalTasks: completedTasks,
        driftMinutes: 0,
        accountabilityScore: averageScore,
        focusStreak: 0,
        grade: averageScore >= 85 ? "excellent" : averageScore >= 70 ? "good" : averageScore >= 45 ? "mixed" : "poor",
      },
    ),
    daily,
  };
}

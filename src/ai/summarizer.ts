import type { DaySnapshot, OfflineInsight, ProductivityScore } from "../types";
import { formatDuration } from "../utils/time";
import { detectBehaviorPatterns, detectLeakage, suggestTomorrow } from "./patterns";

export function summarizeDay(snapshot: DaySnapshot, score: ProductivityScore): OfflineInsight {
  const patterns = detectBehaviorPatterns(snapshot, score);
  const leakage = detectLeakage(snapshot);
  const completionText =
    score.totalTasks === 0 ? "No tasks were planned." : `${score.completedTasks} of ${score.totalTasks} planned tasks were completed.`;
  const summary = `${completionText} You captured ${formatDuration(score.focusedMinutes)} of focus, ${formatDuration(score.leakedMinutes)} of leakage, and ${score.checkIns} check-ins. Execution quality was ${score.grade} with a score of ${score.score}. Accountability score: ${score.accountabilityScore}.`;
  const nextBestAction =
    score.leakedMinutes > 45
      ? "Run a 10 minute reset: close distractions, choose one next task, and start a short focus session."
      : score.completedTasks < score.totalTasks
        ? "Pick the highest priority unfinished task and protect one uninterrupted focus block."
        : "Review the day, archive completed work, and write tomorrow's first task.";
  return {
    date: snapshot.date,
    summary,
    nextBestAction,
    score,
    patterns,
    leakage,
    suggestionsForTomorrow: suggestTomorrow(snapshot, score),
  };
}

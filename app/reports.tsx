import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Card } from "../src/components/Card";
import { EmptyState } from "../src/components/EmptyState";
import { MetricCard } from "../src/components/MetricCard";
import { Screen } from "../src/components/Screen";
import { SectionHeader } from "../src/components/SectionHeader";
import { colors, spacing } from "../src/components/theme";
import { analyzeDay, analyzeWeek } from "../src/ai/offlineEngine";
import { listEvents, listFocusSessions, listPlanItems } from "../src/db/repository";
import { buildDaySnapshot } from "../src/services/timelineBuilder";
import type { OfflineInsight, WeeklyReport } from "../src/types";
import { dateKey, daysBetween, formatDuration, weekStart } from "../src/utils/time";

export default function Reports() {
  const [daily, setDaily] = useState<OfflineInsight | null>(null);
  const [weekly, setWeekly] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const today = dateKey();
      const todaySnapshot = buildDaySnapshot(today, await listPlanItems(today), await listEvents(today), await listFocusSessions(today));
      const week = weekStart();
      const snapshots = await Promise.all(
        daysBetween(week, 7).map(async (day) => buildDaySnapshot(day, await listPlanItems(day), await listEvents(day), await listFocusSessions(day))),
      );
      setDaily(await analyzeDay(todaySnapshot));
      setWeekly(await analyzeWeek(snapshots, week));
    } catch (error) {
      Alert.alert("Could not build reports", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => void load(), [load]));

  return (
    <Screen title="Reports" subtitle="Daily and weekly offline execution analysis." loading={loading}>
      {daily ? (
        <>
          <SectionHeader title="End Of Day" />
          <View style={styles.metrics}>
            <MetricCard label="Productivity" value={`${daily.score.score}`} tone={daily.score.score >= 70 ? "success" : "warning"} />
            <MetricCard label="Accountable" value={`${daily.score.accountabilityScore}`} tone={daily.score.accountabilityScore >= 70 ? "success" : "warning"} />
            <MetricCard label="Completed" value={`${daily.score.completedTasks}/${daily.score.totalTasks}`} />
            <MetricCard label="Leaked" value={formatDuration(daily.score.leakedMinutes)} tone="warning" />
          </View>
          <Card style={styles.stack}>
            <Text style={styles.body}>{daily.summary}</Text>
            <Text style={styles.next}>{daily.nextBestAction}</Text>
          </Card>

          <SectionHeader title="Patterns" />
          {daily.patterns.map((pattern) => (
            <Card key={pattern.title} style={styles.smallCard}>
              <Text style={[styles.patternTitle, pattern.severity === "warning" && styles.warning]}>{pattern.title}</Text>
              <Text style={styles.body}>{pattern.detail}</Text>
            </Card>
          ))}

          <SectionHeader title="Tomorrow" />
          <Card style={styles.stack}>
            {daily.suggestionsForTomorrow.map((suggestion) => (
              <Text key={suggestion} style={styles.body}>• {suggestion}</Text>
            ))}
          </Card>
        </>
      ) : (
        <EmptyState title="No daily report" body="Log focus sessions and events to generate an end-of-day report." />
      )}

      {weekly ? (
        <>
          <SectionHeader title="Weekly Summary" />
          <View style={styles.metrics}>
            <MetricCard label="Avg Score" value={`${weekly.averageScore}`} />
            <MetricCard label="Focus" value={formatDuration(weekly.focusedMinutes)} tone="success" />
            <MetricCard label="Leakage" value={formatDuration(weekly.leakedMinutes)} tone="warning" />
          </View>
          <Card style={styles.stack}>
            <Text style={styles.body}>
              {weekly.completedTasks} tasks completed this week. Most useful next move: protect your strongest energy window and reduce your largest leakage source.
            </Text>
            {weekly.commonDistractions.map((item) => (
              <Text key={item.title} style={styles.body}>• {item.title}: {item.detail}</Text>
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  stack: {
    gap: spacing.sm,
  },
  smallCard: {
    gap: 4,
  },
  body: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  next: {
    color: colors.accent,
    fontWeight: "900",
    fontSize: 15,
    lineHeight: 22,
  },
  patternTitle: {
    color: colors.success,
    fontWeight: "900",
    fontSize: 16,
  },
  warning: {
    color: colors.warning,
  },
});

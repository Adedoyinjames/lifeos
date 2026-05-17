import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { AppButton } from "../src/components/AppButton";
import { Card } from "../src/components/Card";
import { EmptyState } from "../src/components/EmptyState";
import { MetricCard } from "../src/components/MetricCard";
import { QuickLogBar } from "../src/components/QuickLogBar";
import { Screen } from "../src/components/Screen";
import { SectionHeader } from "../src/components/SectionHeader";
import { colors, spacing } from "../src/components/theme";
import { analyzeDay } from "../src/ai/offlineEngine";
import { createEvent, listEvents, listFocusSessions, listPlanItems } from "../src/db/repository";
import { buildDaySnapshot } from "../src/services/timelineBuilder";
import type { OfflineInsight } from "../src/types";
import { dateKey, formatDuration, humanDay } from "../src/utils/time";

export default function Home() {
  const router = useRouter();
  const [insight, setInsight] = useState<OfflineInsight | null>(null);
  const [hasActivity, setHasActivity] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const today = dateKey();
      const planItems = await listPlanItems(today);
      const events = await listEvents(today);
      const focusSessions = await listFocusSessions(today);
      const snapshot = buildDaySnapshot(today, planItems, events, focusSessions);
      setHasActivity(planItems.length > 0 || events.length > 0 || focusSessions.length > 0);
      setInsight(await analyzeDay(snapshot));
    } catch (error) {
      Alert.alert("Could not load dashboard", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => void load(), [load]));

  async function quickLog(type: Parameters<typeof createEvent>[0]["type"], title: string) {
    await createEvent({ type, title });
    await load();
  }

  return (
    <Screen title="LifeOS" subtitle={`${humanDay(dateKey())} · offline personal execution dashboard`} loading={loading}>
      {insight && hasActivity ? (
        <>
          <View style={styles.metrics}>
            <MetricCard label="Score" value={`${insight.score.score}`} tone={insight.score.score >= 70 ? "success" : "warning"} />
            <MetricCard label="Focus" value={formatDuration(insight.score.focusedMinutes)} />
            <MetricCard label="Leakage" value={formatDuration(insight.score.leakedMinutes)} tone="warning" />
          </View>
          <Card style={styles.stack}>
            <Text style={styles.summary}>{insight.summary}</Text>
            <Text style={styles.next}>{insight.nextBestAction}</Text>
          </Card>
        </>
      ) : (
        <EmptyState
          title="No activity yet"
          body="Start by adding today's plan or checking in with the assistant. This dashboard only shows real data after you begin using LifeOS."
        />
      )}

      <SectionHeader title="Quick Actions" />
      <View style={styles.grid}>
        <AppButton label="Assistant" onPress={() => router.push("/assistant")} />
        <AppButton label="Today" onPress={() => router.push("/today")} />
        <AppButton label="Planner" onPress={() => router.push("/planner")} variant="secondary" />
        <AppButton label="Focus" onPress={() => router.push("/focus")} variant="secondary" />
        <AppButton label="Reports" onPress={() => router.push("/reports")} variant="secondary" />
        <AppButton label="Timeline" onPress={() => router.push("/timeline")} variant="ghost" />
        <AppButton label="Settings" onPress={() => router.push("/settings")} variant="ghost" />
      </View>

      <SectionHeader title="One Tap Log" />
      <QuickLogBar onLog={quickLog} />
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
  summary: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 23,
  },
  next: {
    color: colors.accent,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "800",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
});

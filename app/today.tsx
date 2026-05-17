import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { AppButton } from "../src/components/AppButton";
import { Card } from "../src/components/Card";
import { EmptyState } from "../src/components/EmptyState";
import { QuickLogBar } from "../src/components/QuickLogBar";
import { Screen } from "../src/components/Screen";
import { SectionHeader } from "../src/components/SectionHeader";
import { TaskRow } from "../src/components/TaskRow";
import { TextField } from "../src/components/TextField";
import { colors, spacing } from "../src/components/theme";
import { createEvent, finishFocusSession, getActiveFocusSession, listEvents, listFocusSessions, listPlanItems, startFocusSession, updatePlanItem } from "../src/db/repository";
import { getAccountabilityState } from "../src/services/accountabilityService";
import { buildDaySnapshot } from "../src/services/timelineBuilder";
import type { AccountabilityState, FocusSession, PlanItem } from "../src/types";
import { dateKey, diffMinutes, formatDuration } from "../src/utils/time";

export default function Today() {
  const router = useRouter();
  const [items, setItems] = useState<PlanItem[]>([]);
  const [active, setActive] = useState<FocusSession | null>(null);
  const [accountability, setAccountability] = useState<AccountabilityState | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const day = dateKey();
    const plan = await listPlanItems(day);
    const events = await listEvents(day);
    const focusSessions = await listFocusSessions(day);
    setItems(plan);
    setActive(await getActiveFocusSession());
    setAccountability(getAccountabilityState(buildDaySnapshot(day, plan, events, focusSessions)));
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => void load(), [load]));

  async function toggle(item: PlanItem) {
    await updatePlanItem(item.id, { status: item.status === "completed" ? "planned" : "completed" });
    await load();
  }

  async function startFirstFocus() {
    const target = accountability?.dueNow[0] ?? accountability?.overdue[0] ?? items.find((item) => item.status === "planned") ?? items[0];
    await startFocusSession(target?.title ?? "Intentional focus", target?.durationMinutes || 25, target?.id ?? null);
    await load();
  }

  async function stopFocus() {
    if (!active) return;
    await finishFocusSession(active.id, true);
    await load();
  }

  async function saveNote() {
    if (note.trim().length < 2) return;
    try {
      await createEvent({ type: "note", title: "Quick note", note });
      setNote("");
      await load();
    } catch (error) {
      Alert.alert("Could not save note", error instanceof Error ? error.message : "Unknown error");
    }
  }

  return (
    <Screen title="Today" subtitle="Plan, execute, and log the day as it happens." loading={loading}>
      <Card style={styles.live}>
        <Text style={styles.liveTitle}>{active ? active.title : "No active focus session"}</Text>
        <Text style={styles.liveMeta}>
          {active ? `${formatDuration(diffMinutes(active.startAt, new Date().toISOString()))} elapsed` : "Start a session or log what is happening now."}
        </Text>
        <View style={styles.row}>
          <AppButton label={active ? "Stop Focus" : "Start Focus"} onPress={active ? stopFocus : startFirstFocus} />
          <AppButton label="Full Timer" onPress={() => router.push("/focus")} variant="secondary" />
        </View>
      </Card>

      {accountability ? (
        <Card style={styles.live}>
          <Text style={styles.coachLabel}>Accountability Coach · {accountability.accountabilityScore}/100</Text>
          <Text style={styles.coachQuestion}>{accountability.questions[0]?.question}</Text>
          <Text style={styles.liveMeta}>
            Promised: {accountability.promised.length} · Due now: {accountability.dueNow.length} · Overdue: {accountability.overdue.length} · Untracked: {formatDuration(accountability.untrackedMinutes)}
          </Text>
          <View style={styles.row}>
            <AppButton label={accountability.questions[0]?.actionLabel ?? "Check in"} onPress={() => router.push("/focus")} />
            <AppButton label="I did it" onPress={async () => {
              const taskId = accountability.questions[0]?.taskId;
              if (taskId) await updatePlanItem(taskId, { status: "completed" });
              await createEvent({ type: "log", title: "Accountability check-in", note: accountability.questions[0]?.question ?? "" });
              await load();
            }} variant="secondary" />
          </View>
        </Card>
      ) : null}

      <SectionHeader title="Quick Log" />
      <QuickLogBar onLog={async (type, title) => { await createEvent({ type, title }); await load(); }} />

      <TextField label="Quick note" value={note} onChangeText={setNote} multiline placeholder="Capture a thought, blocker, or decision." />
      <AppButton label="Save Note" onPress={saveNote} disabled={note.trim().length < 2} variant="secondary" />

      <SectionHeader title="Today's Plan" action={<AppButton label="Edit" onPress={() => router.push("/planner")} variant="ghost" />} />
      <Card>
        {items.length ? (
          items.map((item) => (
            <TaskRow
              key={item.id}
              item={item}
              onToggle={() => toggle(item)}
              onArchive={async () => { await updatePlanItem(item.id, { status: "archived" }); await load(); }}
            />
          ))
        ) : (
          <EmptyState title="No plan yet" body="Add tasks, goals, or time blocks in the planner." />
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  live: {
    gap: spacing.sm,
  },
  liveTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
  },
  liveMeta: {
    color: colors.muted,
    fontSize: 14,
  },
  coachLabel: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "900",
  },
  coachQuestion: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "800",
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
});

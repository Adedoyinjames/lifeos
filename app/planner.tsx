import { useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "../src/components/AppButton";
import { Card } from "../src/components/Card";
import { EmptyState } from "../src/components/EmptyState";
import { Screen } from "../src/components/Screen";
import { SectionHeader } from "../src/components/SectionHeader";
import { TaskRow } from "../src/components/TaskRow";
import { TextField } from "../src/components/TextField";
import { colors, spacing } from "../src/components/theme";
import { planKindOptions, priorityOptions } from "../src/data/defaults";
import { createPlanItem, listPlanItems, reorderPlanItems, updatePlanItem } from "../src/db/repository";
import { parseDailyBrainDump } from "../src/services/accountabilityService";
import { schedulePlanStartReminders } from "../src/services/notificationService";
import type { PlanItem, PlanKind, Priority } from "../src/types";
import { dateKey } from "../src/utils/time";
import { safeNumber } from "../src/utils/validation";

function isoFromTime(day: string, value: string): string | null {
  if (!value.trim()) return null;
  const match = value.trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!match) throw new Error("Use 24 hour time like 09:30.");
  return new Date(`${day}T${match[1].padStart(2, "0")}:${match[2]}:00`).toISOString();
}

export default function Planner() {
  const [items, setItems] = useState<PlanItem[]>([]);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [kind, setKind] = useState<PlanKind>("task");
  const [priority, setPriority] = useState<Priority>("medium");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [duration, setDuration] = useState("30");
  const [brainDump, setBrainDump] = useState("");
  const [loading, setLoading] = useState(true);
  const day = useMemo(() => dateKey(), []);

  const load = useCallback(async () => {
    setItems(await listPlanItems(day));
    setLoading(false);
  }, [day]);

  useFocusEffect(useCallback(() => void load(), [load]));

  async function addItem() {
    try {
      const startAt = isoFromTime(day, start);
      const endAt = isoFromTime(day, end);
      await createPlanItem({
        date: day,
        title,
        notes,
        kind,
        priority,
        startAt,
        endAt,
        durationMinutes: safeNumber(duration, 30, 0, 480),
        sortOrder: items.length,
      });
      setTitle("");
      setNotes("");
      setStart("");
      setEnd("");
      setDuration("30");
      await schedulePlanStartReminders(await listPlanItems(day));
      await load();
    } catch (error) {
      Alert.alert("Could not add plan item", error instanceof Error ? error.message : "Unknown error");
    }
  }

  async function addBrainDump() {
    try {
      const parsed = parseDailyBrainDump(brainDump);
      if (!parsed.length) return;
      for (const [index, item] of parsed.entries()) {
        await createPlanItem({
          date: day,
          title: item.title,
          kind: "task",
          priority: item.priority,
          startAt: item.start ? isoFromTime(day, item.start) : null,
          endAt: item.end ? isoFromTime(day, item.end) : null,
          durationMinutes: item.start && item.end ? 0 : 30,
          sortOrder: items.length + index,
        });
      }
      setBrainDump("");
      await schedulePlanStartReminders(await listPlanItems(day));
      await load();
    } catch (error) {
      Alert.alert("Could not turn your list into a plan", error instanceof Error ? error.message : "Unknown error");
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const next = [...items];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    await reorderPlanItems(next);
    await load();
  }

  return (
    <Screen title="Planner" subtitle="Create tasks, time blocks, priorities, and goals for today." loading={loading}>
      <Card style={styles.form}>
        <Text style={styles.helperTitle}>Fast daily capture</Text>
        <Text style={styles.helperText}>Write one commitment per line. Add a time range like 09:00-10:30, or start a high priority line with !!!.</Text>
        <TextField
          label="What will you do today?"
          value={brainDump}
          onChangeText={setBrainDump}
          placeholder={"!!! Study algorithms 09:00-10:30\nCall client\nGym 18:00-19:00"}
          multiline
        />
        <AppButton label="Turn Into Today's Plan" onPress={addBrainDump} disabled={brainDump.trim().length < 2} />
      </Card>

      <Card style={styles.form}>
        <TextField label="Title" value={title} onChangeText={setTitle} placeholder="Write the next concrete outcome" />
        <TextField label="Notes" value={notes} onChangeText={setNotes} placeholder="Definition of done, context, constraints" multiline />
        <View style={styles.pills}>
          {planKindOptions.map((option) => (
            <Pressable key={option} onPress={() => setKind(option)} style={[styles.pill, kind === option && styles.pillActive]}>
              <Text style={[styles.pillText, kind === option && styles.pillTextActive]}>{option.replace("_", " ")}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.pills}>
          {priorityOptions.map((option) => (
            <Pressable key={option} onPress={() => setPriority(option)} style={[styles.pill, priority === option && styles.pillActive]}>
              <Text style={[styles.pillText, priority === option && styles.pillTextActive]}>{option}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.row}>
          <TextField label="Start" value={start} onChangeText={setStart} placeholder="09:00" style={styles.smallInput} />
          <TextField label="End" value={end} onChangeText={setEnd} placeholder="10:30" style={styles.smallInput} />
          <TextField label="Minutes" value={duration} onChangeText={setDuration} keyboardType="number-pad" style={styles.smallInput} />
        </View>
        <AppButton label="Add To Plan" onPress={addItem} disabled={title.trim().length < 2} />
      </Card>

      <SectionHeader title="Plan Order" />
      <Card>
        {items.length ? (
          items.map((item, index) => (
            <TaskRow
              key={item.id}
              item={item}
              onToggle={async () => { await updatePlanItem(item.id, { status: item.status === "completed" ? "planned" : "completed" }); await load(); }}
              onArchive={async () => { await updatePlanItem(item.id, { status: "archived" }); await load(); }}
              onMoveUp={index > 0 ? () => move(index, -1) : undefined}
              onMoveDown={index < items.length - 1 ? () => move(index, 1) : undefined}
            />
          ))
        ) : (
          <EmptyState title="The day is still blank" body="Add one high-priority task, one support task, and one recovery block." />
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.md,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  smallInput: {
    minWidth: 92,
  },
  pills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  pill: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceSoft,
  },
  pillActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  pillText: {
    color: colors.text,
    fontWeight: "800",
  },
  pillTextActive: {
    color: "#051018",
  },
  helperTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  helperText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
});

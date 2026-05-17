import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { PlanItem } from "../types";
import { plannedWindowLabel } from "../utils/time";
import { colors, spacing } from "./theme";

export function TaskRow({
  item,
  onToggle,
  onArchive,
  onMoveUp,
  onMoveDown,
}: {
  item: PlanItem;
  onToggle: () => void;
  onArchive: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const done = item.status === "completed";
  return (
    <View style={styles.row}>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: done }} onPress={onToggle} style={[styles.check, done && styles.checked]}>
        <Text style={styles.checkText}>{done ? "✓" : ""}</Text>
      </Pressable>
      <View style={styles.body}>
        <Text style={[styles.title, done && styles.done]}>{item.title}</Text>
        <Text style={styles.meta}>
          {item.priority.toUpperCase()} · {item.kind.replace("_", " ")} · {plannedWindowLabel(item.startAt, item.endAt)}
        </Text>
        {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
      </View>
      <View style={styles.actions}>
        {onMoveUp ? <Pressable onPress={onMoveUp}><Text style={styles.action}>↑</Text></Pressable> : null}
        {onMoveDown ? <Pressable onPress={onMoveDown}><Text style={styles.action}>↓</Text></Pressable> : null}
        <Pressable onPress={onArchive}><Text style={styles.archive}>×</Text></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderColor: colors.border,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 3,
  },
  checked: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  checkText: {
    color: "#07120B",
    fontWeight: "900",
  },
  body: {
    flex: 1,
    gap: 3,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  done: {
    color: colors.muted,
    textDecorationLine: "line-through",
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
  },
  notes: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  action: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: "900",
  },
  archive: {
    color: colors.danger,
    fontSize: 24,
    fontWeight: "900",
  },
});

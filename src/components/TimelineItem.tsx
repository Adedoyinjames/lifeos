import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { TimelineSegment } from "../types";
import { formatClock, formatDuration } from "../utils/time";
import { colors, spacing } from "./theme";

export function TimelineItem({ segment }: { segment: TimelineSegment }) {
  const tone = segment.productive ? colors.success : segment.type === "gap" ? colors.warning : colors.danger;
  return (
    <View style={styles.row}>
      <View style={styles.time}>
        <Text style={styles.clock}>{formatClock(segment.startAt)}</Text>
        <Text style={styles.duration}>{formatDuration(segment.minutes)}</Text>
      </View>
      <View style={[styles.line, { backgroundColor: tone }]} />
      <View style={styles.body}>
        <Text style={styles.title}>{segment.title}</Text>
        <Text style={styles.meta}>
          {segment.type.replace("_", " ")}
          {segment.plannedTitle ? ` · planned: ${segment.plannedTitle}` : ""}
          {segment.driftMinutes ? ` · drift ${formatDuration(segment.driftMinutes)}` : ""}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 58,
  },
  time: {
    width: 72,
  },
  clock: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 13,
  },
  duration: {
    color: colors.muted,
    fontSize: 12,
  },
  line: {
    width: 4,
    borderRadius: 4,
  },
  body: {
    flex: 1,
    paddingBottom: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
});

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Card } from "./Card";
import { colors, spacing } from "./theme";

export function MetricCard({ label, value, tone = "accent" }: { label: string; value: string; tone?: "accent" | "success" | "warning" }) {
  return (
    <Card style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: colors[tone] }]}>{value}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 145,
    gap: spacing.xs,
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  value: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900",
  },
});

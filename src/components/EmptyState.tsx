import React from "react";
import { StyleSheet, Text } from "react-native";
import { Card } from "./Card";
import { colors } from "./theme";

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <Card style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 6,
  },
  title: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 17,
  },
  body: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
});

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "./theme";

export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 20,
  },
});

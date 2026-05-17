import React from "react";
import { StyleSheet, View } from "react-native";
import type { EventType } from "../types";
import { quickLogOptions } from "../data/defaults";
import { AppButton } from "./AppButton";
import { spacing } from "./theme";

export function QuickLogBar({ onLog }: { onLog: (type: EventType, title: string) => void }) {
  return (
    <View style={styles.grid}>
      {quickLogOptions.map((option) => (
        <AppButton
          key={option.type}
          label={option.title}
          variant={option.type === "distraction" ? "danger" : "secondary"}
          onPress={() => onLog(option.type, option.title)}
          style={styles.button}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  button: {
    flexGrow: 1,
  },
});

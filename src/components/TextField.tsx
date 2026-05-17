import React from "react";
import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { colors, radius, spacing } from "./theme";

export function TextField({ label, style, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        {...props}
        style={[styles.input, props.multiline && styles.multiline, style]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  label: {
    color: colors.muted,
    fontWeight: "700",
    fontSize: 13,
  },
  input: {
    minHeight: 46,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: 16,
  },
  multiline: {
    minHeight: 92,
    paddingTop: spacing.sm,
    textAlignVertical: "top",
  },
});

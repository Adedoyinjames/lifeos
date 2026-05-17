import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "../src/components/AppButton";
import { Card } from "../src/components/Card";
import { QuickLogBar } from "../src/components/QuickLogBar";
import { Screen } from "../src/components/Screen";
import { SectionHeader } from "../src/components/SectionHeader";
import { TextField } from "../src/components/TextField";
import { colors, spacing } from "../src/components/theme";
import { defaultFocusMinutes } from "../src/data/defaults";
import { createEvent, finishFocusSession, getActiveFocusSession, startFocusSession } from "../src/db/repository";
import { scheduleFocusNudge } from "../src/services/notificationService";
import type { FocusSession } from "../src/types";
import { diffMinutes, formatDuration } from "../src/utils/time";

export default function Focus() {
  const [active, setActive] = useState<FocusSession | null>(null);
  const [title, setTitle] = useState("Deep work");
  const [minutes, setMinutes] = useState(25);
  const [elapsed, setElapsed] = useState(0);
  const [distraction, setDistraction] = useState("");

  const load = useCallback(async () => {
    const session = await getActiveFocusSession();
    setActive(session);
    setElapsed(session ? diffMinutes(session.startAt, new Date().toISOString()) : 0);
  }, []);

  useFocusEffect(useCallback(() => void load(), [load]));

  useEffect(() => {
    const id = setInterval(() => {
      if (active) setElapsed(diffMinutes(active.startAt, new Date().toISOString()));
    }, 15000);
    return () => clearInterval(id);
  }, [active]);

  async function start() {
    try {
      await startFocusSession(title, minutes);
      await scheduleFocusNudge(minutes);
      await load();
    } catch (error) {
      Alert.alert("Could not start focus", error instanceof Error ? error.message : "Unknown error");
    }
  }

  async function stop(completed: boolean) {
    if (!active) return;
    await finishFocusSession(active.id, completed);
    await load();
  }

  async function captureDistraction() {
    const value = distraction.trim() || "Distraction";
    await createEvent({ type: "distraction", title: value });
    setDistraction("");
  }

  return (
    <Screen title="Focus" subtitle="Start a session, capture interruptions, and keep the timeline honest.">
      <Card style={styles.timer}>
        <Text style={styles.timerText}>{active ? formatDuration(elapsed) : `${minutes}:00`}</Text>
        <Text style={styles.timerLabel}>{active ? active.title : "Ready for one clean block"}</Text>
        {active ? (
          <View style={styles.row}>
            <AppButton label="Complete" onPress={() => stop(true)} />
            <AppButton label="Stop" onPress={() => stop(false)} variant="danger" />
          </View>
        ) : (
          <>
            <TextField label="Session title" value={title} onChangeText={setTitle} />
            <View style={styles.pills}>
              {defaultFocusMinutes.map((option) => (
                <Pressable key={option} onPress={() => setMinutes(option)} style={[styles.pill, minutes === option && styles.pillActive]}>
                  <Text style={[styles.pillText, minutes === option && styles.pillTextActive]}>{option}m</Text>
                </Pressable>
              ))}
            </View>
            <AppButton label="Start Focus Session" onPress={start} disabled={title.trim().length < 2} />
          </>
        )}
      </Card>

      <SectionHeader title="Capture Interruption" />
      <TextField label="Distraction" value={distraction} onChangeText={setDistraction} placeholder="What pulled you away?" />
      <AppButton label="Log Distraction" onPress={captureDistraction} variant="secondary" />

      <SectionHeader title="Quick Log" />
      <QuickLogBar onLog={async (type, logTitle) => createEvent({ type, title: logTitle })} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  timer: {
    gap: spacing.md,
    alignItems: "stretch",
  },
  timerText: {
    color: colors.accent,
    fontSize: 56,
    lineHeight: 64,
    fontWeight: "900",
    textAlign: "center",
  },
  timerLabel: {
    color: colors.text,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
  },
  pills: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
    justifyContent: "center",
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
  },
  pillText: {
    color: colors.text,
    fontWeight: "900",
  },
  pillTextActive: {
    color: "#061018",
  },
});

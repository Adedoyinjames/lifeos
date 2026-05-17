import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { AppButton } from "../src/components/AppButton";
import { Card } from "../src/components/Card";
import { EmptyState } from "../src/components/EmptyState";
import { Screen } from "../src/components/Screen";
import { SectionHeader } from "../src/components/SectionHeader";
import { TextField } from "../src/components/TextField";
import { colors, spacing } from "../src/components/theme";
import { runAssistantCommand } from "../src/ai/assistantEngine";
import { getPreference, setPreference } from "../src/db/repository";
import { listenOnce, speak, speechEngineStatus } from "../src/services/speechEngine";
import type { AssistantMessage, AssistantProfile } from "../src/types";
import { nowIso } from "../src/utils/time";
import { createId } from "../src/utils/validation";

const HOTWORD = "Hey Bob";

function message(role: AssistantMessage["role"], text: string): AssistantMessage {
  return { id: createId("msg"), role, text, createdAt: nowIso() };
}

export default function Assistant() {
  const router = useRouter();
  const [profile, setProfile] = useState<AssistantProfile>({
    hotword: HOTWORD,
    speakReplies: true,
  });
  const [configured, setConfigured] = useState(false);
  const [speechStatus, setSpeechStatus] = useState<"ready" | "missing">("missing");
  const [command, setCommand] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([
    message("assistant", "I am ready. Ask me what to do next, tell me what to remember, or ask me to open an app."),
  ]);

  useEffect(() => {
    let mounted = true;
    Promise.all([getPreference("assistantHotword", ""), getPreference("assistantSpeak", "true"), speechEngineStatus()])
      .then(([hotword, speakReplies, status]) => {
        if (!mounted) return;
        setProfile({ hotword: hotword || HOTWORD, speakReplies: speakReplies !== "false" });
        setConfigured(Boolean(hotword));
        setSpeechStatus(status);
      })
      .catch((error) => Alert.alert("Assistant setup failed", error instanceof Error ? error.message : "Unknown error"));
    return () => {
      mounted = false;
    };
  }, []);

  async function saveProfile(next = profile) {
    await setPreference("assistantHotword", next.hotword);
    await setPreference("assistantSpeak", String(next.speakReplies));
    setConfigured(true);
  }

  async function submit(text = command) {
    const value = text.trim();
    if (!value) return;
    setBusy(true);
    setCommand("");
    setMessages((current) => [message("user", value), ...current]);
    try {
      const result = await runAssistantCommand(value, profile.hotword);
      setMessages((current) => [message("assistant", result.spokenText), ...current]);
      if (profile.speakReplies) await speak(result.spokenText);
      if (result.route) router.push(result.route as any);
    } catch (error) {
      const textError = error instanceof Error ? error.message : "I could not complete that command.";
      setMessages((current) => [message("assistant", textError), ...current]);
      if (profile.speakReplies) await speak(textError);
    } finally {
      setBusy(false);
    }
  }

  async function listen() {
    try {
      setBusy(true);
      const heard = await listenOnce();
      setCommand(heard);
      await submit(heard);
    } catch (error) {
      Alert.alert("Voice command", error instanceof Error ? error.message : "I did not catch that.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen title="Assistant" subtitle="A time-conscious command center for planning, focus, check-ins, calls, apps, and music.">
      {!configured ? (
        <Card style={styles.stack}>
          <Text style={styles.title}>Choose how to wake me</Text>
          <Text style={styles.body}>The assistant listens for one hotword: Hey Bob. Press Listen, say Hey Bob, then say the command.</Text>
          <Text style={styles.status}>Speech engine: {speechStatus === "ready" ? "Offline STT/TTS ready" : "Speech models missing from this build"}</Text>
          <View style={styles.setting}>
            <Text style={styles.body}>Speak replies aloud</Text>
            <Switch value={profile.speakReplies} onValueChange={(value) => setProfile((current) => ({ ...current, speakReplies: value }))} />
          </View>
          <AppButton label="Save Assistant" onPress={() => void saveProfile()} />
        </Card>
      ) : null}

      <Card style={styles.stack}>
        <Text style={styles.title}>{profile.hotword}</Text>
        <Text style={styles.body}>Try: “{profile.hotword}, what should I do now?” or “{profile.hotword}, add task call Ada”.</Text>
        <TextField label="Command" value={command} onChangeText={setCommand} placeholder={`${profile.hotword}, start focus on studying`} multiline />
        <View style={styles.row}>
          <AppButton label="Run Command" onPress={() => void submit()} disabled={busy || command.trim().length < 2} />
          <AppButton label="Listen" onPress={() => void listen()} disabled={busy} variant="secondary" />
        </View>
      </Card>

      <SectionHeader title="Command Examples" />
      <Card style={styles.stack}>
        {[
          `${profile.hotword}, what should I do now?`,
          `${profile.hotword}, what time is it?`,
          `${profile.hotword}, how long until my next task?`,
          `${profile.hotword}, add task review my notes`,
          `${profile.hotword}, start focus for 45 minutes`,
          `${profile.hotword}, stop focus`,
          `${profile.hotword}, log I am in a meeting`,
          `${profile.hotword}, directions to Ikeja`,
          `${profile.hotword}, call 08012345678`,
          `${profile.hotword}, open YouTube`,
          `${profile.hotword}, take a picture`,
          `${profile.hotword}, find file`,
          `${profile.hotword}, play music`,
          `${profile.hotword}, how did I do today?`,
        ].map((example) => (
          <Pressable key={example} onPress={() => setCommand(example)}>
            <Text style={styles.example}>{example}</Text>
          </Pressable>
        ))}
      </Card>

      <SectionHeader title="Conversation" />
      {messages.length ? (
        messages.map((item) => (
          <Card key={item.id} style={item.role === "user" ? styles.userMessage : styles.assistantMessage}>
            <Text style={styles.messageRole}>{item.role}</Text>
            <Text style={styles.messageText}>{item.text}</Text>
          </Card>
        ))
      ) : (
        <EmptyState title="No conversation yet" body="Run a command and I will answer here." />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  body: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  setting: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
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
  example: {
    color: colors.accent,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "800",
  },
  status: {
    color: colors.warning,
    fontSize: 14,
    fontWeight: "800",
  },
  userMessage: {
    backgroundColor: colors.surfaceSoft,
  },
  assistantMessage: {
    borderColor: colors.accentStrong,
  },
  messageRole: {
    color: colors.muted,
    textTransform: "uppercase",
    fontWeight: "900",
    fontSize: 11,
    marginBottom: spacing.xs,
  },
  messageText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
});

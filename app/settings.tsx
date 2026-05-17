import React, { useState } from "react";
import { Alert, StyleSheet, Switch, Text, View } from "react-native";
import { AppButton } from "../src/components/AppButton";
import { Card } from "../src/components/Card";
import { Screen } from "../src/components/Screen";
import { SectionHeader } from "../src/components/SectionHeader";
import { colors, spacing } from "../src/components/theme";
import { useAppContext } from "../src/data/AppContext";
import { listPlanItems } from "../src/db/repository";
import { configureNotifications, cancelAllNudges, scheduleDailyAccountabilityNudges, scheduleLivingAssistantNudges } from "../src/services/notificationService";
import { exportBackupFile, importBackupFile } from "../src/services/importExportService";
import { dateKey } from "../src/utils/time";

export default function Settings() {
  const { darkMode, privacyLock, setDarkMode, setPrivacyLock, resetAllData } = useAppContext();
  const [busy, setBusy] = useState(false);

  async function run(label: string, action: () => Promise<void>) {
    try {
      setBusy(true);
      await action();
      Alert.alert("Done", label);
    } catch (error) {
      Alert.alert("LifeOS error", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  function confirmReset() {
    Alert.alert("Reset all local data?", "This deletes plans, events, sessions, and preferences stored on this device.", [
      { text: "Cancel", style: "cancel" },
      { text: "Reset", style: "destructive", onPress: () => void run("All local data was reset.", resetAllData) },
    ]);
  }

  return (
    <Screen title="Settings" subtitle="Everything stays on this device. No backend, no cloud sync, no runtime API calls.">
      <SectionHeader title="Preferences" />
      <Card style={styles.stack}>
        <View style={styles.setting}>
          <View style={styles.settingText}>
            <Text style={styles.title}>Dark interface</Text>
            <Text style={styles.body}>Minimal high-contrast theme for daily use.</Text>
          </View>
          <Switch value={darkMode} onValueChange={(value) => void setDarkMode(value)} />
        </View>
        <View style={styles.setting}>
          <View style={styles.settingText}>
            <Text style={styles.title}>Privacy lock hint</Text>
            <Text style={styles.body}>Keeps sensitive summaries visually understated.</Text>
          </View>
          <Switch value={privacyLock} onValueChange={(value) => void setPrivacyLock(value)} />
        </View>
      </Card>

      <SectionHeader title="Notifications" />
      <Card style={styles.stack}>
        <Text style={styles.body}>Local reminders are scheduled by the device. They do not contact a server.</Text>
        <View style={styles.row}>
          <AppButton label="Enable" disabled={busy} onPress={() => void run("Notifications are configured.", async () => { await configureNotifications(); })} />
          <AppButton label="Accountability Nudges" disabled={busy} onPress={() => void run("Today's accountability nudges are scheduled.", async () => {
            await scheduleDailyAccountabilityNudges(await listPlanItems(dateKey()));
          })} variant="secondary" />
          <AppButton label="Assistant Reminders" disabled={busy} onPress={() => void run("Assistant reminders are scheduled.", async () => {
            await scheduleLivingAssistantNudges(await listPlanItems(dateKey()));
          })} variant="secondary" />
          <AppButton label="Clear Nudges" disabled={busy} onPress={() => void run("Scheduled nudges cleared.", cancelAllNudges)} variant="secondary" />
        </View>
      </Card>

      <SectionHeader title="Backups" />
      <Card style={styles.stack}>
        <Text style={styles.body}>Export and import a JSON backup file. The file contains only local LifeOS data.</Text>
        <View style={styles.row}>
          <AppButton label="Export" disabled={busy} onPress={() => void run("Backup exported.", async () => { await exportBackupFile(); })} />
          <AppButton label="Import" disabled={busy} onPress={() => void run("Backup imported.", importBackupFile)} variant="secondary" />
        </View>
      </Card>

      <SectionHeader title="Reset" />
      <Card style={styles.stack}>
        <Text style={styles.body}>Delete the on-device database and preferences.</Text>
        <AppButton label="Reset Local Data" disabled={busy} onPress={confirmReset} variant="danger" />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.md,
  },
  setting: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  settingText: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 16,
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
});

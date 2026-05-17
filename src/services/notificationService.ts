import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { PlanItem } from "../types";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const CHANNEL_ID = "lifeos-reminders";

export async function configureNotifications(): Promise<boolean> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "LifeOS reminders",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#66E3FF",
    });
  }
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

async function scheduleDateNotification(title: string, body: string, date: Date): Promise<string | null> {
  if (date.getTime() <= Date.now()) return null;
  const granted = await configureNotifications();
  if (!granted) return null;
  return Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: CHANNEL_ID,
    },
  });
}

export async function scheduleFocusNudge(minutesFromNow = 25): Promise<string | null> {
  const granted = await configureNotifications();
  if (!granted) return null;
  const trigger = new Date(Date.now() + minutesFromNow * 60 * 1000);
  return Notifications.scheduleNotificationAsync({
    content: {
      title: "Focus check-in",
      body: "Log what happened and choose the next best action.",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: trigger,
      channelId: CHANNEL_ID,
    },
  });
}

export async function schedulePlanStartReminders(items: PlanItem[]): Promise<number> {
  let count = 0;
  for (const item of items) {
    if (!item.startAt || item.status !== "planned") continue;
    const date = new Date(item.startAt);
    const id = await scheduleDateNotification(
      "Time to prove the plan",
      `You said "${item.title}" starts now. Are you doing it?`,
      date,
    );
    if (id) count += 1;
  }
  return count;
}

export async function scheduleDailyAccountabilityNudges(items: PlanItem[]): Promise<number> {
  await cancelAllNudges();
  let count = await schedulePlanStartReminders(items);
  const now = new Date();
  const checkInHours = [10, 13, 16, 19];
  for (const hour of checkInHours) {
    const checkIn = new Date(now);
    checkIn.setHours(hour, 0, 0, 0);
    const id = await scheduleDateNotification(
      "Accountability check-in",
      "What are you doing right now, and is it what you planned?",
      checkIn,
    );
    if (id) count += 1;
  }
  const review = new Date(now);
  review.setHours(21, 0, 0, 0);
  const reviewId = await scheduleDateNotification(
    "End-of-day review",
    "What did you finish, what slipped, and what is tomorrow's first move?",
    review,
  );
  if (reviewId) count += 1;
  return count;
}

export async function scheduleLivingAssistantNudges(items: PlanItem[]): Promise<number> {
  await cancelAllNudges();
  let count = await schedulePlanStartReminders(items);
  const now = new Date();
  const pending = items.filter((item) => item.status === "planned").length;
  const lines = [
    `Good morning. You have ${pending} task${pending === 1 ? "" : "s"} on your list. Choose the first one and start clean.`,
    "Midday check. Are you doing what you said you would do?",
    "Afternoon reset. Log your current activity so the timeline stays honest.",
    "Evening review. What finished, what slipped, and what should start tomorrow?",
  ];
  const hours = [8, 12, 16, 21];
  for (const [index, hour] of hours.entries()) {
    const date = new Date(now);
    date.setHours(hour, 0, 0, 0);
    const id = await scheduleDateNotification("LifeOS assistant", lines[index], date);
    if (id) count += 1;
  }
  return count;
}

export async function cancelAllNudges(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

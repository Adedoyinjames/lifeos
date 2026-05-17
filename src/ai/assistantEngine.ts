import { createEvent, createPlanItem, finishFocusSession, getActiveFocusSession, listEvents, listFocusSessions, listPlanItems, startFocusSession } from "../db/repository";
import { getAccountabilityState } from "../services/accountabilityService";
import { buildDaySnapshot } from "../services/timelineBuilder";
import { callContactOrNumber, getCurrentLocationSummary, knownApps, openDirections, openKnownApp, openMapsSearch, pickFile, playMusic, readTextFileMaybe } from "../services/deviceActions";
import type { AssistantCommandResult, EventType } from "../types";
import { dateKey, diffMinutes, formatClock, formatDuration } from "../utils/time";
import { assertTitle } from "../utils/validation";
import { analyzeDay } from "./offlineEngine";

function cleanCommand(command: string, hotword: string): string {
  const trimmed = command.trim();
  const lower = trimmed.toLowerCase();
  const hot = hotword.toLowerCase();
  if (lower.startsWith(hot)) return trimmed.slice(hotword.length).replace(/^[,\s]+/, "");
  return trimmed;
}

function timeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function eventTypeFor(command: string): EventType {
  if (command.includes("break")) return "break";
  if (command.includes("meeting")) return "meeting";
  if (command.includes("distract")) return "distraction";
  if (command.includes("switch")) return "context_switch";
  if (command.includes("note")) return "note";
  return "log";
}

function extractAfter(command: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = command.match(pattern);
    if (match?.[1]?.trim()) return match[1].trim();
  }
  return null;
}

function parseFocusMinutes(command: string): number {
  const match = command.match(/(?:for\s+)?(\d{1,3})\s*(?:minute|minutes|min|mins|m)\b/i);
  if (!match) return 25;
  return Math.min(Math.max(Number(match[1]), 1), 180);
}

function describeNextTask(items: Awaited<ReturnType<typeof listPlanItems>>): string {
  const now = new Date();
  const planned = items
    .filter((item) => item.status === "planned")
    .sort((a, b) => {
      const left = a.startAt ? new Date(a.startAt).getTime() : Number.MAX_SAFE_INTEGER;
      const right = b.startAt ? new Date(b.startAt).getTime() : Number.MAX_SAFE_INTEGER;
      return left - right;
    });
  const next = planned[0];
  if (!next) return "You do not have another open task scheduled today.";
  if (!next.startAt) return `Your next open task is "${next.title}". It has no fixed start time.`;
  const minutes = diffMinutes(now.toISOString(), next.startAt);
  if (new Date(next.startAt).getTime() <= now.getTime()) {
    return `"${next.title}" is due now.`;
  }
  return `Your next task is "${next.title}" at ${formatClock(next.startAt)}, in about ${formatDuration(minutes)}.`;
}

export async function runAssistantCommand(rawCommand: string, hotword: string): Promise<AssistantCommandResult> {
  const command = cleanCommand(rawCommand, hotword);
  const lower = command.toLowerCase();
  const today = dateKey();

  if (!command) {
    return {
      actionType: "answer",
      success: true,
      spokenText: `${timeGreeting()}. I am listening. Tell me what you want to do, log, open, or remember.`,
    };
  }

  if (/(what time|tell me the time|current time|time now)/i.test(lower)) {
    const now = new Date();
    return {
      actionType: "answer",
      success: true,
      spokenText: `It is ${formatClock(now.toISOString())}. ${describeNextTask(await listPlanItems(today))}`,
    };
  }

  if (/(next task|next plan|how long until|time to next|time remaining)/i.test(lower)) {
    return {
      actionType: "answer",
      success: true,
      spokenText: describeNextTask(await listPlanItems(today)),
    };
  }

  if (/(hello|hi|good morning|good afternoon|good evening|wake up)/i.test(lower)) {
    const snapshot = buildDaySnapshot(today, await listPlanItems(today), await listEvents(today), await listFocusSessions(today));
    const state = getAccountabilityState(snapshot);
    return {
      actionType: "answer",
      success: true,
      spokenText: `${timeGreeting()}. You have ${state.promised.length} commitments today. ${state.questions[0]?.question}`,
    };
  }

  if (/(what should i do|next action|what now|hold me accountable)/i.test(lower)) {
    const snapshot = buildDaySnapshot(today, await listPlanItems(today), await listEvents(today), await listFocusSessions(today));
    const state = getAccountabilityState(snapshot);
    return {
      actionType: "answer",
      success: true,
      spokenText: state.questions[0]?.question ?? "Choose the smallest useful next action and start a focus session.",
    };
  }

  if (/(what are my tasks|task list|todo list|to do list|what do i have today)/i.test(lower)) {
    const items = await listPlanItems(today);
    const open = items.filter((item) => item.status === "planned");
    if (!open.length) {
      return {
        actionType: "answer",
        success: true,
        spokenText: "You do not have open tasks yet. Tell me one thing you must finish today.",
      };
    }
    const topTasks = open.slice(0, 4).map((item, index) => `${index + 1}. ${item.title}`).join(" ");
    return {
      actionType: "answer",
      success: true,
      spokenText: `You have ${open.length} open task${open.length === 1 ? "" : "s"}. ${topTasks}`,
    };
  }

  if (/(summary|how did i do|report|today so far)/i.test(lower)) {
    const snapshot = buildDaySnapshot(today, await listPlanItems(today), await listEvents(today), await listFocusSessions(today));
    const insight = await analyzeDay(snapshot);
    return {
      actionType: "answer",
      success: true,
      spokenText: insight.summary,
    };
  }

  const taskTitle = extractAfter(command, [/^(?:add|create|remember|plan)\s+(?:a\s+)?(?:task|todo|commitment)\s+(?:to\s+)?(.+)$/i, /^remind me to\s+(.+)$/i]);
  if (taskTitle) {
    const item = await createPlanItem({
      date: today,
      title: assertTitle(taskTitle),
      priority: lower.includes("important") || lower.includes("urgent") ? "high" : "medium",
      kind: "task",
      durationMinutes: 30,
      sortOrder: Date.now(),
    });
    return {
      actionType: "add_task",
      success: true,
      spokenText: `Added "${item.title}" to today's plan. I will ask you about it later.`,
    };
  }

  const focusTitle = extractAfter(command, [/^start\s+(?:a\s+)?focus\s+(?:session\s+)?(?:on\s+)?(.+)$/i, /^focus on\s+(.+)$/i]);
  if (focusTitle || /^start focus/i.test(command)) {
    const minutes = parseFocusMinutes(command);
    const title = focusTitle?.replace(/\bfor\s+\d{1,3}\s*(?:minute|minutes|min|mins|m)\b/i, "").trim() || "Focused work";
    const session = await startFocusSession(title, minutes);
    return {
      actionType: "start_focus",
      success: true,
      spokenText: `Focus started for "${session.title}" for ${formatDuration(minutes)}.`,
    };
  }

  if (/^(stop|end|finish)\s+focus/i.test(lower)) {
    const active = await getActiveFocusSession();
    if (!active) {
      return { actionType: "stop_focus", success: false, spokenText: "There is no active focus session right now." };
    }
    await finishFocusSession(active.id, true);
    return { actionType: "stop_focus", success: true, spokenText: `Focus session "${active.title}" is complete.` };
  }

  const logText = extractAfter(command, [/^(?:log|record)\s+(.+)$/i, /^i am\s+(.+)$/i, /^i'm\s+(.+)$/i, /^note\s+(.+)$/i]);
  if (logText) {
    const type = eventTypeFor(lower);
    await createEvent({ type, title: type === "note" ? "Voice note" : logText, note: type === "note" ? logText : "" });
    return {
      actionType: "log_event",
      success: true,
      spokenText: `Logged: ${logText}.`,
    };
  }

  const callTarget = extractAfter(command, [/^call\s+(.+)$/i, /^dial\s+(.+)$/i]);
  if (callTarget) {
    const label = await callContactOrNumber(callTarget);
    return {
      actionType: "call",
      success: true,
      spokenText: `Opening the dialer for ${label}.`,
    };
  }

  if (/(where am i|my location|current location)/i.test(lower)) {
    return {
      actionType: "answer",
      success: true,
      spokenText: await getCurrentLocationSummary(),
    };
  }

  const destination = extractAfter(command, [/^(?:directions|direction|navigate|route)\s+(?:to\s+)?(.+)$/i, /^how long (?:will it take )?(?:to|get to|drive to)\s+(.+)$/i]);
  if (destination) {
    await openDirections(destination);
    return {
      actionType: "answer",
      success: true,
      spokenText: `Opening directions to ${destination}. Google Maps will calculate the live route and travel time.`,
    };
  }

  const mapSearch = extractAfter(command, [/^(?:map|find place|search map)\s+(.+)$/i]);
  if (mapSearch) {
    await openMapsSearch(mapSearch);
    return {
      actionType: "answer",
      success: true,
      spokenText: `Searching the map for ${mapSearch}.`,
    };
  }

  if (/(take (a )?picture|take (a )?photo|open camera|camera)/i.test(lower)) {
    return {
      actionType: "open_camera",
      success: true,
      route: "/camera",
      spokenText: "Opening the camera. Take a picture and I will store it safely inside LifeOS.",
    };
  }

  const appName = extractAfter(command, [/^open\s+(.+)$/i, /^launch\s+(.+)$/i]);
  if (appName) {
    await openKnownApp(appName);
    return {
      actionType: "open_app",
      success: true,
      spokenText: `Opening ${appName}.`,
    };
  }

  if (/(find file|look for file|open file|pick file|choose file)/i.test(lower)) {
    const file = await pickFile();
    if (!file) {
      return { actionType: "pick_file", success: false, spokenText: "No file selected." };
    }
    const text = await readTextFileMaybe(file.uri);
    if (text) {
      await createEvent({ type: "note", title: "Imported file", note: `${file.name}\n\n${text.slice(0, 1800)}` });
      return { actionType: "pick_file", success: true, spokenText: `Imported ${file.name}. I saved its text as a note.` };
    }
    await createEvent({ type: "note", title: "Picked file", note: `${file.name}\n${file.uri}` });
    return { actionType: "pick_file", success: true, spokenText: `I noted the file ${file.name}. I cannot read its contents safely, but I saved the reference.` };
  }

  const musicQuery = extractAfter(command, [/^play\s+(.+)$/i]);
  if (musicQuery || /^(play music|music)$/i.test(lower)) {
    await playMusic(musicQuery ?? undefined);
    return {
      actionType: "play_music",
      success: true,
      spokenText: musicQuery ? `Opening music for ${musicQuery}.` : "Opening music.",
    };
  }

  if (/voice settings|change voice|tts settings/i.test(lower)) {
    return {
      actionType: "open_settings",
      success: true,
      spokenText: "LifeOS uses its bundled offline Sherpa voice. Android text to speech is not used in this build.",
    };
  }

  return {
    actionType: "answer",
    success: true,
    detail: knownApps().join(", "),
    spokenText: `I can help with planning, focus, timing, directions, logging, summaries, calls, camera, files, music, and opening apps. Try: "${hotword}, how long until my next task?"`,
  };
}

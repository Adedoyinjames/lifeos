export const quickLogOptions = [
  { type: "log", title: "Working" },
  { type: "break", title: "Break" },
  { type: "meeting", title: "Meeting" },
  { type: "distraction", title: "Distraction" },
  { type: "context_switch", title: "Context switch" },
] as const;

export const priorityOptions = ["high", "medium", "low"] as const;
export const planKindOptions = ["task", "time_block", "goal"] as const;

export const defaultFocusMinutes = [15, 25, 45, 60];

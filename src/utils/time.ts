export const MS_PER_MINUTE = 60 * 1000;
export const MINUTES_PER_DAY = 24 * 60;

export function nowIso(): string {
  return new Date().toISOString();
}

export function dateKey(date = new Date()): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * MS_PER_MINUTE);
  return local.toISOString().slice(0, 10);
}

export function startOfDayIso(day: string): string {
  return new Date(`${day}T00:00:00`).toISOString();
}

export function endOfDayIso(day: string): string {
  return new Date(`${day}T23:59:59.999`).toISOString();
}

export function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * MS_PER_MINUTE).toISOString();
}

export function diffMinutes(startIso: string, endIso: string): number {
  const delta = new Date(endIso).getTime() - new Date(startIso).getTime();
  return Math.max(0, Math.round(delta / MS_PER_MINUTE));
}

export function clampIso(iso: string, minIso: string, maxIso: string): string {
  const value = new Date(iso).getTime();
  const min = new Date(minIso).getTime();
  const max = new Date(maxIso).getTime();
  return new Date(Math.min(Math.max(value, min), max)).toISOString();
}

export function formatClock(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

export function hourBucket(iso: string): string {
  const date = new Date(iso);
  const hour = date.getHours();
  const next = (hour + 1) % 24;
  return `${String(hour).padStart(2, "0")}:00-${String(next).padStart(2, "0")}:00`;
}

export function weekStart(date = new Date()): string {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return dateKey(copy);
}

export function daysBetween(startDate: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(`${startDate}T12:00:00`);
    date.setDate(date.getDate() + index);
    return dateKey(date);
  });
}

export function humanDay(day: string): string {
  const today = dateKey();
  if (day === today) return "Today";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${day}T12:00:00`));
}

export function plannedWindowLabel(startAt: string | null, endAt: string | null): string {
  if (!startAt || !endAt) return "Flexible";
  return `${formatClock(startAt)} - ${formatClock(endAt)}`;
}

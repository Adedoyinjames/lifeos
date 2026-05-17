export function sanitizeText(value: string, maxLength = 240): string {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function sanitizeNote(value: string, maxLength = 2000): string {
  return value.replace(/\r\n/g, "\n").trim().slice(0, maxLength);
}

export function assertTitle(value: string): string {
  const title = sanitizeText(value, 120);
  if (title.length < 2) {
    throw new Error("Use a title with at least 2 characters.");
  }
  return title;
}

export function safeNumber(value: unknown, fallback: number, min: number, max: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(Math.max(Math.round(numeric), min), max);
}

export function assertIsoRange(startAt: string | null, endAt: string | null): void {
  if (!startAt || !endAt) return;
  if (new Date(endAt).getTime() <= new Date(startAt).getTime()) {
    throw new Error("End time must be after start time.");
  }
}

export function createId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${random}`;
}

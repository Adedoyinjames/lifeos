import type { DaySnapshot, FocusSession, LifeEvent, PlanItem, TimelineSegment } from "../types";
import { addMinutes, clampIso, dateKey, diffMinutes, endOfDayIso, startOfDayIso } from "../utils/time";

function isProductive(type: TimelineSegment["type"], title: string): boolean {
  const lower = title.toLowerCase();
  if (type === "focus" || type === "planned" || type === "meeting") return true;
  if (type === "distraction" || type === "break" || type === "gap") return false;
  return !["scroll", "youtube", "random", "wasted", "idle"].some((word) => lower.includes(word));
}

function eventEnd(event: LifeEvent, nextStart: string, dayEnd: string): string {
  if (event.endAt) return event.endAt;
  if (event.type === "note") return addMinutes(event.startAt, 5);
  if (event.type === "distraction") return addMinutes(event.startAt, 10);
  if (event.type === "break") return addMinutes(event.startAt, 15);
  return nextStart || addMinutes(event.startAt, 15) || dayEnd;
}

function asSegmentFromPlan(item: PlanItem): TimelineSegment | null {
  if (!item.startAt || !item.endAt || item.status === "archived") return null;
  const minutes = diffMinutes(item.startAt, item.endAt);
  return {
    id: `planned_${item.id}`,
    title: item.title,
    type: "planned",
    startAt: item.startAt,
    endAt: item.endAt,
    minutes,
    sourceId: item.id,
    plannedTitle: item.title,
    productive: true,
  };
}

function asSegmentFromFocus(session: FocusSession, dayEnd: string): TimelineSegment {
  const endAt = session.endAt ?? dayEnd;
  return {
    id: `focus_${session.id}`,
    title: session.title,
    type: "focus",
    startAt: session.startAt,
    endAt,
    minutes: diffMinutes(session.startAt, endAt),
    sourceId: session.id,
    productive: true,
  };
}

export function buildTimeline(
  planItems: PlanItem[],
  events: LifeEvent[],
  focusSessions: FocusSession[],
  day = dateKey(),
): TimelineSegment[] {
  const dayStart = startOfDayIso(day);
  const dayEnd = day === dateKey() ? new Date().toISOString() : endOfDayIso(day);
  const eventSegments = events.map((event, index) => {
    const nextStart = events[index + 1]?.startAt ?? dayEnd;
    const endAt = clampIso(eventEnd(event, nextStart, dayEnd), event.startAt, dayEnd);
    const segment: TimelineSegment = {
      id: `event_${event.id}`,
      title: event.title,
      type: event.type,
      startAt: clampIso(event.startAt, dayStart, dayEnd),
      endAt,
      minutes: diffMinutes(event.startAt, endAt),
      sourceId: event.id,
      productive: isProductive(event.type, event.title),
    };
    return segment;
  });

  const focusSegments = focusSessions.map((session) => asSegmentFromFocus(session, dayEnd));
  const plannedSegments = planItems.map(asSegmentFromPlan).filter(Boolean) as TimelineSegment[];
  const actualSegments = [...eventSegments, ...focusSegments]
    .filter((segment) => segment.minutes > 0)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  const stitched: TimelineSegment[] = [];
  let cursor = dayStart;
  for (const segment of actualSegments) {
    if (new Date(segment.startAt).getTime() > new Date(cursor).getTime() + 5 * 60 * 1000) {
      stitched.push({
        id: `gap_${cursor}_${segment.startAt}`,
        title: "Untracked time",
        type: "gap",
        startAt: cursor,
        endAt: segment.startAt,
        minutes: diffMinutes(cursor, segment.startAt),
        sourceId: null,
        productive: false,
      });
    }
    const matchingPlan = plannedSegments.find(
      (plan) =>
        new Date(plan.startAt).getTime() <= new Date(segment.startAt).getTime() &&
        new Date(plan.endAt).getTime() >= new Date(segment.startAt).getTime(),
    );
    stitched.push({
      ...segment,
      plannedTitle: matchingPlan?.title,
      driftMinutes: matchingPlan ? diffMinutes(matchingPlan.startAt, segment.startAt) : undefined,
    });
    if (new Date(segment.endAt).getTime() > new Date(cursor).getTime()) {
      cursor = segment.endAt;
    }
  }

  if (new Date(dayEnd).getTime() > new Date(cursor).getTime() + 5 * 60 * 1000) {
    stitched.push({
      id: `gap_${cursor}_${dayEnd}`,
      title: "Untracked time",
      type: "gap",
      startAt: cursor,
      endAt: dayEnd,
      minutes: diffMinutes(cursor, dayEnd),
      sourceId: null,
      productive: false,
    });
  }

  if (stitched.length === 0) {
    return plannedSegments;
  }
  return stitched;
}

export function buildDaySnapshot(
  date: string,
  planItems: PlanItem[],
  events: LifeEvent[],
  focusSessions: FocusSession[],
): DaySnapshot {
  return {
    date,
    planItems,
    events,
    focusSessions,
    timeline: buildTimeline(planItems, events, focusSessions, date),
  };
}

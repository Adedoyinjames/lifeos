import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { Alert } from "react-native";
import { EmptyState } from "../src/components/EmptyState";
import { Screen } from "../src/components/Screen";
import { TimelineItem } from "../src/components/TimelineItem";
import { listEvents, listFocusSessions, listPlanItems } from "../src/db/repository";
import { buildTimeline } from "../src/services/timelineBuilder";
import type { TimelineSegment } from "../src/types";
import { dateKey } from "../src/utils/time";

export default function Timeline() {
  const [segments, setSegments] = useState<TimelineSegment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const day = dateKey();
      setSegments(buildTimeline(await listPlanItems(day), await listEvents(day), await listFocusSessions(day), day));
    } catch (error) {
      Alert.alert("Could not build timeline", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => void load(), [load]));

  return (
    <Screen title="Timeline" subtitle="Reconstructed from focus sessions, logs, notes, gaps, and plan drift." loading={loading}>
      {segments.length ? (
        segments.map((segment) => <TimelineItem key={segment.id} segment={segment} />)
      ) : (
        <EmptyState title="No timeline yet" body="Use Today or Focus to log what is happening. LifeOS will stitch events into a full day." />
      )}
    </Screen>
  );
}

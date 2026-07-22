import type { Stream, StreamStatus } from "@/types";

// Single source of truth for the stream lifecycle pipeline. The happy path is a
// linear progression; sync_error/stale are failure branches off the sync step.

export type LifecycleStage =
  | "created"
  | "reserved"
  | "discovered"
  | "pending_assignment"
  | "assigned"
  | "synced";

export type Tone = "healthy" | "warning" | "critical" | "info" | "inactive";

export interface StageDef {
  id: LifecycleStage;
  label: string;
  tone: Tone;
  hint: string;
}

export const STAGES: StageDef[] = [
  { id: "created", label: "Created", tone: "info", hint: "Registered, not yet ingesting" },
  { id: "reserved", label: "Reserved", tone: "info", hint: "Ingest slot reserved, awaiting publish" },
  { id: "discovered", label: "Discovered", tone: "warning", hint: "Publishing, seen on ingest" },
  { id: "pending_assignment", label: "Pending", tone: "warning", hint: "Awaiting a cluster node" },
  { id: "assigned", label: "Assigned", tone: "info", hint: "Bound to a cluster node" },
  { id: "synced", label: "Synced", tone: "healthy", hint: "Relaying on the cluster" },
];

export interface FailureDef {
  id: Extract<StreamStatus, "sync_error" | "stale">;
  label: string;
  tone: Tone;
}

export const FAILURES: FailureDef[] = [
  { id: "sync_error", label: "Sync Error", tone: "critical" },
  { id: "stale", label: "Stale", tone: "inactive" },
];

const STAGE_INDEX: Record<LifecycleStage, number> = STAGES.reduce(
  (acc, stage, i) => ({ ...acc, [stage.id]: i }),
  {} as Record<LifecycleStage, number>,
);

export const isFailure = (status: StreamStatus): boolean =>
  status === "sync_error" || status === "stale";

/** The pipeline stage a status sits at (failures resolve to the sync step). */
export function stageOf(status: StreamStatus): LifecycleStage {
  if (isFailure(status)) return "assigned";
  return status as LifecycleStage;
}

/** True once the stream has reached (or passed) the given stage. */
export function hasReached(status: StreamStatus, stage: LifecycleStage): boolean {
  return STAGE_INDEX[stageOf(status)] >= STAGE_INDEX[stage];
}

/** Best-effort timestamp for when a stream entered a stage (undefined if unknown). */
export function stageTimestamp(
  stream: Stream,
  stage: LifecycleStage,
): string | null | undefined {
  switch (stage) {
    case "created":
      return stream.createdAt;
    case "reserved":
      return stream.publishToken ? stream.updatedAt : undefined;
    case "discovered":
      return stream.lastSeenAt;
    case "assigned":
      return stream.assignedAt;
    case "synced":
      return stream.lastSyncedAt;
    default:
      return undefined;
  }
}

/** Minutes until a reservation expires; null when not reserved / no expiry. */
export function reservationMinutesLeft(stream: Stream): number | null {
  if (!stream.reservedUntil) return null;
  const ms = new Date(stream.reservedUntil).getTime() - Date.now();
  return Math.round(ms / 60_000);
}

export const isReservationExpiring = (stream: Stream): boolean => {
  const left = reservationMinutesLeft(stream);
  return left !== null && left <= 2;
};

/** Count streams per pipeline stage plus each failure lane. */
export function lifecycleCounts(streams: Stream[]): {
  stages: Record<LifecycleStage, number>;
  failures: Record<string, number>;
} {
  const stages = STAGES.reduce(
    (acc, s) => ({ ...acc, [s.id]: 0 }),
    {} as Record<LifecycleStage, number>,
  );
  const failures: Record<string, number> = { sync_error: 0, stale: 0 };
  for (const stream of streams) {
    if (isFailure(stream.status)) failures[stream.status]++;
    else stages[stream.status as LifecycleStage]++;
  }
  return { stages, failures };
}

// Literal Tailwind classes per tone (kept literal so the purge keeps them).
export const TONE: Record<
  Tone,
  { text: string; bg: string; border: string; dot: string; soft: string }
> = {
  healthy: {
    text: "text-status-healthy",
    bg: "bg-status-healthy/15",
    border: "border-status-healthy/30",
    dot: "bg-status-healthy",
    soft: "bg-status-healthy/10",
  },
  warning: {
    text: "text-status-warning",
    bg: "bg-status-warning/15",
    border: "border-status-warning/30",
    dot: "bg-status-warning",
    soft: "bg-status-warning/10",
  },
  critical: {
    text: "text-status-critical",
    bg: "bg-status-critical/15",
    border: "border-status-critical/30",
    dot: "bg-status-critical",
    soft: "bg-status-critical/10",
  },
  info: {
    text: "text-status-info",
    bg: "bg-status-info/15",
    border: "border-status-info/30",
    dot: "bg-status-info",
    soft: "bg-status-info/10",
  },
  inactive: {
    text: "text-status-inactive",
    bg: "bg-status-inactive/15",
    border: "border-status-inactive/30",
    dot: "bg-status-inactive",
    soft: "bg-status-inactive/10",
  },
};

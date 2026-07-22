import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Users } from "lucide-react";

import type { Stream, StreamStatus } from "@/types";
import { cn } from "@/lib/utils";
import { FAILURES, STAGES, TONE, type Tone } from "@/lib/lifecycle";

// Lifecycle as horizontal lanes (one row per stage) so it fits any width —
// stream chips wrap inside each lane. Reads top-to-bottom as the pipeline.
export function LifecycleBoard({ streams }: { streams: Stream[] }) {
  const lanes = useMemo(() => {
    const defs: {
      id: StreamStatus;
      label: string;
      tone: Tone;
      failure?: boolean;
    }[] = [
      ...STAGES.map((s) => ({
        id: s.id as StreamStatus,
        label: s.label,
        tone: s.tone,
      })),
      ...FAILURES.map((f) => ({
        id: f.id,
        label: f.label,
        tone: f.tone,
        failure: true,
      })),
    ];
    return defs.map((def) => ({
      ...def,
      streams: streams.filter((s) => s.status === def.id),
    }));
  }, [streams]);

  return (
    <div className="space-y-2">
      {lanes.map((lane) => {
        const tone = TONE[lane.tone];
        return (
          <div
            key={lane.id}
            className={cn(
              "flex flex-col gap-2 rounded-lg border border-border/50 p-2 sm:flex-row sm:items-start",
              lane.failure && lane.streams.length > 0 && tone.soft,
            )}
          >
            <div className="flex w-full shrink-0 items-center gap-2 sm:w-40">
              <span className={cn("h-2 w-2 rounded-full", tone.dot)} />
              <span className="text-sm font-medium">{lane.label}</span>
              <span
                className={cn(
                  "font-mono-metric ml-auto text-xs sm:ml-0",
                  lane.streams.length ? tone.text : "text-muted-foreground",
                )}
              >
                {lane.streams.length}
              </span>
            </div>
            <div className="flex flex-1 flex-wrap gap-1.5">
              {lane.streams.map((stream) => (
                <StreamChip key={stream.name} stream={stream} tone={lane.tone} />
              ))}
              {lane.streams.length === 0 && (
                <span className="py-1 text-[11px] text-muted-foreground">
                  —
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StreamChip({ stream, tone }: { stream: Stream; tone: Tone }) {
  const navigate = useNavigate();
  const t = TONE[tone];
  return (
    <button
      onClick={() => navigate(`/streams/${encodeURIComponent(stream.name)}`)}
      title={`${stream.name}\n${stream.ingestNode ?? "—"} → ${stream.assignedNode ?? "—"}${stream.lastError ? `\n${stream.lastError}` : ""}`}
      className={cn(
        "flex items-center gap-1.5 rounded-md border border-l-2 bg-card px-2 py-1 text-xs transition-colors hover:bg-muted/50",
        t.border,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", t.dot)} />
      <span className="font-mono-metric max-w-[160px] truncate">
        {stream.name}
      </span>
      {stream.assignedNode && (
        <span className="hidden items-center gap-0.5 text-[10px] text-muted-foreground md:flex">
          <ArrowRight className="h-2.5 w-2.5" />
          {stream.assignedNode}
        </span>
      )}
      {stream.activeConsumers > 0 && (
        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
          <Users className="h-2.5 w-2.5" />
          {stream.activeConsumers}
        </span>
      )}
    </button>
  );
}

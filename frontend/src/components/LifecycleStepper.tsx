import { AlertTriangle, Check } from "lucide-react";
import { format } from "date-fns";

import type { Stream } from "@/types";
import { cn } from "@/lib/utils";
import {
  STAGES,
  TONE,
  hasReached,
  isFailure,
  stageOf,
  stageTimestamp,
} from "@/lib/lifecycle";

// Stepper of the stream's progression through the lifecycle. Reached stages are
// filled; the current stage is lit; a failure status is flagged at the sync step.
export function LifecycleStepper({ stream }: { stream: Stream }) {
  const current = stageOf(stream.status);
  const failed = isFailure(stream.status);

  return (
    <div className="flex items-stretch overflow-x-auto">
      {STAGES.map((stage, i) => {
        const reached = hasReached(stream.status, stage.id);
        const isCurrent = stage.id === current;
        const failHere = failed && isCurrent;
        const tone = failHere ? TONE.critical : TONE[stage.tone];
        const ts = stageTimestamp(stream, stage.id);

        return (
          <div key={stage.id} className="flex flex-1 items-start">
            <div className="flex min-w-[84px] flex-col items-center gap-1.5 text-center">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-semibold",
                  reached
                    ? cn(tone.bg, tone.border, tone.text)
                    : "border-border/50 text-muted-foreground",
                  isCurrent && "ring-2 ring-offset-1 ring-offset-background",
                  isCurrent && tone.border,
                )}
              >
                {failHere ? (
                  <AlertTriangle className="h-3.5 w-3.5" />
                ) : reached ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={cn(
                  "text-[11px] font-medium",
                  reached ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {stage.label}
              </span>
              <span className="font-mono-metric text-[10px] text-muted-foreground">
                {ts ? format(new Date(ts), "MMM d HH:mm") : "—"}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <div
                className={cn(
                  "mt-3.5 h-0.5 flex-1",
                  hasReached(stream.status, STAGES[i + 1].id)
                    ? tone.dot
                    : "bg-border/50",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

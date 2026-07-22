import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

import type { Stream } from "@/types";
import { cn } from "@/lib/utils";
import {
  FAILURES,
  STAGES,
  TONE,
  lifecycleCounts,
} from "@/lib/lifecycle";

// Horizontal lifecycle strip: one segment per pipeline stage (with count),
// failure lanes broken out on the right. Click a segment to jump to the
// Streams list filtered to that status.
export function LifecyclePipeline({ streams }: { streams: Stream[] }) {
  const navigate = useNavigate();
  const { stages, failures } = lifecycleCounts(streams);
  const go = (status: string) => navigate(`/streams?status=${status}`);

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
      <div className="flex flex-1 items-stretch overflow-x-auto rounded-lg border border-border/50 bg-card">
        {STAGES.map((stage, i) => {
          const tone = TONE[stage.tone];
          const count = stages[stage.id];
          return (
            <div key={stage.id} className="flex items-stretch">
              <button
                onClick={() => go(stage.id)}
                title={stage.hint}
                className={cn(
                  "group flex min-w-[92px] flex-col justify-center gap-1 px-3 py-2.5 text-left transition-colors hover:bg-muted/50",
                  count === 0 && "opacity-55",
                )}
              >
                <div className="flex items-center gap-1.5">
                  <span className={cn("h-1.5 w-1.5 rounded-full", tone.dot)} />
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {stage.label}
                  </span>
                </div>
                <span
                  className={cn(
                    "font-mono-metric text-lg font-semibold leading-none",
                    count > 0 ? tone.text : "text-muted-foreground",
                  )}
                >
                  {count}
                </span>
              </button>
              {i < STAGES.length - 1 && (
                <div className="flex items-center text-muted-foreground/40">
                  <ChevronRight className="h-4 w-4" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-stretch gap-2">
        {FAILURES.map((failure) => {
          const tone = TONE[failure.tone];
          const count = failures[failure.id];
          return (
            <button
              key={failure.id}
              onClick={() => go(failure.id)}
              className={cn(
                "flex min-w-[96px] flex-col justify-center gap-1 rounded-lg border px-3 py-2.5 text-left transition-colors",
                count > 0
                  ? cn(tone.border, tone.soft, "hover:brightness-110")
                  : "border-border/50 bg-card opacity-55",
              )}
            >
              <span className="text-[11px] font-medium text-muted-foreground">
                {failure.label}
              </span>
              <span
                className={cn(
                  "font-mono-metric text-lg font-semibold leading-none",
                  count > 0 ? tone.text : "text-muted-foreground",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

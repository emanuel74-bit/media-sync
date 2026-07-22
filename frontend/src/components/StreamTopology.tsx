import { ChevronRight, HardDrive, Radio, Server, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { Stream } from "@/types";
import { cn } from "@/lib/utils";

// Per-stream path: source -> ingest node -> relay -> cluster node -> consumers.
export function StreamTopology({ stream }: { stream: Stream }) {
  const hops: {
    icon: LucideIcon;
    label: string;
    value: string;
    dim?: boolean;
    tone?: string;
  }[] = [
    { icon: Radio, label: "Source", value: shorten(stream.source) },
    {
      icon: HardDrive,
      label: "Ingest",
      value: stream.ingestNode ?? "—",
      dim: !stream.ingestNode,
      tone: "text-status-info",
    },
    {
      icon: Server,
      label: "Cluster",
      value: stream.assignedNode ?? "unassigned",
      dim: !stream.assignedNode,
      tone: stream.assignedNode ? "text-status-healthy" : undefined,
    },
    {
      icon: Users,
      label: "Consumers",
      value: `${stream.activeConsumers}`,
    },
  ];

  return (
    <div className="flex items-stretch overflow-x-auto rounded-lg border border-border/50 bg-card">
      {hops.map((hop, i) => (
        <div key={hop.label} className="flex items-stretch">
          <div className="flex min-w-[120px] flex-col gap-1 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <hop.icon className="h-3.5 w-3.5" />
              <span className="text-[10px] font-medium uppercase tracking-wide">
                {hop.label}
              </span>
            </div>
            <span
              className={cn(
                "font-mono-metric text-xs font-medium",
                hop.dim ? "text-muted-foreground" : hop.tone ?? "text-foreground",
              )}
            >
              {hop.value}
            </span>
          </div>
          {i < hops.length - 1 && (
            <div className="flex items-center text-muted-foreground/40">
              <ChevronRight className="h-4 w-4" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function shorten(source: string): string {
  try {
    const url = new URL(source);
    return `${url.protocol}//${url.host}`;
  } catch {
    return source.length > 22 ? `${source.slice(0, 22)}…` : source;
  }
}

import { ChevronRight, HardDrive, Radio, Server, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { Node, Stream } from "@/types";
import { cn } from "@/lib/utils";

// End-to-end flow summary: sources -> ingest -> cluster -> consumers.
export function FlowBand({
  streams,
  nodes,
}: {
  streams: Stream[];
  nodes: Node[];
}) {
  const ingest = nodes.filter((n) => n.type === "ingest");
  const cluster = nodes.filter((n) => n.type === "cluster");
  const publishing = streams.filter(
    (s) => s.status === "discovered" || s.status === "synced",
  ).length;
  const relaying = streams.filter((s) => s.status === "synced").length;
  const consumers = streams.reduce((sum, s) => sum + s.activeConsumers, 0);

  const steps: {
    icon: LucideIcon;
    label: string;
    value: string;
    tone: string;
  }[] = [
    {
      icon: Radio,
      label: "Sources",
      value: `${streams.length}`,
      tone: "text-foreground",
    },
    {
      icon: HardDrive,
      label: "Ingest",
      value: `${ingest.filter((n) => n.status === "active").length}/${ingest.length} · ${publishing} pub`,
      tone: "text-status-info",
    },
    {
      icon: Server,
      label: "Cluster",
      value: `${cluster.filter((n) => n.status === "active").length}/${cluster.length} · ${relaying} relay`,
      tone: "text-status-healthy",
    },
    {
      icon: Users,
      label: "Consumers",
      value: `${consumers}`,
      tone: "text-foreground",
    },
  ];

  return (
    <div className="flex items-stretch overflow-x-auto rounded-lg border border-border/50 bg-card">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-stretch">
          <div className="flex min-w-[130px] flex-col gap-1 px-4 py-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <step.icon className="h-3.5 w-3.5" />
              <span className="text-[11px] font-medium uppercase tracking-wide">
                {step.label}
              </span>
            </div>
            <span
              className={cn("font-mono-metric text-sm font-semibold", step.tone)}
            >
              {step.value}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className="flex items-center text-muted-foreground/40">
              <ChevronRight className="h-4 w-4" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

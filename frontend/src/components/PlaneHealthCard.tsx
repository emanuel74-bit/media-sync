import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface PlaneStat {
  label: string;
  value: string | number;
  tone?: string;
}

// Compact health panel for one plane (ingest or cluster) — equal-weight columns.
export function PlaneHealthCard({
  title,
  icon: Icon,
  accent,
  stats,
}: {
  title: string;
  icon: LucideIcon;
  accent: string;
  stats: PlaneStat[];
}) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Icon className={cn("h-4 w-4", accent)} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p
                className={cn(
                  "font-mono-metric text-xl font-semibold leading-none",
                  stat.tone ?? "text-foreground",
                )}
              >
                {stat.value}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

import type { AlertSeverity, StreamStatus } from "@/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: StreamStatus;
  className?: string;
}

const STATUS_CONFIG: Record<
  StreamStatus,
  { label: string; className: string }
> = {
  created: {
    label: "Created",
    className: "bg-status-info/15 text-status-info border-status-info/30",
  },
  reserved: {
    label: "Reserved",
    className: "bg-status-info/15 text-status-info border-status-info/30",
  },
  discovered: {
    label: "Discovered",
    className:
      "bg-status-warning/15 text-status-warning border-status-warning/30",
  },
  pending_assignment: {
    label: "Pending",
    className:
      "bg-status-warning/15 text-status-warning border-status-warning/30",
  },
  assigned: {
    label: "Assigned",
    className: "bg-status-info/15 text-status-info border-status-info/30",
  },
  synced: {
    label: "Synced",
    className:
      "bg-status-healthy/15 text-status-healthy border-status-healthy/30",
  },
  sync_error: {
    label: "Sync Error",
    className:
      "bg-status-critical/15 text-status-critical border-status-critical/30",
  },
  stale: {
    label: "Stale",
    className:
      "bg-status-inactive/15 text-status-inactive border-status-inactive/30",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}

interface SeverityBadgeProps {
  severity: AlertSeverity;
  className?: string;
}

const SEVERITY_CLASS: Record<AlertSeverity, string> = {
  info: "bg-status-info/15 text-status-info border-status-info/30",
  warning: "bg-status-warning/15 text-status-warning border-status-warning/30",
  critical:
    "bg-status-critical/15 text-status-critical border-status-critical/30",
};

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(SEVERITY_CLASS[severity], "capitalize", className)}
    >
      {severity}
    </Badge>
  );
}

import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle, Search } from "lucide-react";

import type { AlertSeverity } from "@/types";
import { cn } from "@/lib/utils";
import { useAlerts, useResolveAlert } from "@/hooks/use-streams";
import { SeverityBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const SEVERITY_ORDER: Record<AlertSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

export default function AlertsPage() {
  const { data: alerts = [] } = useAlerts();
  const resolveAlert = useResolveAlert();
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    const normalizedSearch = search.toLowerCase();
    return alerts
      .filter((alert) => {
        if (
          normalizedSearch &&
          !alert.subject.toLowerCase().includes(normalizedSearch) &&
          !alert.message.toLowerCase().includes(normalizedSearch)
        ) {
          return false;
        }
        if (severityFilter !== "all" && alert.severity !== severityFilter)
          return false;
        if (statusFilter === "open" && alert.isResolved) return false;
        if (statusFilter === "resolved" && !alert.isResolved) return false;
        return true;
      })
      .sort((left, right) => {
        if (!left.isResolved && right.isResolved) return -1;
        if (left.isResolved && !right.isResolved) return 1;
        const severityDifference =
          SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity];
        if (severityDifference) return severityDifference;
        return (
          new Date(right.createdAt ?? 0).getTime() -
          new Date(left.createdAt ?? 0).getTime()
        );
      });
  }, [alerts, search, severityFilter, statusFilter]);

  const openAlerts = alerts.filter((alert) => !alert.isResolved);
  const criticalCount = openAlerts.filter(
    (alert) => alert.severity === "critical",
  ).length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Alerts</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {openAlerts.length} open
          {criticalCount > 0 && (
            <span className="text-status-critical">
              {" "}
              · {criticalCount} critical
            </span>
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search alerts..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9 h-9 bg-card"
          />
        </div>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[140px] h-9 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] h-9 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border border-border/50 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Severity</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="hidden md:table-cell">Message</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((alert) => (
              <TableRow
                key={alert.id}
                className={cn(
                  !alert.isResolved &&
                    alert.severity === "critical" &&
                    "bg-status-critical/5",
                )}
              >
                <TableCell>
                  <SeverityBadge severity={alert.severity} />
                </TableCell>
                <TableCell className="font-mono-metric text-sm">
                  {alert.subject}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{alert.source}</Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {alert.type}
                </TableCell>
                <TableCell className="hidden md:table-cell max-w-[300px]">
                  <span className="text-sm truncate block">
                    {alert.message}
                  </span>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(alert.createdAt ?? 0), {
                    addSuffix: true,
                  })}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={alert.isResolved ? "secondary" : "outline"}
                    className={cn(
                      !alert.isResolved &&
                        "border-status-warning/30 text-status-warning",
                    )}
                  >
                    {alert.isResolved ? "Resolved" : "Open"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {!alert.isResolved && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => resolveAlert.mutate(alert.id)}
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

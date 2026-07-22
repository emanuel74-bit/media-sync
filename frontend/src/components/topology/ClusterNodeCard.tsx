import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Radio, Server, Unlink, Users } from "lucide-react";

import type { StreamStatus } from "@/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export interface ClusterNodeInfo {
  nodeId: string;
  host?: string;
  status: string;
  lastHeartbeatAt: string;
  streams: { name: string; status: StreamStatus; consumers: number }[];
  totalConsumers: number;
}

function streamStatusColor(status: StreamStatus): string {
  if (status === "synced") return "bg-status-healthy";
  if (status === "sync_error" || status === "stale") return "bg-status-critical";
  if (
    status === "assigned" ||
    status === "discovered" ||
    status === "pending_assignment"
  ) {
    return "bg-status-warning";
  }
  return "bg-status-inactive";
}

// Cluster-plane node: assigned streams, consumers, per-stream unassign.
export function ClusterNodeCard({
  node,
  maxStreams,
  onUnassign,
}: {
  node: ClusterNodeInfo;
  maxStreams: number;
  onUnassign: (streamName: string) => void;
}) {
  const navigate = useNavigate();
  const isUnassigned = node.nodeId === "unassigned";

  return (
    <Card
      className={cn(
        "border-border/50",
        isUnassigned && "border-dashed opacity-75",
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="font-mono-metric text-sm">
              {node.nodeId}
            </CardTitle>
            {!isUnassigned && <Badge variant="outline">{node.status}</Badge>}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Radio className="h-3 w-3" />
              {node.streams.length}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {node.totalConsumers}
            </span>
          </div>
        </div>
        {node.host && (
          <p className="mt-1 font-mono-metric text-[10px] text-muted-foreground">
            {node.host}
          </p>
        )}
        {node.lastHeartbeatAt && (
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Heartbeat{" "}
            {formatDistanceToNow(new Date(node.lastHeartbeatAt), {
              addSuffix: true,
            })}
          </p>
        )}
        <Progress
          value={(node.streams.length / maxStreams) * 100}
          className="mt-2 h-1.5"
        />
      </CardHeader>
      <CardContent className="pt-0">
        <div className="max-h-40 space-y-1.5 overflow-auto">
          {node.streams.map((stream) => (
            <div
              key={stream.name}
              className="group flex items-center justify-between rounded bg-muted/50 px-2 py-1 text-xs"
            >
              <button
                onClick={() =>
                  navigate(`/streams/${encodeURIComponent(stream.name)}`)
                }
                className="font-mono-metric truncate hover:underline"
              >
                {stream.name}
              </button>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">
                  {stream.consumers}c
                </span>
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    streamStatusColor(stream.status),
                  )}
                />
                {!isUnassigned && (
                  <button
                    onClick={() => onUnassign(stream.name)}
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                    title="Unassign"
                  >
                    <Unlink className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>
            </div>
          ))}
          {node.streams.length === 0 && (
            <p className="py-2 text-center text-xs text-muted-foreground">
              No streams assigned
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

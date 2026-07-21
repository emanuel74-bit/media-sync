import { useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { Radio, Server, Unlink, Users } from "lucide-react";
import { toast } from "sonner";

import type { StreamStatus } from "@/types";
import { useNodes, useStreams, useUnassignStream } from "@/hooks/use-streams";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface NodeInfo {
  nodeId: string;
  host?: string;
  status: string;
  lastHeartbeatAt: string;
  streams: { name: string; status: StreamStatus; consumers: number }[];
  totalConsumers: number;
}

function streamStatusColor(status: StreamStatus): string {
  if (status === "synced") return "bg-status-healthy";
  if (status === "sync_error" || status === "stale")
    return "bg-status-critical";
  if (
    status === "assigned" ||
    status === "discovered" ||
    status === "pending_assignment"
  ) {
    return "bg-status-warning";
  }
  return "bg-status-inactive";
}

export default function ClusterPage() {
  const { data: streams = [] } = useStreams();
  const { data: allNodes = [] } = useNodes();
  const unassignStream = useUnassignStream();
  const nodes = allNodes.filter((node) => node.type === "cluster");

  const nodeInfos = useMemo(() => {
    const streamsByNode: Record<string, NodeInfo["streams"]> = {};
    streams.forEach((stream) => {
      const key = stream.assignedNode || "__unassigned__";
      (streamsByNode[key] ??= []).push({
        name: stream.name,
        status: stream.status,
        consumers: stream.activeConsumers,
      });
    });

    const infos: NodeInfo[] = nodes.map((node) => ({
      nodeId: node.nodeId,
      host: node.host,
      status: node.status,
      lastHeartbeatAt: node.lastHeartbeatAt,
      streams: streamsByNode[node.nodeId] ?? [],
      totalConsumers: (streamsByNode[node.nodeId] ?? []).reduce(
        (total, stream) => total + stream.consumers,
        0,
      ),
    }));
    const unassigned = streamsByNode.__unassigned__;
    if (unassigned?.length) {
      infos.push({
        nodeId: "unassigned",
        status: "inactive",
        lastHeartbeatAt: "",
        streams: unassigned,
        totalConsumers: unassigned.reduce(
          (total, stream) => total + stream.consumers,
          0,
        ),
      });
    }
    return infos.sort((a, b) => {
      if (a.nodeId === "unassigned") return 1;
      if (b.nodeId === "unassigned") return -1;
      return b.streams.length - a.streams.length;
    });
  }, [nodes, streams]);

  const maxStreams = Math.max(
    ...nodeInfos.map((node) => node.streams.length),
    1,
  );
  const unassignedCount = streams.filter(
    (stream) => !stream.assignedNode,
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Cluster View</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {nodes.filter((node) => node.status === "active").length} active nodes
          · {streams.length} streams · {unassignedCount} unassigned
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {nodeInfos.map((node) => (
          <Card
            key={node.nodeId}
            className={`border-border/50 ${node.nodeId === "unassigned" ? "border-dashed opacity-75" : ""}`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-mono-metric">
                    {node.nodeId}
                  </CardTitle>
                  {node.nodeId !== "unassigned" && (
                    <Badge variant="outline">{node.status}</Badge>
                  )}
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
                <p className="text-[10px] text-muted-foreground font-mono-metric mt-1">
                  {node.host}
                </p>
              )}
              {node.lastHeartbeatAt && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Heartbeat{" "}
                  {formatDistanceToNow(new Date(node.lastHeartbeatAt), {
                    addSuffix: true,
                  })}
                </p>
              )}
              <Progress
                value={(node.streams.length / maxStreams) * 100}
                className="h-1.5 mt-2"
              />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1.5 max-h-40 overflow-auto">
                {node.streams.map((stream) => (
                  <div
                    key={stream.name}
                    className="flex items-center justify-between text-xs py-1 px-2 rounded bg-muted/50 group"
                  >
                    <span className="font-mono-metric">{stream.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {stream.consumers}c
                      </span>
                      <div
                        className={`h-1.5 w-1.5 rounded-full ${streamStatusColor(stream.status)}`}
                      />
                      {node.nodeId !== "unassigned" && (
                        <button
                          onClick={() =>
                            unassignStream.mutate(stream.name, {
                              onSuccess: () =>
                                toast.success(`${stream.name} unassigned`),
                            })
                          }
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Unassign"
                        >
                          <Unlink className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

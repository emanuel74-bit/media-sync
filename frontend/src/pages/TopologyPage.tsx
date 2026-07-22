import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useNodes, useStreams, useUnassignStream } from "@/hooks/use-streams";
import { FlowBand } from "@/components/topology/FlowBand";
import { StreamFlow } from "@/components/topology/StreamFlow";
import { LifecycleBoard } from "@/components/LifecycleBoard";
import { IngestNodeCard } from "@/components/topology/IngestNodeCard";
import {
  ClusterNodeCard,
  type ClusterNodeInfo,
} from "@/components/topology/ClusterNodeCard";
import { NodesTable } from "@/components/topology/NodesTable";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TopologyPage() {
  const { data: streams = [] } = useStreams();
  const { data: nodes = [] } = useNodes();
  const unassignStream = useUnassignStream();

  const ingestNodes = useMemo(
    () => nodes.filter((n) => n.type === "ingest"),
    [nodes],
  );
  const clusterNodes = useMemo(
    () => nodes.filter((n) => n.type === "cluster"),
    [nodes],
  );

  const ingestStreamsByNode = useMemo(() => {
    const map: Record<string, typeof streams> = {};
    streams.forEach((s) => {
      if (s.ingestNode) (map[s.ingestNode] ??= []).push(s);
    });
    return map;
  }, [streams]);
  const maxIngest = Math.max(
    ...ingestNodes.map((n) => (ingestStreamsByNode[n.nodeId] ?? []).length),
    1,
  );

  const clusterInfos = useMemo<ClusterNodeInfo[]>(() => {
    const byNode: Record<string, ClusterNodeInfo["streams"]> = {};
    streams.forEach((s) => {
      const key = s.assignedNode || "__unassigned__";
      (byNode[key] ??= []).push({
        name: s.name,
        status: s.status,
        consumers: s.activeConsumers,
      });
    });
    const infos: ClusterNodeInfo[] = clusterNodes.map((n) => ({
      nodeId: n.nodeId,
      host: n.host,
      status: n.status,
      lastHeartbeatAt: n.lastHeartbeatAt,
      streams: byNode[n.nodeId] ?? [],
      totalConsumers: (byNode[n.nodeId] ?? []).reduce(
        (t, s) => t + s.consumers,
        0,
      ),
    }));
    const unassigned = byNode.__unassigned__;
    if (unassigned?.length) {
      infos.push({
        nodeId: "unassigned",
        status: "inactive",
        lastHeartbeatAt: "",
        streams: unassigned,
        totalConsumers: unassigned.reduce((t, s) => t + s.consumers, 0),
      });
    }
    return infos.sort((a, b) => {
      if (a.nodeId === "unassigned") return 1;
      if (b.nodeId === "unassigned") return -1;
      return b.streams.length - a.streams.length;
    });
  }, [clusterNodes, streams]);
  const maxCluster = Math.max(...clusterInfos.map((n) => n.streams.length), 1);

  const streamCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    streams.forEach((s) => {
      if (s.assignedNode)
        counts[s.assignedNode] = (counts[s.assignedNode] ?? 0) + 1;
      if (s.ingestNode)
        counts[s.ingestNode] = (counts[s.ingestNode] ?? 0) + 1;
    });
    return counts;
  }, [streams]);

  const [statusFilter, setStatusFilter] = useState("all");
  const tableNodes =
    statusFilter === "all"
      ? nodes
      : nodes.filter((n) => n.status === statusFilter);

  const unassign = (name: string) =>
    unassignStream.mutate(name, {
      onSuccess: () => toast.success(`${name} unassigned`),
    });

  const unassignedCount = streams.filter((s) => !s.assignedNode).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Topology</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {ingestNodes.length} ingest · {clusterNodes.length} cluster ·{" "}
          {streams.length} streams · {unassignedCount} unassigned
        </p>
      </div>

      <FlowBand streams={streams} nodes={nodes} />

      <Tabs defaultValue="flow">
        <TabsList>
          <TabsTrigger value="flow">Flow</TabsTrigger>
          <TabsTrigger value="board">Board</TabsTrigger>
          <TabsTrigger value="map">Map</TabsTrigger>
          <TabsTrigger value="table">Table</TabsTrigger>
        </TabsList>

        <TabsContent value="flow" className="mt-4">
          <StreamFlow streams={streams} nodes={nodes} />
        </TabsContent>

        <TabsContent value="board" className="mt-4">
          <LifecycleBoard streams={streams} />
        </TabsContent>

        <TabsContent value="map" className="mt-4 space-y-6">
          <section className="space-y-3">
            <h2 className="text-xs font-medium uppercase tracking-wide text-status-info">
              Ingest plane
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {ingestNodes.map((node) => (
                <IngestNodeCard
                  key={node.nodeId}
                  node={node}
                  streams={ingestStreamsByNode[node.nodeId] ?? []}
                  maxStreams={maxIngest}
                />
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xs font-medium uppercase tracking-wide text-status-healthy">
              Cluster plane
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {clusterInfos.map((node) => (
                <ClusterNodeCard
                  key={node.nodeId}
                  node={node}
                  maxStreams={maxCluster}
                  onUnassign={unassign}
                />
              ))}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="table" className="mt-4 space-y-3">
          <div className="flex items-center gap-1 rounded-md border border-border/50 bg-card p-0.5 w-fit">
            {["all", "active", "draining", "inactive"].map((value) => (
              <Button
                key={value}
                variant={statusFilter === value ? "default" : "ghost"}
                size="sm"
                className="h-7 px-3 text-xs capitalize"
                onClick={() => setStatusFilter(value)}
              >
                {value}
              </Button>
            ))}
          </div>
          <NodesTable nodes={tableNodes} streamCounts={streamCounts} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

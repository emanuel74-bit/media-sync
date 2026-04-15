import { usePods, useStreams, useUnassignStream } from "@/hooks/use-streams";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Server, Radio, Users, Unlink } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface PodInfo {
    podId: string;
    host?: string;
    status: string;
    tags: string[];
    lastHeartbeatAt: string;
    streams: { name: string; status: string; consumers: number }[];
    totalConsumers: number;
}

export default function ClusterPage() {
    const { data: streams = [] } = useStreams();
    const { data: pods = [] } = usePods();
    const unassignStream = useUnassignStream();

    const podInfos = useMemo(() => {
        const streamsByPod: Record<
            string,
            { name: string; status: string; consumers: number }[]
        > = {};
        streams.forEach((s) => {
            const key = s.assignedPod || "__unassigned__";
            if (!streamsByPod[key]) streamsByPod[key] = [];
            streamsByPod[key].push({
                name: s.name,
                status: s.status,
                consumers: s.activeConsumers,
            });
        });

        const infos: PodInfo[] = pods.map((p) => ({
            podId: p.podId,
            host: p.host,
            status: p.status,
            tags: p.tags,
            lastHeartbeatAt: p.lastHeartbeatAt,
            streams: streamsByPod[p.podId] || [],
            totalConsumers: (streamsByPod[p.podId] || []).reduce(
                (a, s) => a + s.consumers,
                0,
            ),
        }));

        const unassigned = streamsByPod["__unassigned__"];
        if (unassigned?.length) {
            infos.push({
                podId: "unassigned",
                status: "inactive",
                tags: [],
                lastHeartbeatAt: "",
                streams: unassigned,
                totalConsumers: unassigned.reduce((a, s) => a + s.consumers, 0),
            });
        }

        return infos.sort((a, b) => {
            if (a.podId === "unassigned") return 1;
            if (b.podId === "unassigned") return -1;
            return b.streams.length - a.streams.length;
        });
    }, [streams, pods]);

    const maxStreams = Math.max(...podInfos.map((p) => p.streams.length), 1);
    const unassignedCount = streams.filter((s) => !s.assignedPod).length;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Cluster View</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {pods.filter((p) => p.status === "active").length}{" "}
                        active pods · {streams.length} streams ·{" "}
                        {unassignedCount} unassigned
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {podInfos.map((pod) => (
                    <Card
                        key={pod.podId}
                        className={`border-border/50 ${pod.podId === "unassigned" ? "border-dashed opacity-75" : ""}`}
                    >
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Server className="h-4 w-4 text-muted-foreground" />
                                    <CardTitle className="text-sm font-mono-metric">
                                        {pod.podId}
                                    </CardTitle>
                                    {pod.podId !== "unassigned" && (
                                        <Badge
                                            variant="outline"
                                            className={`text-[10px] ${
                                                pod.status === "active"
                                                    ? "border-status-healthy/30 text-status-healthy"
                                                    : pod.status === "draining"
                                                      ? "border-status-warning/30 text-status-warning"
                                                      : "border-status-critical/30 text-status-critical"
                                            }`}
                                        >
                                            {pod.status}
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <Radio className="h-3 w-3" />
                                        {pod.streams.length}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Users className="h-3 w-3" />
                                        {pod.totalConsumers}
                                    </span>
                                </div>
                            </div>
                            {pod.host && (
                                <p className="text-[10px] text-muted-foreground font-mono-metric mt-1">
                                    {pod.host}
                                </p>
                            )}
                            {pod.lastHeartbeatAt && (
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                    Heartbeat{" "}
                                    {formatDistanceToNow(
                                        new Date(pod.lastHeartbeatAt),
                                        { addSuffix: true },
                                    )}
                                </p>
                            )}
                            <Progress
                                value={(pod.streams.length / maxStreams) * 100}
                                className="h-1.5 mt-2"
                            />
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="flex flex-wrap gap-1 mb-2">
                                {pod.tags.map((tag) => (
                                    <Badge
                                        key={tag}
                                        variant="secondary"
                                        className="text-[10px]"
                                    >
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                            <div className="space-y-1.5 max-h-40 overflow-auto">
                                {pod.streams.map((s) => (
                                    <div
                                        key={s.name}
                                        className="flex items-center justify-between text-xs py-1 px-2 rounded bg-muted/50 group"
                                    >
                                        <span className="font-mono-metric">
                                            {s.name}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground">
                                                {s.consumers}c
                                            </span>
                                            <div
                                                className={`h-1.5 w-1.5 rounded-full ${
                                                    s.status === "active"
                                                        ? "bg-status-healthy"
                                                        : s.status === "error"
                                                          ? "bg-status-critical"
                                                          : s.status ===
                                                              "assigned"
                                                            ? "bg-status-info"
                                                            : s.status ===
                                                                "discovered"
                                                              ? "bg-status-warning"
                                                              : "bg-status-inactive"
                                                }`}
                                            />
                                            {pod.podId !== "unassigned" && (
                                                <button
                                                    onClick={() =>
                                                        unassignStream.mutate(
                                                            s.name,
                                                            {
                                                                onSuccess: () =>
                                                                    toast.success(
                                                                        `${s.name} unassigned`,
                                                                    ),
                                                            },
                                                        )
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

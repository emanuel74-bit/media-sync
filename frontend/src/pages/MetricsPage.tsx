import { useQueries } from "@tanstack/react-query";
import { useStreams } from "@/hooks/use-streams";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { metricsApi } from "@/services/api";

const timeRanges = [
    { label: "15m", limit: 15 },
    { label: "1h", limit: 60 },
    { label: "6h", limit: 120 },
    { label: "24h", limit: 200 },
];

const chartStyle = {
    backgroundColor: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "6px",
    fontSize: 12,
};

const colors = [
    "hsl(var(--primary))",
    "hsl(var(--status-healthy))",
    "hsl(var(--status-warning))",
    "hsl(var(--status-info))",
];

export default function MetricsPage() {
    const { data: streams = [] } = useStreams();
    const [selectedStreams, setSelectedStreams] = useState<string[]>([]);
    const [timeRange, setTimeRange] = useState(60);
    const [context, setContext] = useState<"all" | "ingest" | "cluster">("all");
    const [liveMode, setLiveMode] = useState(false);

    const metricsQueries = useQueries({
        queries: selectedStreams.map((name) => ({
            queryKey: ["metrics", name, timeRange],
            queryFn: () => metricsApi.getByStream(name, timeRange),
            refetchInterval: liveMode ? 10000 : false,
        })),
    });

    const addStream = (name: string) => {
        if (
            name &&
            !selectedStreams.includes(name) &&
            selectedStreams.length < 4
        ) {
            setSelectedStreams([...selectedStreams, name]);
        }
    };

    const removeStream = (name: string) =>
        setSelectedStreams(selectedStreams.filter((s) => s !== name));

    const metricsData = useMemo(() => {
        if (selectedStreams.length === 0) return [];
        const allMetrics = selectedStreams.map((name) => {
            const index = selectedStreams.indexOf(name);
            const metrics = metricsQueries[index]?.data || [];
            const filtered =
                context === "all"
                    ? metrics
                    : metrics.filter((m) => m.context === context);
            return { name, metrics: filtered };
        });

        const timestamps = allMetrics[0]?.metrics.map((m) => m.createdAt) || [];
        return timestamps.map((t, i) => {
            const point: Record<string, any> = {
                time: format(new Date(t), "HH:mm"),
            };
            allMetrics.forEach(({ name, metrics }) => {
                const m = metrics[i];
                if (m) {
                    point[`${name}_bitrate`] = Math.round(m.bitrate);
                    point[`${name}_fps`] = Number(m.fps.toFixed(1));
                    point[`${name}_latency`] = Math.round(m.latency);
                    point[`${name}_jitter`] = Number(m.jitter.toFixed(1));
                    point[`${name}_packetLoss`] = Number(
                        m.packetLoss.toFixed(2),
                    );
                    point[`${name}_consumers`] = m.consumers;
                }
            });
            return point;
        });
    }, [context, metricsQueries, selectedStreams]);

    const metricTypes = [
        { key: "bitrate", label: "Bitrate (kbps)" },
        { key: "fps", label: "FPS" },
        { key: "latency", label: "Latency (ms)" },
        { key: "jitter", label: "Jitter (ms)" },
        { key: "packetLoss", label: "Packet Loss (%)" },
        { key: "consumers", label: "Consumers" },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">Metrics & Monitoring</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Compare stream metrics across time
                </p>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3">
                <Select onValueChange={addStream}>
                    <SelectTrigger className="w-[200px] h-9 bg-card">
                        <SelectValue placeholder="Add stream..." />
                    </SelectTrigger>
                    <SelectContent>
                        {streams
                            .filter((s) => !selectedStreams.includes(s.name))
                            .slice(0, 20)
                            .map((s) => (
                                <SelectItem key={s.name} value={s.name}>
                                    {s.name}
                                </SelectItem>
                            ))}
                    </SelectContent>
                </Select>

                <div className="flex items-center gap-1 bg-card rounded-md border border-border/50 p-0.5">
                    {timeRanges.map((tr) => (
                        <Button
                            key={tr.label}
                            variant={
                                timeRange === tr.limit ? "default" : "ghost"
                            }
                            size="sm"
                            className="h-7 px-3 text-xs"
                            onClick={() => setTimeRange(tr.limit)}
                        >
                            {tr.label}
                        </Button>
                    ))}
                </div>

                <div className="flex items-center gap-1 bg-card rounded-md border border-border/50 p-0.5">
                    {(["all", "ingest", "cluster"] as const).map((c) => (
                        <Button
                            key={c}
                            variant={context === c ? "default" : "ghost"}
                            size="sm"
                            className="h-7 px-3 text-xs capitalize"
                            onClick={() => setContext(c)}
                        >
                            {c}
                        </Button>
                    ))}
                </div>

                <div className="flex items-center gap-2 ml-auto">
                    <span className="text-xs text-muted-foreground">Live</span>
                    <Switch checked={liveMode} onCheckedChange={setLiveMode} />
                </div>
            </div>

            {/* Selected streams tags */}
            {selectedStreams.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                    {selectedStreams.map((name, i) => (
                        <div
                            key={name}
                            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-card border border-border/50 text-xs"
                        >
                            <div
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: colors[i] }}
                            />
                            <span className="font-mono-metric">{name}</span>
                            <button
                                onClick={() => removeStream(name)}
                                className="text-muted-foreground hover:text-foreground ml-1"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {selectedStreams.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                    Select a stream to view metrics
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {metricTypes.map(({ key, label }) => (
                        <Card key={key} className="border-border/50">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    {label}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={metricsData}>
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            stroke="hsl(var(--border))"
                                        />
                                        <XAxis
                                            dataKey="time"
                                            tick={{
                                                fontSize: 9,
                                                fill: "hsl(var(--muted-foreground))",
                                            }}
                                        />
                                        <YAxis
                                            tick={{
                                                fontSize: 9,
                                                fill: "hsl(var(--muted-foreground))",
                                            }}
                                        />
                                        <Tooltip contentStyle={chartStyle} />
                                        {selectedStreams.map((name, i) => (
                                            <Area
                                                key={name}
                                                type="monotone"
                                                dataKey={`${name}_${key}`}
                                                stroke={colors[i]}
                                                fill={colors[i]}
                                                fillOpacity={0.1}
                                                strokeWidth={1.5}
                                                name={name}
                                            />
                                        ))}
                                    </AreaChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

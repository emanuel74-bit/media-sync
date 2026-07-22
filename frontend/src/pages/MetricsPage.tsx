import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { metricsApi } from "@/services/api";
import { useStreams } from "@/hooks/use-streams";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const TIME_RANGES = [
  { label: "15m", limit: 15 },
  { label: "1h", limit: 60 },
  { label: "6h", limit: 120 },
  { label: "24h", limit: 200 },
];
const METRIC_TYPES = [
  { key: "bytesReceived", label: "Bytes Received" },
  { key: "bytesSent", label: "Bytes Sent" },
  { key: "readers", label: "Readers" },
  { key: "framesInError", label: "Frames in Error" },
  { key: "ready", label: "Ready (1/0)" },
] as const;
const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--status-healthy))",
  "hsl(var(--status-warning))",
  "hsl(var(--status-info))",
];
const CHART_STYLE = {
  backgroundColor: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "6px",
  fontSize: 12,
};

export default function MetricsPage() {
  const { data: streams = [] } = useStreams();
  const [selectedStreams, setSelectedStreams] = useState<string[]>([]);
  const [timeRange, setTimeRange] = useState(60);
  const [context, setContext] = useState<"all" | "ingest" | "cluster">("all");
  const [liveMode, setLiveMode] = useState(false);
  const refetchInterval: number | false = liveMode ? 10000 : false;

  const metricsQueries = useQueries({
    queries: selectedStreams.map((name) => ({
      queryKey: ["metrics", name, timeRange],
      queryFn: () => metricsApi.getByStream(name, timeRange),
      refetchInterval,
    })),
  });

  const addStream = (name: string) => {
    if (name && !selectedStreams.includes(name) && selectedStreams.length < 4) {
      setSelectedStreams([...selectedStreams, name]);
    }
  };
  const removeStream = (name: string) =>
    setSelectedStreams(selectedStreams.filter((stream) => stream !== name));

  const metricsData = useMemo(() => {
    if (!selectedStreams.length) return [];
    const series = selectedStreams.map((name, index) => ({
      name,
      metrics: [...(metricsQueries[index]?.data ?? [])]
        .filter((metric) => context === "all" || metric.context === context)
        .reverse(),
    }));
    const length = Math.max(...series.map(({ metrics }) => metrics.length), 0);

    return Array.from({ length }, (_, index) => {
      const timestamp = series.find(({ metrics }) => metrics[index]?.createdAt)
        ?.metrics[index]?.createdAt;
      const point: Record<string, string | number> = {
        time: timestamp ? format(new Date(timestamp), "HH:mm") : `${index + 1}`,
      };
      series.forEach(({ name, metrics }) => {
        const metric = metrics[index];
        if (!metric) return;
        point[`${name}_bytesReceived`] = metric.bytesReceived;
        point[`${name}_bytesSent`] = metric.bytesSent;
        point[`${name}_readers`] = metric.readers;
        point[`${name}_framesInError`] = metric.framesInError;
        point[`${name}_ready`] = metric.ready ? 1 : 0;
      });
      return point;
    });
  }, [context, metricsQueries, selectedStreams]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Metrics & Monitoring</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Compare MediaMTX path metrics across time
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select onValueChange={addStream}>
          <SelectTrigger className="w-[200px] h-9 bg-card">
            <SelectValue placeholder="Add stream..." />
          </SelectTrigger>
          <SelectContent>
            {streams
              .filter((stream) => !selectedStreams.includes(stream.name))
              .slice(0, 20)
              .map((stream) => (
                <SelectItem key={stream.name} value={stream.name}>
                  {stream.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1 bg-card rounded-md border border-border/50 p-0.5">
          {TIME_RANGES.map((range) => (
            <Button
              key={range.label}
              variant={timeRange === range.limit ? "default" : "ghost"}
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={() => setTimeRange(range.limit)}
            >
              {range.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-1 bg-card rounded-md border border-border/50 p-0.5">
          {(["all", "ingest", "cluster"] as const).map((value) => (
            <Button
              key={value}
              variant={context === value ? "default" : "ghost"}
              size="sm"
              className="h-7 px-3 text-xs capitalize"
              onClick={() => setContext(value)}
            >
              {value}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-muted-foreground">Live</span>
          <Switch checked={liveMode} onCheckedChange={setLiveMode} />
        </div>
      </div>

      {selectedStreams.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {selectedStreams.map((name, index) => (
            <div
              key={name}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-card border border-border/50 text-xs"
            >
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: COLORS[index] }}
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

      {!selectedStreams.length ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
          Select a stream to view metrics
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {METRIC_TYPES.map(({ key, label }) => (
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
                    <Tooltip contentStyle={CHART_STYLE} />
                    {selectedStreams.map((name, index) => (
                      <Area
                        key={name}
                        type="monotone"
                        dataKey={`${name}_${key}`}
                        stroke={COLORS[index]}
                        fill={COLORS[index]}
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

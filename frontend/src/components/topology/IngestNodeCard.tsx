import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { HardDrive, Radio, Timer, Upload } from "lucide-react";

import type { Node, Stream } from "@/types";
import { cn } from "@/lib/utils";
import {
  TONE,
  isReservationExpiring,
  reservationMinutesLeft,
} from "@/lib/lifecycle";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const STATUS_TONE = {
  active: "healthy",
  draining: "warning",
  inactive: "critical",
} as const;

// Ingest-plane node: hosted streams, live reservations w/ expiry, publish state.
export function IngestNodeCard({
  node,
  streams,
  maxStreams,
}: {
  node: Node;
  streams: Stream[];
  maxStreams: number;
}) {
  const navigate = useNavigate();
  const tone = TONE[STATUS_TONE[node.status]];
  const reservations = streams.filter((s) => s.status === "reserved");
  const publishing = streams.filter(
    (s) => s.status === "discovered" || s.status === "synced",
  );

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono-metric text-sm font-medium">
              {node.nodeId}
            </span>
            <Badge variant="outline" className={cn(tone.text, tone.border)}>
              {node.status}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1" title="hosted streams">
              <Radio className="h-3 w-3" />
              {streams.length}
            </span>
            <span className="flex items-center gap-1" title="publishing">
              <Upload className="h-3 w-3" />
              {publishing.length}
            </span>
          </div>
        </div>
        <p className="mt-1 font-mono-metric text-[10px] text-muted-foreground">
          {node.host} · RTSP {node.rtspPort} · API {node.apiPort}
        </p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          Heartbeat{" "}
          {formatDistanceToNow(new Date(node.lastHeartbeatAt), {
            addSuffix: true,
          })}
        </p>
        <Progress
          value={(streams.length / maxStreams) * 100}
          className="mt-2 h-1.5"
        />
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {reservations.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Reservations
            </p>
            {reservations.map((stream) => {
              const left = reservationMinutesLeft(stream);
              const expiring = isReservationExpiring(stream);
              return (
                <div
                  key={stream.name}
                  className="flex items-center justify-between rounded bg-muted/50 px-2 py-1 text-xs"
                >
                  <span className="font-mono-metric">{stream.name}</span>
                  <span
                    className={cn(
                      "flex items-center gap-1",
                      expiring ? "text-status-critical" : "text-muted-foreground",
                    )}
                  >
                    <Timer className="h-3 w-3" />
                    {left !== null ? `${left}m` : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="max-h-40 space-y-1.5 overflow-auto">
          {streams
            .filter((s) => s.status !== "reserved")
            .map((stream) => (
              <button
                key={stream.name}
                onClick={() =>
                  navigate(`/streams/${encodeURIComponent(stream.name)}`)
                }
                className="flex w-full items-center justify-between rounded bg-muted/50 px-2 py-1 text-left text-xs hover:bg-muted"
              >
                <span className="font-mono-metric truncate">{stream.name}</span>
                <span className="text-muted-foreground">
                  {stream.activeConsumers}c
                </span>
              </button>
            ))}
          {streams.length === 0 && (
            <p className="py-2 text-center text-xs text-muted-foreground">
              No streams on this node
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

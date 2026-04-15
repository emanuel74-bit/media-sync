import { useStreamInspection, useStreamInspectionHistory } from '@/hooks/use-streams';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Monitor, Volume2, Subtitles, Database, Clock } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { StreamTrack, StreamInspection } from '@/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

function TrackIcon({ type }: { type: StreamTrack['type'] }) {
  switch (type) {
    case 'video': return <Monitor className="h-4 w-4" />;
    case 'audio': return <Volume2 className="h-4 w-4" />;
    case 'subtitle': return <Subtitles className="h-4 w-4" />;
    default: return <Database className="h-4 w-4" />;
  }
}

function TrackCard({ track }: { track: StreamTrack }) {
  return (
    <div className="rounded-lg border border-border/50 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <TrackIcon type={track.type} />
        <span className="text-sm font-medium capitalize">{track.type}</span>
        {track.codec && <Badge variant="secondary" className="text-xs font-mono-metric">{track.codec}</Badge>}
        {track.language && <Badge variant="outline" className="text-xs">{track.language}</Badge>}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
        {track.type === 'video' && (
          <>
            {track.width && track.height && (
              <div><span className="text-muted-foreground">Resolution</span><p className="font-mono-metric">{track.width}×{track.height}</p></div>
            )}
            {track.fps != null && (
              <div><span className="text-muted-foreground">FPS</span><p className="font-mono-metric">{track.fps}</p></div>
            )}
            {track.bitrate != null && (
              <div><span className="text-muted-foreground">Bitrate</span><p className="font-mono-metric">{track.bitrate} kbps</p></div>
            )}
          </>
        )}
        {track.type === 'audio' && (
          <>
            {track.channels != null && (
              <div><span className="text-muted-foreground">Channels</span><p className="font-mono-metric">{track.channels === 1 ? 'Mono' : track.channels === 2 ? 'Stereo' : `${track.channels}ch`}</p></div>
            )}
            {track.sampleRate != null && (
              <div><span className="text-muted-foreground">Sample Rate</span><p className="font-mono-metric">{(track.sampleRate / 1000).toFixed(1)} kHz</p></div>
            )}
            {track.bitrate != null && (
              <div><span className="text-muted-foreground">Bitrate</span><p className="font-mono-metric">{track.bitrate} kbps</p></div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function InspectionCard({ inspection, isLatest }: { inspection: StreamInspection; isLatest?: boolean }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant={inspection.source === 'ingest' ? 'default' : 'secondary'}>{inspection.source}</Badge>
        {isLatest && <Badge variant="outline" className="border-status-healthy/30 text-status-healthy text-xs">Latest</Badge>}
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatDistanceToNow(new Date(inspection.inspectedAt), { addSuffix: true })}
        </span>
        {inspection.metadata?.encoder && (
          <Badge variant="outline" className="text-xs font-mono-metric">{inspection.metadata.encoder}</Badge>
        )}
      </div>
      {inspection.lastError && (
        <div className="flex items-start gap-2 text-sm text-status-critical bg-status-critical/5 rounded-md p-2">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{inspection.lastError}</span>
        </div>
      )}
      <div className="space-y-2">
        {inspection.tracks.map((track, i) => (
          <TrackCard key={i} track={track} />
        ))}
      </div>
    </div>
  );
}

export function StreamInspectionPanel({ streamName }: { streamName: string }) {
  const { data: latest } = useStreamInspection(streamName);
  const { data: history = [] } = useStreamInspectionHistory(streamName, 10);

  return (
    <div className="space-y-4">
      {/* Latest Inspection */}
      {latest && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Latest Inspection</CardTitle>
          </CardHeader>
          <CardContent>
            <InspectionCard inspection={latest} isLatest />
          </CardContent>
        </Card>
      )}

      {/* History */}
      {history.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Inspection History</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="space-y-1">
              {history.map((insp, i) => (
                <AccordionItem key={insp._id} value={insp._id} className="border-border/30">
                  <AccordionTrigger className="py-2 text-sm hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Badge variant={insp.source === 'ingest' ? 'default' : 'secondary'} className="text-xs">{insp.source}</Badge>
                      <span className="font-mono-metric text-xs text-muted-foreground">
                        {format(new Date(insp.inspectedAt), 'MMM d, HH:mm:ss')}
                      </span>
                      <span className="text-xs text-muted-foreground">{insp.tracks.length} tracks</span>
                      {insp.lastError && <AlertTriangle className="h-3 w-3 text-status-critical" />}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <InspectionCard inspection={insp} />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {!latest && history.length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">No inspection data available</p>
      )}
    </div>
  );
}

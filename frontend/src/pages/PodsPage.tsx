import { usePods, useStreams } from '@/hooks/use-streams';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Server, Wifi, WifiOff, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function PodsPage() {
  const { data: pods = [] } = usePods();
  const { data: streams = [] } = useStreams();
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return pods;
    return pods.filter(p => p.status === statusFilter);
  }, [pods, statusFilter]);

  const podStreamCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    streams.forEach(s => {
      if (s.assignedPod) counts[s.assignedPod] = (counts[s.assignedPod] || 0) + 1;
    });
    return counts;
  }, [streams]);

  const activePods = pods.filter(p => p.status === 'active').length;
  const inactivePods = pods.filter(p => p.status === 'inactive').length;
  const drainingPods = pods.filter(p => p.status === 'draining').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Pods</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {activePods} active · {inactivePods} inactive · {drainingPods} draining
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-status-healthy/10 flex items-center justify-center">
              <Wifi className="h-4 w-4 text-status-healthy" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active</p>
              <p className="text-xl font-semibold font-mono-metric">{activePods}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-status-warning/10 flex items-center justify-center">
              <Clock className="h-4 w-4 text-status-warning" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Draining</p>
              <p className="text-xl font-semibold font-mono-metric">{drainingPods}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-status-critical/10 flex items-center justify-center">
              <WifiOff className="h-4 w-4 text-status-critical" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Inactive</p>
              <p className="text-xl font-semibold font-mono-metric">{inactivePods}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] h-9 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="draining">Draining</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border border-border/50 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Pod ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Host</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Streams</TableHead>
              <TableHead>Last Heartbeat</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(pod => (
              <TableRow key={pod._id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Server className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium font-mono-metric text-sm">{pod.podId}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      pod.status === 'active' ? 'border-status-healthy/30 text-status-healthy bg-status-healthy/10' :
                      pod.status === 'draining' ? 'border-status-warning/30 text-status-warning bg-status-warning/10' :
                      'border-status-critical/30 text-status-critical bg-status-critical/10'
                    }
                  >
                    {pod.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm font-mono-metric text-muted-foreground">{pod.host || '—'}</span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {pod.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                    ))}
                    {pod.tags.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-mono-metric text-sm">{podStreamCounts[pod.podId] || 0}</span>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(pod.lastHeartbeatAt), { addSuffix: true })}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

import { useAlerts, useResolveAlert } from '@/hooks/use-streams';
import { SeverityBadge } from '@/components/StatusBadge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, CheckCircle } from 'lucide-react';
import { useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export default function AlertsPage() {
  const { data: alerts = [] } = useAlerts();
  const resolveAlert = useResolveAlert();
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = useMemo(() => {
    return alerts
      .filter(a => {
        if (search && !a.streamName.toLowerCase().includes(search.toLowerCase()) && !a.message.toLowerCase().includes(search.toLowerCase())) return false;
        if (severityFilter !== 'all' && a.severity !== severityFilter) return false;
        if (statusFilter === 'open' && a.resolved) return false;
        if (statusFilter === 'resolved' && !a.resolved) return false;
        return true;
      })
      .sort((a, b) => {
        if (!a.resolved && b.resolved) return -1;
        if (a.resolved && !b.resolved) return 1;
        const sevOrder = { critical: 0, warning: 1, info: 2 };
        if (sevOrder[a.severity] !== sevOrder[b.severity]) return sevOrder[a.severity] - sevOrder[b.severity];
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [alerts, search, severityFilter, statusFilter]);

  const stats = useMemo(() => ({
    total: alerts.length,
    open: alerts.filter(a => !a.resolved).length,
    critical: alerts.filter(a => !a.resolved && a.severity === 'critical').length,
  }), [alerts]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Alerts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {stats.open} open · {stats.critical > 0 && <span className="text-status-critical">{stats.critical} critical</span>}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search alerts..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 bg-card" />
        </div>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[130px] h-9 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] h-9 bg-card"><SelectValue /></SelectTrigger>
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
              <TableHead>Stream</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="hidden md:table-cell">Message</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(alert => (
              <TableRow key={alert._id} className={cn(!alert.resolved && alert.severity === 'critical' && 'bg-status-critical/5')}>
                <TableCell><SeverityBadge severity={alert.severity} /></TableCell>
                <TableCell><span className="font-mono-metric text-sm">{alert.streamName}</span></TableCell>
                <TableCell><span className="text-xs text-muted-foreground">{alert.type}</span></TableCell>
                <TableCell className="hidden md:table-cell max-w-[300px]"><span className="text-sm truncate block">{alert.message}</span></TableCell>
                <TableCell><span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}</span></TableCell>
                <TableCell>
                  <Badge variant={alert.resolved ? 'secondary' : 'outline'} className={cn(alert.resolved ? '' : 'border-status-warning/30 text-status-warning', 'text-xs')}>
                    {alert.resolved ? 'Resolved' : 'Open'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {!alert.resolved && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => resolveAlert.mutate(alert._id)}>
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

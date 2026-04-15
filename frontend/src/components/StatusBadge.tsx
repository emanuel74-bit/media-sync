import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config: Record<string, { label: string; class: string }> = {
    active: { label: 'Active', class: 'bg-status-healthy/15 text-status-healthy border-status-healthy/30' },
    inactive: { label: 'Inactive', class: 'bg-status-inactive/15 text-status-inactive border-status-inactive/30' },
    error: { label: 'Error', class: 'bg-status-critical/15 text-status-critical border-status-critical/30' },
    discovered: { label: 'Discovered', class: 'bg-status-info/15 text-status-info border-status-info/30' },
    assigned: { label: 'Assigned', class: 'bg-status-warning/15 text-status-warning border-status-warning/30' },
  };
  const c = config[status] || config.inactive;
  return <Badge variant="outline" className={cn(c.class, className)}>{c.label}</Badge>;
}

interface SeverityBadgeProps {
  severity: 'info' | 'warning' | 'critical';
  className?: string;
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const config: Record<string, { class: string }> = {
    info: { class: 'bg-status-info/15 text-status-info border-status-info/30' },
    warning: { class: 'bg-status-warning/15 text-status-warning border-status-warning/30' },
    critical: { class: 'bg-status-critical/15 text-status-critical border-status-critical/30' },
  };
  const c = config[severity];
  return <Badge variant="outline" className={cn(c.class, 'capitalize', className)}>{severity}</Badge>;
}

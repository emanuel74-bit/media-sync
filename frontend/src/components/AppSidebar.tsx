import {
  LayoutDashboard, Radio, BarChart3, AlertTriangle, Server, Activity, HardDrive
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import { useAlerts } from '@/hooks/use-streams';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';

const navItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Streams', url: '/streams', icon: Radio },
  { title: 'Pods', url: '/pods', icon: HardDrive },
  { title: 'Metrics', url: '/metrics', icon: BarChart3 },
  { title: 'Alerts', url: '/alerts', icon: AlertTriangle },
  { title: 'Cluster', url: '/cluster', icon: Server },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { data: alerts } = useAlerts();
  const unresolvedCount = alerts?.filter(a => !a.resolved).length || 0;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-sidebar-primary shrink-0" />
          {!collapsed && (
            <div>
              <h1 className="text-sm font-semibold text-sidebar-foreground">MediaMTX</h1>
              <p className="text-[10px] text-sidebar-foreground/60 uppercase tracking-widest">Stream Sync</p>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40">Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = item.url === '/' ? location.pathname === '/' : location.pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <NavLink to={item.url} end={item.url === '/'} activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                        {!collapsed && item.title === 'Alerts' && unresolvedCount > 0 && (
                          <Badge className="ml-auto h-5 min-w-5 justify-center bg-status-critical/20 text-status-critical border-0 text-[10px]">
                            {unresolvedCount}
                          </Badge>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3 border-t border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-status-healthy animate-pulse-status" />
            <span className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider">System Online</span>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

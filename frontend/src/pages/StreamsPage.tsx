import {
    useStreams,
    useToggleStream,
    useAssignStream,
    useUnassignStream,
    useActivePods,
} from "@/hooks/use-streams";
import { StatusBadge } from "@/components/StatusBadge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Search,
    ExternalLink,
    AlertCircle,
    Plus,
    MoreHorizontal,
    Pencil,
    Trash2,
    Link2,
    Unlink,
} from "lucide-react";
import { useState, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { CreateStreamDialog } from "@/components/CreateStreamDialog";
import { EditStreamDialog } from "@/components/EditStreamDialog";
import { DeleteStreamDialog } from "@/components/DeleteStreamDialog";
import { Stream } from "@/types";
import { toast } from "sonner";

export default function StreamsPage() {
    const { data: streams = [] } = useStreams();
    const { data: activePods = [] } = useActivePods();
    const toggleStream = useToggleStream();
    const assignStream = useAssignStream();
    const unassignStream = useUnassignStream();
    const navigate = useNavigate();
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [enabledFilter, setEnabledFilter] = useState("all");
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [createOpen, setCreateOpen] = useState(false);
    const [editStream, setEditStream] = useState<Stream | null>(null);
    const [deleteStreamName, setDeleteStreamName] = useState<string | null>(
        null,
    );

    const filtered = useMemo(() => {
        return streams.filter((s) => {
            if (
                search &&
                !s.name.toLowerCase().includes(search.toLowerCase()) &&
                !s.source.toLowerCase().includes(search.toLowerCase())
            )
                return false;
            if (statusFilter !== "all" && s.status !== statusFilter)
                return false;
            if (enabledFilter === "enabled" && !s.isEnabled) return false;
            if (enabledFilter === "disabled" && s.isEnabled) return false;
            return true;
        });
    }, [streams, search, statusFilter, enabledFilter]);

    const toggleSelect = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (selected.size === filtered.length) setSelected(new Set());
        else setSelected(new Set(filtered.map((s) => s._id)));
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Streams</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {filtered.length} of {streams.length} streams
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button size="sm" onClick={() => setCreateOpen(true)}>
                        <Plus className="h-4 w-4 mr-1" /> Create Stream
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search streams..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-9 bg-card"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px] h-9 bg-card">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="discovered">Discovered</SelectItem>
                        <SelectItem value="assigned">Assigned</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={enabledFilter} onValueChange={setEnabledFilter}>
                    <SelectTrigger className="w-[130px] h-9 bg-card">
                        <SelectValue placeholder="Enabled" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="enabled">Enabled</SelectItem>
                        <SelectItem value="disabled">Disabled</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Bulk Actions */}
            {selected.size > 0 && (
                <div className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border/50">
                    <span className="text-sm text-muted-foreground">
                        {selected.size} selected
                    </span>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                            selected.forEach((id) => {
                                const s = streams.find((s) => s._id === id);
                                if (s)
                                    toggleStream.mutate({
                                        name: s.name,
                                        isEnabled: true,
                                    });
                            });
                            setSelected(new Set());
                        }}
                    >
                        Enable All
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                            selected.forEach((id) => {
                                const s = streams.find((s) => s._id === id);
                                if (s)
                                    toggleStream.mutate({
                                        name: s.name,
                                        isEnabled: false,
                                    });
                            });
                            setSelected(new Set());
                        }}
                    >
                        Disable All
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelected(new Set())}
                    >
                        Clear
                    </Button>
                </div>
            )}

            {/* Table */}
            <div className="border border-border/50 rounded-lg overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="w-10">
                                <Checkbox
                                    checked={
                                        selected.size === filtered.length &&
                                        filtered.length > 0
                                    }
                                    onCheckedChange={toggleAll}
                                />
                            </TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Enabled</TableHead>
                            <TableHead className="hidden md:table-cell">
                                Source
                            </TableHead>
                            <TableHead>Consumers</TableHead>
                            <TableHead className="hidden lg:table-cell">
                                Pod
                            </TableHead>
                            <TableHead className="hidden lg:table-cell">
                                Last Seen
                            </TableHead>
                            <TableHead className="w-10" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.map((stream) => (
                            <TableRow
                                key={stream._id}
                                className="cursor-pointer group"
                                onClick={() =>
                                    navigate(`/streams/${stream.name}`)
                                }
                            >
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                    <Checkbox
                                        checked={selected.has(stream._id)}
                                        onCheckedChange={() =>
                                            toggleSelect(stream._id)
                                        }
                                    />
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium font-mono-metric text-sm">
                                            {stream.name}
                                        </span>
                                        {stream.lastError && (
                                            <AlertCircle className="h-3.5 w-3.5 text-status-critical" />
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <StatusBadge status={stream.status} />
                                </TableCell>
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                    <Switch
                                        checked={stream.isEnabled}
                                        onCheckedChange={(checked) =>
                                            toggleStream.mutate({
                                                name: stream.name,
                                                isEnabled: checked,
                                            })
                                        }
                                    />
                                </TableCell>
                                <TableCell className="hidden md:table-cell">
                                    <span className="text-xs font-mono-metric text-muted-foreground truncate max-w-[200px] block">
                                        {stream.source}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <span className="font-mono-metric text-sm">
                                        {stream.activeConsumers}
                                    </span>
                                </TableCell>
                                <TableCell className="hidden lg:table-cell">
                                    {stream.assignedPod ? (
                                        <Badge
                                            variant="outline"
                                            className="text-xs font-mono-metric"
                                        >
                                            {stream.assignedPod}
                                        </Badge>
                                    ) : (
                                        <span className="text-xs text-muted-foreground">
                                            —
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="hidden lg:table-cell">
                                    <span className="text-xs text-muted-foreground">
                                        {stream.lastSeenAt
                                            ? formatDistanceToNow(
                                                  new Date(stream.lastSeenAt),
                                                  { addSuffix: true },
                                              )
                                            : "—"}
                                    </span>
                                </TableCell>
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    navigate(
                                                        `/streams/${stream.name}`,
                                                    )
                                                }
                                            >
                                                <ExternalLink className="h-3.5 w-3.5 mr-2" />{" "}
                                                View Details
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    setEditStream(stream)
                                                }
                                            >
                                                <Pencil className="h-3.5 w-3.5 mr-2" />{" "}
                                                Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuSub>
                                                <DropdownMenuSubTrigger>
                                                    <Link2 className="h-3.5 w-3.5 mr-2" />{" "}
                                                    Assign to Pod
                                                </DropdownMenuSubTrigger>
                                                <DropdownMenuSubContent>
                                                    {activePods.map((pod) => (
                                                        <DropdownMenuItem
                                                            key={pod.podId}
                                                            onClick={() =>
                                                                assignStream.mutate(
                                                                    {
                                                                        name: stream.name,
                                                                        podId: pod.podId,
                                                                    },
                                                                    {
                                                                        onSuccess:
                                                                            () =>
                                                                                toast.success(
                                                                                    `${stream.name} assigned to ${pod.podId}`,
                                                                                ),
                                                                    },
                                                                )
                                                            }
                                                        >
                                                            {pod.podId}
                                                            {stream.assignedPod ===
                                                                pod.podId && (
                                                                <Badge
                                                                    variant="secondary"
                                                                    className="ml-2 text-[10px]"
                                                                >
                                                                    current
                                                                </Badge>
                                                            )}
                                                        </DropdownMenuItem>
                                                    ))}
                                                    {activePods.length ===
                                                        0 && (
                                                        <DropdownMenuItem
                                                            disabled
                                                        >
                                                            No active pods
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuSubContent>
                                            </DropdownMenuSub>
                                            {stream.assignedPod && (
                                                <DropdownMenuItem
                                                    onClick={() =>
                                                        unassignStream.mutate(
                                                            stream.name,
                                                            {
                                                                onSuccess: () =>
                                                                    toast.success(
                                                                        `${stream.name} unassigned`,
                                                                    ),
                                                            },
                                                        )
                                                    }
                                                >
                                                    <Unlink className="h-3.5 w-3.5 mr-2" />{" "}
                                                    Unassign
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                className="text-destructive focus:text-destructive"
                                                onClick={() =>
                                                    setDeleteStreamName(
                                                        stream.name,
                                                    )
                                                }
                                            >
                                                <Trash2 className="h-3.5 w-3.5 mr-2" />{" "}
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <CreateStreamDialog
                open={createOpen}
                onOpenChange={setCreateOpen}
            />
            <EditStreamDialog
                stream={editStream}
                open={!!editStream}
                onOpenChange={(open) => {
                    if (!open) setEditStream(null);
                }}
            />
            <DeleteStreamDialog
                streamName={deleteStreamName}
                open={!!deleteStreamName}
                onOpenChange={(open) => {
                    if (!open) setDeleteStreamName(null);
                }}
            />
        </div>
    );
}

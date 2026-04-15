import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useUpdateStream } from "@/hooks/use-streams";
import { Stream } from "@/types";
import { toast } from "sonner";

interface Props {
    stream: Stream | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditStreamDialog({ stream, open, onOpenChange }: Props) {
    const [source, setSource] = useState("");
    const [enabled, setEnabled] = useState(false);
    const updateStream = useUpdateStream();

    useEffect(() => {
        if (stream) {
            setSource(stream.source);
            setEnabled(stream.enabled);
        }
    }, [stream]);

    if (!stream) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedSource = source.trim();
        if (!trimmedSource) return;

        updateStream.mutate(
            { name: stream.name, data: { source: trimmedSource, enabled } },
            {
                onSuccess: () => {
                    toast.success(`Stream "${stream.name}" updated`);
                    onOpenChange(false);
                },
                onError: (err) => toast.error(err.message),
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Stream</DialogTitle>
                    <DialogDescription>
                        Update settings for{" "}
                        <span className="font-mono-metric">{stream.name}</span>
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Name</Label>
                        <Input
                            value={stream.name}
                            disabled
                            className="opacity-60"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-source">Source URL</Label>
                        <Input
                            id="edit-source"
                            value={source}
                            onChange={(e) => setSource(e.target.value)}
                            maxLength={500}
                            required
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label htmlFor="edit-enabled">Enabled</Label>
                        <Switch
                            id="edit-enabled"
                            checked={enabled}
                            onCheckedChange={setEnabled}
                        />
                    </div>
                    {stream.metadata &&
                        Object.keys(stream.metadata).length > 0 && (
                            <div className="rounded-md border border-border/50 bg-muted/40 p-3 text-xs text-muted-foreground">
                                This backend does not expose stream metadata
                                updates. Existing metadata remains visible in
                                the detail page.
                            </div>
                        )}
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={updateStream.isPending}>
                            {updateStream.isPending
                                ? "Saving..."
                                : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

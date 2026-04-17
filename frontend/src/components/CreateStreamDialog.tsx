import { useState } from "react";
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
import { useCreateStream } from "@/hooks/use-streams";
import { toast } from "sonner";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CreateStreamDialog({ open, onOpenChange }: Props) {
    const [name, setName] = useState("");
    const [source, setSource] = useState("");
    const [isEnabled, setIsEnabled] = useState(false);
    const createStream = useCreateStream();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = name.trim();
        const trimmedSource = source.trim();
        if (!trimmedName || !trimmedSource) return;

        createStream.mutate(
            { name: trimmedName, source: trimmedSource, isEnabled },
            {
                onSuccess: () => {
                    toast.success(`Stream "${trimmedName}" created`);
                    setName("");
                    setSource("");
                    setIsEnabled(false);
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
                    <DialogTitle>Create Stream</DialogTitle>
                    <DialogDescription>
                        Add a new stream to the sync system.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="stream-name">Name</Label>
                        <Input
                            id="stream-name"
                            placeholder="my-stream"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            maxLength={100}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="stream-source">Source URL</Label>
                        <Input
                            id="stream-source"
                            placeholder="rtsp://..."
                            value={source}
                            onChange={(e) => setSource(e.target.value)}
                            maxLength={500}
                            required
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label htmlFor="stream-enabled">
                            Enable immediately
                        </Label>
                        <Switch
                            id="stream-enabled"
                            checked={isEnabled}
                            onCheckedChange={setIsEnabled}
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={createStream.isPending}>
                            {createStream.isPending
                                ? "Creating..."
                                : "Create Stream"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

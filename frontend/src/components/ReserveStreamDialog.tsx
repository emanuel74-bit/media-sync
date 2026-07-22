import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

import type { StreamReservation } from "@/types";
import { useReserveStream } from "@/hooks/use-streams";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReserveStreamDialog({ open, onOpenChange }: Props) {
  const [name, setName] = useState("");
  const [reservation, setReservation] = useState<StreamReservation | null>(
    null,
  );
  const [copied, setCopied] = useState(false);
  const reserveStream = useReserveStream();

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setName("");
      setReservation(null);
      setCopied(false);
      reserveStream.reset();
    }
    onOpenChange(nextOpen);
  };

  const reserve = (event: React.FormEvent) => {
    event.preventDefault();
    reserveStream.mutate(name.trim(), {
      onSuccess: setReservation,
      onError: (error) => toast.error(error.message),
    });
  };

  const copyPublishUrl = async () => {
    if (!reservation) return;
    await navigator.clipboard.writeText(reservation.publishUrl);
    setCopied(true);
    toast.success("Publish URL copied");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reserve Ingest Stream</DialogTitle>
          <DialogDescription>
            Place a publish slot on the least-loaded ingest node and receive its
            RTSP publish URL.
          </DialogDescription>
        </DialogHeader>

        {!reservation ? (
          <form onSubmit={reserve} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reservation-name">Stream name</Label>
              <Input
                id="reservation-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                pattern="[A-Za-z0-9_-]+"
                title="Letters, digits, underscores and hyphens only"
                placeholder="live-event-1"
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={reserveStream.isPending || !name.trim()}
              >
                {reserveStream.isPending ? "Reserving..." : "Reserve"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border border-border/50 bg-muted/30 p-3 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Ingest node</p>
                <p className="font-mono-metric text-sm">
                  {reservation.ingestNode}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Publish before</p>
                <p className="text-sm">
                  {new Date(reservation.expiresAt).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  RTSP publish URL
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={reservation.publishUrl}
                    className="font-mono-metric text-xs"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => void copyPublishUrl()}
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              This URL contains the publish secret. Treat it as a credential.
            </p>
            <DialogFooter>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

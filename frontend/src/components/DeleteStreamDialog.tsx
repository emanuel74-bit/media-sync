import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useDeleteStream } from '@/hooks/use-streams';
import { toast } from 'sonner';

interface Props {
  streamName: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function DeleteStreamDialog({ streamName, open, onOpenChange, onDeleted }: Props) {
  const deleteStream = useDeleteStream();

  if (!streamName) return null;

  const handleDelete = () => {
    deleteStream.mutate(streamName, {
      onSuccess: () => {
        toast.success(`Stream "${streamName}" deleted`);
        onOpenChange(false);
        onDeleted?.();
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Stream</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <span className="font-mono-metric font-medium text-foreground">{streamName}</span>? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {deleteStream.isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

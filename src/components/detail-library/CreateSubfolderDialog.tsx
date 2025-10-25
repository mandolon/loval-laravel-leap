import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useCreateDetailLibrarySubfolder } from '@/lib/api/hooks/useDetailLibrary';

interface CreateSubfolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  categoryId: string;
}

export default function CreateSubfolderDialog({
  open,
  onOpenChange,
  workspaceId,
  categoryId,
}: CreateSubfolderDialogProps) {
  const [name, setName] = useState('');
  const createMutation = useCreateDetailLibrarySubfolder();

  const handleCreate = async () => {
    if (!name.trim()) return;

    try {
      await createMutation.mutateAsync({
        workspaceId,
        categoryId,
        name: name.trim(),
      });
      setName('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating subfolder:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Subfolder</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="subfolder-name">Subfolder Name</Label>
            <Input
              id="subfolder-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter subfolder name..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreate();
                }
              }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim() || createMutation.isPending}>
            {createMutation.isPending ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

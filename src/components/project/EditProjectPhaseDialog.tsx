import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit } from "lucide-react";

interface EditProjectPhaseDialogProps {
  phase: string;
  onUpdate: (phase: string) => void;
}

export function EditProjectPhaseDialog({ phase, onUpdate }: EditProjectPhaseDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<'Pre-Design' | 'Design' | 'Permit' | 'Build'>(phase as 'Pre-Design' | 'Design' | 'Permit' | 'Build');

  const handleSave = () => {
    onUpdate(selectedPhase);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Project Phase</DialogTitle>
          <DialogDescription>Update the current phase of the project</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="phase">Phase</Label>
            <Select value={selectedPhase} onValueChange={(value) => setSelectedPhase(value as 'Pre-Design' | 'Design' | 'Permit' | 'Build')}>
              <SelectTrigger id="phase">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pre-Design">Pre-Design</SelectItem>
                <SelectItem value="Design">Design</SelectItem>
                <SelectItem value="Permit">Permit</SelectItem>
                <SelectItem value="Build">Build</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

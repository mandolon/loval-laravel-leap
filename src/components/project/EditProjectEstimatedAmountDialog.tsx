import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Edit } from "lucide-react";

interface EditProjectEstimatedAmountDialogProps {
  estimatedAmount?: number;
  onUpdate: (amount: number | undefined) => void;
}

export function EditProjectEstimatedAmountDialog({ estimatedAmount, onUpdate }: EditProjectEstimatedAmountDialogProps) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(estimatedAmount?.toString() || "");

  const handleSave = () => {
    const parsedAmount = amount ? parseFloat(amount) : undefined;
    onUpdate(parsedAmount);
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
          <DialogTitle>Edit Design Fee</DialogTitle>
          <DialogDescription>Update the estimated design fee for this project</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Design Fee ($)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="45000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
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

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { useCreateInvoice } from '@/lib/api/hooks/useInvoices';

interface InvoiceLineItemInput {
  phase?: 'Pre-Design' | 'Design' | 'Permit' | 'Build';
  description: string;
  amount: number;
}

interface CreateInvoiceDialogProps {
  projectId: string;
}

export const CreateInvoiceDialog = ({ projectId }: CreateInvoiceDialogProps) => {
  const [open, setOpen] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [submittedTo, setSubmittedTo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [processingFeePercent, setProcessingFeePercent] = useState(3.5);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled'>('pending');
  const [lineItems, setLineItems] = useState<InvoiceLineItemInput[]>([
    { description: '', amount: 0 }
  ]);

  const createInvoiceMutation = useCreateInvoice(projectId);

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', amount: 0 }]);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: keyof InvoiceLineItemInput, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const processingFeeAmount = (subtotal * processingFeePercent) / 100;
    const total = subtotal + processingFeeAmount;
    return { subtotal, processingFeeAmount, total };
  };

  const handleSubmit = () => {
    const { subtotal, processingFeeAmount, total } = calculateTotals();
    const submittedToNames = submittedTo.split(',').map(name => name.trim()).filter(Boolean);

    createInvoiceMutation.mutate({
      projectId,
      invoiceNumber,
      submittedToNames,
      invoiceDate,
      dueDate,
      subtotal,
      processingFeePercent,
      processingFeeAmount,
      total,
      status,
      notes: notes || undefined,
      lineItems: lineItems.map((item, index) => ({
        phase: item.phase,
        description: item.description,
        amount: item.amount,
        sortOrder: index,
      })),
    });
    setOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setInvoiceNumber('');
    setSubmittedTo('');
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setDueDate('');
    setProcessingFeePercent(3.5);
    setNotes('');
    setStatus('pending');
    setLineItems([{ description: '', amount: 0 }]);
  };

  const { subtotal, processingFeeAmount, total } = calculateTotals();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
          <DialogDescription>
            Create a new invoice for this project
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoiceNumber">Invoice Number *</Label>
              <Input
                id="invoiceNumber"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="INV-001"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(value: any) => setStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="submittedTo">Submitted To (comma-separated)</Label>
            <Input
              id="submittedTo"
              value={submittedTo}
              onChange={(e) => setSubmittedTo(e.target.value)}
              placeholder="John Doe, Jane Smith"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoiceDate">Invoice Date *</Label>
              <Input
                id="invoiceDate"
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date *</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Line Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            {lineItems.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-3 space-y-2">
                  <Label>Phase</Label>
                  <Select 
                    value={item.phase || ''} 
                    onValueChange={(value) => updateLineItem(index, 'phase', value || undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select phase" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pre-Design">Pre-Design</SelectItem>
                      <SelectItem value="Design">Design</SelectItem>
                      <SelectItem value="Permit">Permit</SelectItem>
                      <SelectItem value="Build">Build</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-6 space-y-2">
                  <Label>Description *</Label>
                  <Input
                    value={item.description}
                    onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                    placeholder="Item description"
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label>Amount *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={item.amount}
                    onChange={(e) => updateLineItem(index, 'amount', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>

                <div className="col-span-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLineItem(index)}
                    disabled={lineItems.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="processingFee">Processing Fee (%)</Label>
            <Input
              id="processingFee"
              type="number"
              step="0.1"
              value={processingFeePercent}
              onChange={(e) => setProcessingFeePercent(parseFloat(e.target.value) || 0)}
            />
          </div>

          <div className="space-y-2 border-t pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Processing Fee ({processingFeePercent}%):</span>
              <span className="font-medium">${processingFeeAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              className="min-h-[100px]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!invoiceNumber || !dueDate || lineItems.some(item => !item.description)}
          >
            Create Invoice
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

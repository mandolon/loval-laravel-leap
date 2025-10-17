import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { useUpdateInvoice } from '@/lib/api/hooks/useInvoices';
import type { Invoice, InvoiceLineItem } from '@/lib/api/types';

interface EditInvoiceDialogProps {
  invoice: (Invoice & { lineItems: InvoiceLineItem[] }) | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

interface LineItemState extends Partial<InvoiceLineItem> {
  _action?: 'add' | 'update' | 'delete';
  _tempId?: string;
}

export const EditInvoiceDialog = ({ invoice, open, onOpenChange, projectId }: EditInvoiceDialogProps) => {
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [submittedTo, setSubmittedTo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [paidDate, setPaidDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [processingFeePercent, setProcessingFeePercent] = useState(3.5);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled'>('pending');
  const [lineItems, setLineItems] = useState<LineItemState[]>([]);

  const updateInvoiceMutation = useUpdateInvoice(projectId);

  useEffect(() => {
    if (invoice) {
      setInvoiceNumber(invoice.invoiceNumber);
      setSubmittedTo(invoice.submittedToNames.join(', '));
      setInvoiceDate(invoice.invoiceDate);
      setDueDate(invoice.dueDate);
      setPaidDate(invoice.paidDate || '');
      setPaymentMethod(invoice.paymentMethod || '');
      setPaymentReference(invoice.paymentReference || '');
      setProcessingFeePercent(invoice.processingFeePercent);
      setNotes(invoice.notes || '');
      setStatus(invoice.status);
      setLineItems(invoice.lineItems.map(item => ({ ...item })));
    }
  }, [invoice]);

  const addLineItem = () => {
    setLineItems([...lineItems, { 
      description: '', 
      amount: 0, 
      _action: 'add',
      _tempId: `temp-${Date.now()}`
    }]);
  };

  const removeLineItem = (index: number) => {
    const item = lineItems[index];
    if (item.id) {
      const updated = [...lineItems];
      updated[index] = { ...item, _action: 'delete' };
      setLineItems(updated);
    } else {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const updateLineItem = (index: number, field: keyof LineItemState, value: any) => {
    const updated = [...lineItems];
    const item = updated[index];
    updated[index] = { 
      ...item, 
      [field]: value,
      _action: item.id && !item._action ? 'update' : item._action
    };
    setLineItems(updated);
  };

  const calculateTotals = () => {
    const visibleItems = lineItems.filter(item => item._action !== 'delete');
    const subtotal = visibleItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const processingFeeAmount = (subtotal * processingFeePercent) / 100;
    const total = subtotal + processingFeeAmount;
    return { subtotal, processingFeeAmount, total };
  };

  const handleSubmit = () => {
    if (!invoice) return;

    const { subtotal, processingFeeAmount, total } = calculateTotals();
    const submittedToNames = submittedTo.split(',').map(name => name.trim()).filter(Boolean);

    const toAdd = lineItems
      .filter(item => item._action === 'add')
      .map((item, index) => ({
        phase: item.phase,
        description: item.description!,
        amount: item.amount!,
        sortOrder: index,
      }));

    const toUpdate = lineItems
      .filter(item => item._action === 'update' && item.id)
      .map(item => ({
        id: item.id!,
        phase: item.phase,
        description: item.description,
        amount: item.amount,
        sortOrder: item.sortOrder,
      }));

    const toDelete = lineItems
      .filter(item => item._action === 'delete' && item.id)
      .map(item => item.id!);

    updateInvoiceMutation.mutate({
      id: invoice.id,
      input: {
        invoiceNumber,
        submittedToNames,
        invoiceDate,
        dueDate,
        paidDate: paidDate || undefined,
        paymentMethod: paymentMethod || undefined,
        paymentReference: paymentReference || undefined,
        paidAmount: status === 'paid' ? total : undefined,
        subtotal,
        processingFeePercent,
        processingFeeAmount,
        total,
        status,
        notes: notes || undefined,
      },
      lineItems: {
        toAdd: toAdd.length > 0 ? toAdd : undefined,
        toUpdate: toUpdate.length > 0 ? toUpdate : undefined,
        toDelete: toDelete.length > 0 ? toDelete : undefined,
      },
    });
    onOpenChange(false);
  };

  if (!invoice) return null;

  const { subtotal, processingFeeAmount, total } = calculateTotals();
  const visibleLineItems = lineItems.filter(item => item._action !== 'delete');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Invoice</DialogTitle>
          <DialogDescription>
            Update invoice details and line items
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

          {status === 'paid' && (
            <div className="grid grid-cols-3 gap-4 border rounded-lg p-4 bg-success/5">
              <div className="space-y-2">
                <Label htmlFor="paidDate">Paid Date</Label>
                <Input
                  id="paidDate"
                  type="date"
                  value={paidDate}
                  onChange={(e) => setPaidDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Input
                  id="paymentMethod"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  placeholder="e.g., Check, Wire Transfer"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentReference">Reference #</Label>
                <Input
                  id="paymentReference"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="e.g., Check #1234"
                />
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Line Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            {visibleLineItems.map((item, index) => (
              <div key={item.id || item._tempId} className="grid grid-cols-12 gap-2 items-end">
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
                    value={item.description || ''}
                    onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label>Amount *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={item.amount || 0}
                    onChange={(e) => updateLineItem(index, 'amount', parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="col-span-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLineItem(index)}
                    disabled={visibleLineItems.length === 1}
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
              className="min-h-[100px]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!invoiceNumber || !dueDate}
          >
            Update Invoice
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

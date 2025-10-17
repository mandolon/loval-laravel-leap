import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download } from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import type { Invoice, InvoiceLineItem } from '@/lib/api/types';
import { format } from 'date-fns';
import { InvoicePDF } from './InvoicePDF';

interface ViewInvoiceDialogProps {
  invoice: (Invoice & { lineItems: InvoiceLineItem[] }) | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: {
    name: string;
    address?: any;
  };
}

export const ViewInvoiceDialog = ({ invoice, open, onOpenChange, project }: ViewInvoiceDialogProps) => {
  if (!invoice) return null;

  const getStatusColor = (status: Invoice['status']) => {
    switch (status) {
      case 'paid':
        return 'bg-success text-success-foreground';
      case 'pending':
        return 'bg-primary text-primary-foreground';
      case 'overdue':
        return 'bg-destructive text-destructive-foreground';
      case 'draft':
        return 'bg-muted text-muted-foreground';
      case 'cancelled':
        return 'bg-secondary text-secondary-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">{invoice.invoiceNumber}</DialogTitle>
              <DialogDescription>
                Invoice Details
              </DialogDescription>
            </div>
            <Badge className={getStatusColor(invoice.status)}>
              {invoice.status}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Submitted To</h3>
              <p className="text-muted-foreground">
                {invoice.submittedToNames.length > 0 ? invoice.submittedToNames.join(', ') : 'No recipient'}
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Dates</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice Date:</span>
                  <span>{format(new Date(invoice.invoiceDate), 'MMM dd, yyyy')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Due Date:</span>
                  <span>{format(new Date(invoice.dueDate), 'MMM dd, yyyy')}</span>
                </div>
                {invoice.paidDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Paid Date:</span>
                    <span>{format(new Date(invoice.paidDate), 'MMM dd, yyyy')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {invoice.status === 'paid' && (
            <div className="border rounded-lg p-4 bg-success/5">
              <h3 className="font-semibold mb-2">Payment Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Payment Method:</span>
                  <p className="font-medium">{invoice.paymentMethod || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Payment Reference:</span>
                  <p className="font-medium">{invoice.paymentReference || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Amount Paid:</span>
                  <p className="font-medium">${(invoice.paidAmount || 0).toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <h3 className="font-semibold mb-3">Line Items</h3>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Phase</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.lineItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {item.phase ? (
                          <Badge variant="outline">{item.phase}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right font-medium">
                        ${item.amount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium">${invoice.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Processing Fee ({invoice.processingFeePercent}%):
              </span>
              <span className="font-medium">${(invoice.processingFeeAmount || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold pt-2 border-t">
              <span>Total:</span>
              <span>${invoice.total.toFixed(2)}</span>
            </div>
          </div>

          {invoice.notes && (
            <div className="border rounded-lg p-4 bg-muted/50">
              <h3 className="font-semibold mb-2">Notes</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <PDFDownloadLink
            document={
              <InvoicePDF 
                invoice={invoice} 
                project={project}
              />
            }
            fileName={`Invoice-${invoice.invoiceNumber}.pdf`}
          >
            {({ loading }) => (
              <Button variant="default" disabled={loading}>
                <Download className="mr-2 h-4 w-4" />
                {loading ? 'Generating...' : 'Download PDF'}
              </Button>
            )}
          </PDFDownloadLink>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

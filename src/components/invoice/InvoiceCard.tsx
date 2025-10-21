import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { FileText, Eye, Edit, Trash2, Download } from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import type { Invoice, InvoiceLineItem } from '@/lib/api/types';
import { format } from 'date-fns';
import { InvoicePDF } from './InvoicePDF';

interface InvoiceCardProps {
  invoice: Invoice & { lineItems: InvoiceLineItem[] };
  onView: (invoice: Invoice & { lineItems: InvoiceLineItem[] }) => void;
  onEdit: (invoice: Invoice & { lineItems: InvoiceLineItem[] }) => void;
  onDelete: (id: string) => void;
  onDownloadPDF: (invoice: Invoice & { lineItems: InvoiceLineItem[] }) => void;
  project: {
    name: string;
    address?: any;
  };
}

export const InvoiceCard = ({ invoice, onView, onEdit, onDelete, onDownloadPDF, project }: InvoiceCardProps) => {
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

  const isOverdue = invoice.status === 'pending' && new Date(invoice.dueDate) < new Date();

  return (
    <Card className="hover:shadow-lg transition-all duration-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{invoice.invoiceNumber}</h3>
            <p className="text-base text-muted-foreground">
              {invoice.submittedToNames.length > 0 ? invoice.submittedToNames.join(', ') : 'No recipient'}
            </p>
          </div>
        </div>
        <Badge className={getStatusColor(isOverdue ? 'overdue' : invoice.status)}>
          {isOverdue ? 'Overdue' : invoice.status}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-base">
            <div>
              <p className="text-muted-foreground">Invoice Date</p>
              <p className="font-medium">{format(new Date(invoice.invoiceDate), 'MMM dd, yyyy')}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Due Date</p>
              <p className="font-medium">{format(new Date(invoice.dueDate), 'MMM dd, yyyy')}</p>
            </div>
          </div>

          <div className="border-t pt-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-base text-muted-foreground">Subtotal</span>
              <span className="text-base font-medium">${invoice.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-base text-muted-foreground">
                Processing Fee ({invoice.processingFeePercent}%)
              </span>
              <span className="text-base font-medium">
                ${(invoice.processingFeeAmount || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center font-bold text-lg">
              <span>Total</span>
              <span>${invoice.total.toFixed(2)}</span>
            </div>
          </div>

          {invoice.lineItems.length > 0 && (
            <div className="border-t pt-3">
              <p className="text-base text-muted-foreground mb-2">{invoice.lineItems.length} line items</p>
            </div>
          )}

          <div className="flex gap-2 pt-3">
            <Button variant="outline" size="sm" onClick={() => onView(invoice)} className="flex-1">
              <Eye className="h-4 w-4 mr-2" />
              View
            </Button>
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
                <Button variant="outline" size="sm" disabled={loading}>
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </PDFDownloadLink>
            <Button variant="outline" size="sm" onClick={() => onEdit(invoice)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => onDelete(invoice.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

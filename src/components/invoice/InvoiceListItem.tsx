import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Eye, Edit, Trash2, Download } from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import type { Invoice, InvoiceLineItem } from '@/lib/api/types';
import { format } from 'date-fns';
import { InvoicePDF } from './InvoicePDF';

interface InvoiceListItemProps {
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

export const InvoiceListItem = ({ invoice, onView, onEdit, onDelete, onDownloadPDF, project }: InvoiceListItemProps) => {
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
    <div className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <FileText className="h-5 w-5 text-primary" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <h3 className="font-semibold">{invoice.invoiceNumber}</h3>
          <Badge className={getStatusColor(isOverdue ? 'overdue' : invoice.status)}>
            {isOverdue ? 'Overdue' : invoice.status}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {invoice.submittedToNames.length > 0 ? invoice.submittedToNames.join(', ') : 'No recipient'}
        </p>
      </div>

      <div className="flex items-center gap-6 text-sm">
        <div>
          <p className="text-muted-foreground">Invoice Date</p>
          <p className="font-medium">{format(new Date(invoice.invoiceDate), 'MMM dd, yyyy')}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Due Date</p>
          <p className="font-medium">{format(new Date(invoice.dueDate), 'MMM dd, yyyy')}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Total</p>
          <p className="font-bold">${invoice.total.toFixed(2)}</p>
        </div>
      </div>

      <div className="flex gap-2 flex-shrink-0">
        <Button variant="outline" size="sm" onClick={() => onView(invoice)}>
          <Eye className="h-4 w-4" />
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
  );
};

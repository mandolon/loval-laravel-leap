import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { Invoice, InvoiceLineItem } from '@/lib/api/types';
import { formatAddressForPDF, formatDateForPDF, formatCurrency, getStatusDisplayText } from '@/lib/utils/pdfHelpers';

interface InvoicePDFProps {
  invoice: Invoice & { lineItems: InvoiceLineItem[] };
  project: {
    name: string;
    address?: any;
  };
  workspaceSettings?: {
    companyName?: string;
    companyLogoUrl?: string;
    taxId?: string;
  };
}

export const InvoicePDF = ({ invoice, project, workspaceSettings }: InvoicePDFProps) => {
  const companyName = workspaceSettings?.companyName || 'Your Company Name';
  const generatedDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>{companyName}</Text>
            {workspaceSettings?.taxId && (
              <Text style={styles.taxId}>Tax ID: {workspaceSettings.taxId}</Text>
            )}
          </View>
          <View style={styles.invoiceHeader}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>#{invoice.invoiceNumber}</Text>
            <Text style={[styles.status, getStatusStyle(invoice.status)]}>
              {getStatusDisplayText(invoice.status)}
            </Text>
          </View>
        </View>

        {/* Metadata Section */}
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.column}>
              <Text style={styles.label}>Invoice Date:</Text>
              <Text style={styles.value}>{formatDateForPDF(invoice.invoiceDate)}</Text>
            </View>
            <View style={styles.column}>
              <Text style={styles.label}>Due Date:</Text>
              <Text style={styles.value}>{formatDateForPDF(invoice.dueDate)}</Text>
            </View>
            {invoice.paidDate && (
              <View style={styles.column}>
                <Text style={styles.label}>Paid Date:</Text>
                <Text style={styles.value}>{formatDateForPDF(invoice.paidDate)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Parties Section */}
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.column}>
              <Text style={styles.sectionTitle}>Submitted To:</Text>
              {invoice.submittedToNames.length > 0 ? (
                invoice.submittedToNames.map((name, index) => (
                  <Text key={index} style={styles.text}>{name}</Text>
                ))
              ) : (
                <Text style={styles.text}>No recipient</Text>
              )}
            </View>
            <View style={styles.column}>
              <Text style={styles.sectionTitle}>Project:</Text>
              <Text style={styles.text}>{project.name}</Text>
              {project.address && (
                <Text style={styles.textSmall}>{formatAddressForPDF(project.address)}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Line Items</Text>
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, styles.tableHeaderText, { width: '20%' }]}>Phase</Text>
              <Text style={[styles.tableCell, styles.tableHeaderText, { width: '60%' }]}>Description</Text>
              <Text style={[styles.tableCell, styles.tableHeaderText, styles.textRight, { width: '20%' }]}>Amount</Text>
            </View>
            {/* Table Body */}
            {invoice.lineItems.map((item, index) => (
              <View key={item.id} style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven]}>
                <Text style={[styles.tableCell, { width: '20%' }]}>
                  {item.phase || '—'}
                </Text>
                <Text style={[styles.tableCell, { width: '60%' }]}>
                  {item.description}
                </Text>
                <Text style={[styles.tableCell, styles.textRight, { width: '20%' }]}>
                  {formatCurrency(item.amount)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Totals Section */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>{formatCurrency(invoice.subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              Processing Fee ({invoice.processingFeePercent}%):
            </Text>
            <Text style={styles.totalValue}>
              {formatCurrency(invoice.processingFeeAmount || 0)}
            </Text>
          </View>
          <View style={[styles.totalRow, styles.totalFinal]}>
            <Text style={styles.totalFinalLabel}>Total:</Text>
            <Text style={styles.totalFinalValue}>{formatCurrency(invoice.total)}</Text>
          </View>
        </View>

        {/* Payment Info (if paid) */}
        {invoice.status === 'paid' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Information</Text>
            <View style={styles.paymentInfo}>
              {invoice.paymentMethod && (
                <View style={styles.paymentRow}>
                  <Text style={styles.label}>Payment Method:</Text>
                  <Text style={styles.value}>{invoice.paymentMethod}</Text>
                </View>
              )}
              {invoice.paymentReference && (
                <View style={styles.paymentRow}>
                  <Text style={styles.label}>Reference:</Text>
                  <Text style={styles.value}>{invoice.paymentReference}</Text>
                </View>
              )}
              {invoice.paidAmount && (
                <View style={styles.paymentRow}>
                  <Text style={styles.label}>Amount Paid:</Text>
                  <Text style={styles.value}>{formatCurrency(invoice.paidAmount)}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Notes Section */}
        {invoice.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Invoice generated on {generatedDate}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

const getStatusStyle = (status: Invoice['status']) => {
  switch (status) {
    case 'paid':
      return { color: '#16a34a' };
    case 'pending':
      return { color: '#2563eb' };
    case 'overdue':
      return { color: '#dc2626' };
    case 'draft':
      return { color: '#6b7280' };
    case 'cancelled':
      return { color: '#78716c' };
    default:
      return { color: '#6b7280' };
  }
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
    color: '#1f2937',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottom: '2px solid #e5e7eb',
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  taxId: {
    fontSize: 10,
    color: '#6b7280',
  },
  invoiceHeader: {
    alignItems: 'flex-end',
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  invoiceNumber: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  status: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  section: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 20,
  },
  column: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#111827',
  },
  label: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 2,
  },
  value: {
    fontSize: 11,
    color: '#1f2937',
  },
  text: {
    fontSize: 11,
    marginBottom: 2,
  },
  textSmall: {
    fontSize: 9,
    color: '#6b7280',
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    padding: 8,
    borderBottom: '2px solid #d1d5db',
  },
  tableHeaderText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottom: '1px solid #e5e7eb',
  },
  tableRowEven: {
    backgroundColor: '#f9fafb',
  },
  tableCell: {
    fontSize: 10,
    paddingRight: 8,
  },
  textRight: {
    textAlign: 'right',
  },
  totalsSection: {
    marginTop: 20,
    marginLeft: 'auto',
    width: '50%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  totalValue: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  totalFinal: {
    marginTop: 8,
    paddingTop: 12,
    borderTop: '2px solid #1f2937',
  },
  totalFinalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  totalFinalValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  paymentInfo: {
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 4,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 10,
    color: '#4b5563',
    lineHeight: 1.5,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTop: '1px solid #e5e7eb',
    paddingTop: 10,
  },
  footerText: {
    fontSize: 9,
    color: '#9ca3af',
    textAlign: 'center',
  },
});

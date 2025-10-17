/**
 * Formats an address object into a single-line string for PDF display
 */
export function formatAddressForPDF(address: any): string {
  if (!address) return '';
  
  const parts: string[] = [];
  
  if (address.street) parts.push(address.street);
  if (address.street2) parts.push(address.street2);
  if (address.city) parts.push(address.city);
  if (address.state) parts.push(address.state);
  if (address.zip) parts.push(address.zip);
  
  return parts.join(', ');
}

/**
 * Returns a user-friendly display text for invoice status
 */
export function getStatusDisplayText(status: string): string {
  const statusMap: Record<string, string> = {
    draft: 'DRAFT',
    pending: 'PENDING',
    paid: 'PAID',
    overdue: 'OVERDUE',
    cancelled: 'CANCELLED',
  };
  
  return statusMap[status] || status.toUpperCase();
}

/**
 * Formats a number as USD currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Formats a date string or Date object for PDF display
 */
export function formatDateForPDF(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

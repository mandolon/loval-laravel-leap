import * as XLSX from 'xlsx';
import { Project } from './api/types';

interface ExcelRow {
  'Project ID': string;
  'Project Name': string;
  'Street Number': string;
  'Street Name': string;
  'City': string;
  'State': string;
  'Zip Code': string;
  'Primary Client First': string;
  'Primary Client Last': string;
  'Primary Client Email': string;
  'Primary Client Phone': string;
  'Secondary Client First': string;
  'Secondary Client Last': string;
  'Secondary Client Email': string;
  'Secondary Client Phone': string;
  'Budget': string;
  'Due Date': string;
  'Phase': string;
  'Status': string;
  'Progress %': string;
}

function formatCurrency(value: number | null | undefined): string {
  if (!value) return '';
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

function transformProjectToRow(project: Project): ExcelRow {
  return {
    'Project ID': project.id || '',
    'Project Name': project.name || '',
    'Street Number': project.address?.streetNumber || '',
    'Street Name': project.address?.streetName || '',
    'City': project.address?.city || '',
    'State': project.address?.state || '',
    'Zip Code': project.address?.zipCode || '',
    'Primary Client First': project.primaryClient?.firstName || '',
    'Primary Client Last': project.primaryClient?.lastName || '',
    'Primary Client Email': project.primaryClient?.email || '',
    'Primary Client Phone': project.primaryClient?.phone || '',
    'Secondary Client First': project.secondaryClient?.firstName || '',
    'Secondary Client Last': project.secondaryClient?.lastName || '',
    'Secondary Client Email': project.secondaryClient?.email || '',
    'Secondary Client Phone': project.secondaryClient?.phone || '',
    'Budget': formatCurrency(project.estimatedAmount),
    'Due Date': formatDate(project.dueDate),
    'Phase': project.phase || '',
    'Status': project.status || '',
    'Progress %': project.progress !== null && project.progress !== undefined ? String(project.progress) : '',
  };
}

export function exportProjectsToExcel(projects: Project[]): void {
  if (projects.length === 0) {
    throw new Error('No projects to export');
  }

  // Transform projects to Excel rows
  const rows = projects.map(transformProjectToRow);

  // Create workbook and worksheet
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Projects');

  // Auto-fit columns
  const maxWidths: { [key: string]: number } = {};
  rows.forEach(row => {
    Object.keys(row).forEach(key => {
      const value = String(row[key as keyof ExcelRow] || '');
      const currentMax = maxWidths[key] || key.length;
      maxWidths[key] = Math.max(currentMax, value.length);
    });
  });

  worksheet['!cols'] = Object.keys(rows[0]).map(key => ({
    wch: Math.min(maxWidths[key] + 2, 50) // Cap at 50 characters
  }));

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `projects_export_${timestamp}.xlsx`;

  // Trigger download
  XLSX.writeFile(workbook, filename);
}

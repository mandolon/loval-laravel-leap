import * as XLSX from 'xlsx';
import { Project } from './api/types';

// Helper function to sanitize sheet names for Excel compatibility
function sanitizeSheetName(name: string): string {
  // Replace invalid characters with dashes
  let sanitized = name.replace(/[\/\\?*\[\]]/g, '-');
  
  // Truncate to 31 characters (Excel limit)
  if (sanitized.length > 31) {
    sanitized = sanitized.substring(0, 31);
  }
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // If empty after sanitization, use default
  return sanitized || 'Project';
}

// Helper function to get status emoji
function getStatusEmoji(status: string | null | undefined): string {
  switch (status) {
    case 'pending': return '🟡';
    case 'active': return '🟢';
    case 'completed': return '✅';
    case 'archived': return '⚫';
    default: return '⚪';
  }
}

// Helper function to get phase emoji
function getPhaseEmoji(phase: string | null | undefined): string {
  switch (phase) {
    case 'Pre-Design': return '🎨';
    case 'Design': return '✏️';
    case 'Permit': return '📋';
    case 'Build': return '🏗️';
    default: return '📁';
  }
}

// Helper function to format currency
function formatCurrency(value: number | null | undefined): string {
  if (!value) return '';
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Helper function to format date
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

// Create summary sheet with project overview and statistics
function createSummarySheet(workbook: XLSX.WorkBook, projects: Project[]): void {
  const ws: XLSX.WorkSheet = {};
  
  // Title section
  ws['A1'] = { v: 'PROJECT EXPORT SUMMARY', t: 's' };
  ws['A2'] = { v: `Generated: ${new Date().toLocaleString()}`, t: 's' };
  ws['A3'] = { v: `Total Projects: ${projects.length}`, t: 's' };
  
  // Project list header
  ws['A5'] = { v: 'PROJECT LIST:', t: 's' };
  ws['A6'] = { v: 'Project Name', t: 's' };
  ws['B6'] = { v: 'Status', t: 's' };
  ws['C6'] = { v: 'Phase', t: 's' };
  ws['D6'] = { v: 'Progress', t: 's' };
  ws['E6'] = { v: 'Budget', t: 's' };
  
  // Sort projects alphabetically
  const sortedProjects = [...projects].sort((a, b) => 
    (a.name || '').localeCompare(b.name || '')
  );
  
  // Add project rows
  sortedProjects.forEach((project, index) => {
    const row = 7 + index;
    ws[`A${row}`] = { v: project.name || '', t: 's' };
    ws[`B${row}`] = { v: `${getStatusEmoji(project.status)} ${project.status || ''}`, t: 's' };
    ws[`C${row}`] = { v: `${getPhaseEmoji(project.phase)} ${project.phase || ''}`, t: 's' };
    ws[`D${row}`] = { v: project.progress !== null && project.progress !== undefined ? `${project.progress}%` : '', t: 's' };
    ws[`E${row}`] = { v: formatCurrency(project.estimatedAmount), t: 's' };
  });
  
  // Calculate statistics
  const statusCounts = projects.reduce((acc, p) => {
    const status = p.status || 'unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const phaseCounts = projects.reduce((acc, p) => {
    const phase = p.phase || 'unknown';
    acc[phase] = (acc[phase] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const totalBudget = projects.reduce((sum, p) => sum + (p.estimatedAmount || 0), 0);
  
  // Statistics section
  const statsRow = 7 + projects.length + 2;
  ws[`A${statsRow}`] = { v: 'STATISTICS:', t: 's' };
  ws[`A${statsRow + 1}`] = { v: 'Total Budget:', t: 's' };
  ws[`B${statsRow + 1}`] = { v: formatCurrency(totalBudget), t: 's' };
  
  let statRow = statsRow + 2;
  ws[`A${statRow}`] = { v: 'Status Breakdown:', t: 's' };
  statRow++;
  Object.entries(statusCounts).forEach(([status, count]) => {
    ws[`A${statRow}`] = { v: `  ${getStatusEmoji(status)} ${status}:`, t: 's' };
    ws[`B${statRow}`] = { v: count, t: 'n' };
    statRow++;
  });
  
  statRow++;
  ws[`A${statRow}`] = { v: 'Phase Breakdown:', t: 's' };
  statRow++;
  Object.entries(phaseCounts).forEach(([phase, count]) => {
    ws[`A${statRow}`] = { v: `  ${getPhaseEmoji(phase)} ${phase}:`, t: 's' };
    ws[`B${statRow}`] = { v: count, t: 'n' };
    statRow++;
  });
  
  // Set column widths
  ws['!cols'] = [
    { wch: 40 }, // A
    { wch: 20 }, // B
    { wch: 20 }, // C
    { wch: 15 }, // D
    { wch: 20 }, // E
  ];
  
  // Set range
  const lastRow = statRow;
  ws['!ref'] = `A1:E${lastRow}`;
  
  // Add sheet to workbook
  XLSX.utils.book_append_sheet(workbook, ws, 'Summary');
}

// Create individual project sheet with key-value layout
function createProjectSheet(workbook: XLSX.WorkBook, project: Project, usedNames: Set<string>): void {
  const ws: XLSX.WorkSheet = {};
  
  // Generate unique sheet name
  let baseName = sanitizeSheetName(project.name || 'Untitled Project');
  let sheetName = baseName;
  let counter = 2;
  
  while (usedNames.has(sheetName)) {
    const suffix = ` (${counter})`;
    const maxLength = 31 - suffix.length;
    sheetName = baseName.substring(0, maxLength) + suffix;
    counter++;
  }
  usedNames.add(sheetName);
  
  let row = 1;
  
  // Project header
  ws[`A${row}`] = { v: `PROJECT: ${project.name || 'Untitled'}`, t: 's' };
  row += 2;
  
  // Project Metadata section
  ws[`A${row}`] = { v: 'PROJECT METADATA', t: 's' };
  row++;
  ws[`A${row}`] = { v: 'Project ID:', t: 's' };
  ws[`B${row}`] = { v: project.id || '', t: 's' };
  row++;
  ws[`A${row}`] = { v: 'Project Name:', t: 's' };
  ws[`B${row}`] = { v: project.name || '', t: 's' };
  row++;
  ws[`A${row}`] = { v: 'Status:', t: 's' };
  ws[`B${row}`] = { v: `${getStatusEmoji(project.status)} ${project.status || ''}`, t: 's' };
  row++;
  ws[`A${row}`] = { v: 'Phase:', t: 's' };
  ws[`B${row}`] = { v: `${getPhaseEmoji(project.phase)} ${project.phase || ''}`, t: 's' };
  row++;
  ws[`A${row}`] = { v: 'Progress:', t: 's' };
  ws[`B${row}`] = { v: project.progress !== null && project.progress !== undefined ? `${project.progress}%` : '', t: 's' };
  row++;
  ws[`A${row}`] = { v: 'Budget:', t: 's' };
  ws[`B${row}`] = { v: formatCurrency(project.estimatedAmount), t: 's' };
  row++;
  ws[`A${row}`] = { v: 'Due Date:', t: 's' };
  ws[`B${row}`] = { v: formatDate(project.dueDate), t: 's' };
  row += 2;
  
  // Location section
  ws[`A${row}`] = { v: 'LOCATION', t: 's' };
  row++;
  ws[`A${row}`] = { v: 'Street Number:', t: 's' };
  ws[`B${row}`] = { v: project.address?.streetNumber || '', t: 's' };
  row++;
  ws[`A${row}`] = { v: 'Street Name:', t: 's' };
  ws[`B${row}`] = { v: project.address?.streetName || '', t: 's' };
  row++;
  ws[`A${row}`] = { v: 'City:', t: 's' };
  ws[`B${row}`] = { v: project.address?.city || '', t: 's' };
  row++;
  ws[`A${row}`] = { v: 'State:', t: 's' };
  ws[`B${row}`] = { v: project.address?.state || '', t: 's' };
  row++;
  ws[`A${row}`] = { v: 'Zip Code:', t: 's' };
  ws[`B${row}`] = { v: project.address?.zipCode || '', t: 's' };
  row += 2;
  
  // Primary Client section
  ws[`A${row}`] = { v: 'PRIMARY CLIENT', t: 's' };
  row++;
  ws[`A${row}`] = { v: 'First Name:', t: 's' };
  ws[`B${row}`] = { v: project.primaryClient?.firstName || '', t: 's' };
  row++;
  ws[`A${row}`] = { v: 'Last Name:', t: 's' };
  ws[`B${row}`] = { v: project.primaryClient?.lastName || '', t: 's' };
  row++;
  ws[`A${row}`] = { v: 'Email:', t: 's' };
  ws[`B${row}`] = { v: project.primaryClient?.email || '', t: 's' };
  row++;
  ws[`A${row}`] = { v: 'Phone:', t: 's' };
  ws[`B${row}`] = { v: project.primaryClient?.phone || '', t: 's' };
  row += 2;
  
  // Secondary Client section
  ws[`A${row}`] = { v: 'SECONDARY CLIENT', t: 's' };
  row++;
  ws[`A${row}`] = { v: 'First Name:', t: 's' };
  ws[`B${row}`] = { v: project.secondaryClient?.firstName || '', t: 's' };
  row++;
  ws[`A${row}`] = { v: 'Last Name:', t: 's' };
  ws[`B${row}`] = { v: project.secondaryClient?.lastName || '', t: 's' };
  row++;
  ws[`A${row}`] = { v: 'Email:', t: 's' };
  ws[`B${row}`] = { v: project.secondaryClient?.email || '', t: 's' };
  row++;
  ws[`A${row}`] = { v: 'Phone:', t: 's' };
  ws[`B${row}`] = { v: project.secondaryClient?.phone || '', t: 's' };
  row += 2;
  
  // Metadata section
  ws[`A${row}`] = { v: 'METADATA', t: 's' };
  row++;
  ws[`A${row}`] = { v: 'Created:', t: 's' };
  ws[`B${row}`] = { v: formatDate(project.createdAt), t: 's' };
  row++;
  ws[`A${row}`] = { v: 'Updated:', t: 's' };
  ws[`B${row}`] = { v: formatDate(project.updatedAt), t: 's' };
  row++;
  ws[`A${row}`] = { v: 'Project ID (for import):', t: 's' };
  ws[`B${row}`] = { v: project.id || '', t: 's' };
  
  // Set column widths
  ws['!cols'] = [
    { wch: 25 }, // A - Labels
    { wch: 50 }, // B - Values
  ];
  
  // Set range
  ws['!ref'] = `A1:B${row}`;
  
  // Add sheet to workbook
  XLSX.utils.book_append_sheet(workbook, ws, sheetName);
}

export function exportProjectsToExcel(projects: Project[]): void {
  if (projects.length === 0) {
    throw new Error('No projects to export');
  }

  // Create workbook
  const workbook = XLSX.utils.book_new();
  
  // Create summary sheet first
  createSummarySheet(workbook, projects);
  
  // Sort projects alphabetically for consistent sheet order
  const sortedProjects = [...projects].sort((a, b) => 
    (a.name || '').localeCompare(b.name || '')
  );
  
  // Create individual project sheets
  const usedNames = new Set<string>();
  sortedProjects.forEach(project => {
    createProjectSheet(workbook, project, usedNames);
  });

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `projects_export_${timestamp}.xlsx`;

  // Trigger download
  XLSX.writeFile(workbook, filename);
}

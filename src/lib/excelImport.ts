import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';

export interface ImportRow {
  rowNumber: number;
  projectId?: string;
  name: string;
  address: {
    streetNumber: string;
    streetName: string;
    city: string;
    state: string;
    zipCode: string;
  };
  primaryClient?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
  secondaryClient?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
  estimatedAmount?: number;
  dueDate?: string;
  phase?: string;
  status?: string;
  progress?: number;
}

export interface ValidationError {
  rowNumber: number;
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: ImportRow[];
  errors: ValidationError[];
}

export interface ImportResult {
  created: number;
  updated: number;
  failed: number;
  errors: Array<{ rowNumber: number; message: string }>;
}

const REQUIRED_COLUMNS = [
  'Project Name',
  'Street Number',
  'Street Name',
  'City',
  'State',
  'Zip Code'
];

const VALID_PHASES = ['Pre-Design', 'Design', 'Permit', 'Build'];
const VALID_STATUSES = ['pending', 'active', 'completed', 'archived'];

function validateEmail(email: string): boolean {
  if (!email) return true; // Optional field
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function parseNumericValue(value: any): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = typeof value === 'string' ? parseFloat(value.replace(/[$,]/g, '')) : Number(value);
  return isNaN(parsed) ? undefined : parsed;
}

function parseDateValue(value: any): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (isNaN(date.getTime())) return undefined;
  return date.toISOString().split('T')[0];
}

// Detect file format (single-sheet vs multi-sheet)
function detectFileFormat(workbook: XLSX.WorkBook): 'single' | 'multi' {
  if (workbook.SheetNames.includes('Summary')) {
    return 'multi';
  } else if (workbook.SheetNames.includes('Projects')) {
    return 'single';
  }
  throw new Error('Unrecognized file format. Expected "Projects" sheet or "Summary" sheet.');
}

// Find the value of a field in a key-value sheet layout
function findFieldValue(sheet: XLSX.WorkSheet, labelText: string): string {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  
  for (let row = range.s.r; row <= range.e.r; row++) {
    const labelAddress = XLSX.utils.encode_cell({ r: row, c: 0 }); // Column A
    const cell = sheet[labelAddress];
    
    if (cell?.v && String(cell.v).includes(labelText)) {
      // Found label, get value from column B
      const valueAddress = XLSX.utils.encode_cell({ r: row, c: 1 });
      const valueCell = sheet[valueAddress];
      return valueCell?.v ? String(valueCell.v) : '';
    }
  }
  return '';
}

// Extract project data from a key-value sheet layout
function extractProjectFromSheet(sheet: XLSX.WorkSheet, sheetName: string, rowNumber: number): ImportRow {
  // Helper to parse numeric values from sheet
  const parseNumeric = (value: string): number | undefined => {
    if (!value) return undefined;
    // Remove currency symbols, commas, and percentage signs
    const cleaned = value.replace(/[$,%]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? undefined : num;
  };
  
  // Helper to parse dates from sheet
  const parseDate = (value: string): string | undefined => {
    if (!value) return undefined;
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date.toISOString().split('T')[0];
  };
  
  // Helper to strip emoji prefix from status/phase
  const stripEmoji = (value: string): string => {
    if (!value) return '';
    return value.replace(/^[\u{1F000}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]\s*/u, '').trim();
  };
  
  // Find section row numbers to distinguish PRIMARY vs SECONDARY clients
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  let primaryClientRow = -1;
  let secondaryClientRow = -1;
  
  for (let row = range.s.r; row <= range.e.r; row++) {
    const cellAddress = XLSX.utils.encode_cell({ r: row, c: 0 });
    const cell = sheet[cellAddress];
    if (cell?.v) {
      const text = String(cell.v);
      if (text === 'PRIMARY CLIENT') primaryClientRow = row;
      if (text === 'SECONDARY CLIENT') secondaryClientRow = row;
    }
  }
  
  // Parse fields with section context for client data
  const findFieldInRange = (label: string, startRow: number, endRow: number): string => {
    for (let row = startRow; row <= endRow; row++) {
      const labelAddress = XLSX.utils.encode_cell({ r: row, c: 0 });
      const cell = sheet[labelAddress];
      
      if (cell?.v && String(cell.v) === label) {
        const valueAddress = XLSX.utils.encode_cell({ r: row, c: 1 });
        const valueCell = sheet[valueAddress];
        return valueCell?.v ? String(valueCell.v) : '';
      }
    }
    return '';
  };
  
  return {
    rowNumber,
    projectId: findFieldValue(sheet, 'Project ID:') || findFieldValue(sheet, 'Project ID (for import):') || undefined,
    name: findFieldValue(sheet, 'Project Name:'),
    address: {
      streetNumber: findFieldValue(sheet, 'Street Number:'),
      streetName: findFieldValue(sheet, 'Street Name:'),
      city: findFieldValue(sheet, 'City:'),
      state: findFieldValue(sheet, 'State:'),
      zipCode: findFieldValue(sheet, 'Zip Code:'),
    },
    primaryClient: primaryClientRow >= 0 ? {
      firstName: findFieldInRange('First Name:', primaryClientRow, secondaryClientRow > 0 ? secondaryClientRow : range.e.r) || undefined,
      lastName: findFieldInRange('Last Name:', primaryClientRow, secondaryClientRow > 0 ? secondaryClientRow : range.e.r) || undefined,
      email: findFieldInRange('Email:', primaryClientRow, secondaryClientRow > 0 ? secondaryClientRow : range.e.r) || undefined,
      phone: findFieldInRange('Phone:', primaryClientRow, secondaryClientRow > 0 ? secondaryClientRow : range.e.r) || undefined,
    } : undefined,
    secondaryClient: secondaryClientRow >= 0 ? {
      firstName: findFieldInRange('First Name:', secondaryClientRow, range.e.r) || undefined,
      lastName: findFieldInRange('Last Name:', secondaryClientRow, range.e.r) || undefined,
      email: findFieldInRange('Email:', secondaryClientRow, range.e.r) || undefined,
      phone: findFieldInRange('Phone:', secondaryClientRow, range.e.r) || undefined,
    } : undefined,
    estimatedAmount: parseNumeric(findFieldValue(sheet, 'Budget:')),
    dueDate: parseDate(findFieldValue(sheet, 'Due Date:')),
    phase: stripEmoji(findFieldValue(sheet, 'Phase:')) || undefined,
    status: stripEmoji(findFieldValue(sheet, 'Status:')) || undefined,
    progress: parseNumeric(findFieldValue(sheet, 'Progress:')),
  };
}

// Parse multi-sheet format (one sheet per project)
function parseMultiSheetFormat(workbook: XLSX.WorkBook): ImportRow[] {
  const rows: ImportRow[] = [];
  let rowNumber = 0;
  
  for (const sheetName of workbook.SheetNames) {
    if (sheetName === 'Summary') continue; // Skip summary sheet
    
    const sheet = workbook.Sheets[sheetName];
    const projectData = extractProjectFromSheet(sheet, sheetName, ++rowNumber);
    rows.push(projectData);
  }
  
  return rows;
}

// Parse single-sheet format (legacy, all projects in "Projects" sheet)
function parseSingleSheetFormat(workbook: XLSX.WorkBook): ImportRow[] {
  const worksheet = workbook.Sheets['Projects'];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  if (jsonData.length === 0) {
    throw new Error('File contains no data');
  }

  // Parse rows
  const rows: ImportRow[] = jsonData.map((row: any, index: number) => ({
    rowNumber: index + 2, // +2 because Excel is 1-indexed and has header row
    projectId: row['Project ID'] || undefined,
    name: row['Project Name'] || '',
    address: {
      streetNumber: row['Street Number'] || '',
      streetName: row['Street Name'] || '',
      city: row['City'] || '',
      state: row['State'] || '',
      zipCode: row['Zip Code'] || '',
    },
    primaryClient: {
      firstName: row['Primary Client First'] || undefined,
      lastName: row['Primary Client Last'] || undefined,
      email: row['Primary Client Email'] || undefined,
      phone: row['Primary Client Phone'] || undefined,
    },
    secondaryClient: {
      firstName: row['Secondary Client First'] || undefined,
      lastName: row['Secondary Client Last'] || undefined,
      email: row['Secondary Client Email'] || undefined,
      phone: row['Secondary Client Phone'] || undefined,
    },
    estimatedAmount: parseNumericValue(row['Budget']),
    dueDate: parseDateValue(row['Due Date']),
    phase: row['Phase'] || undefined,
    status: row['Status'] || undefined,
    progress: parseNumericValue(row['Progress %']),
  }));

  return rows;
}

export async function parseExcelFile(file: File): Promise<ImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Detect format and parse accordingly
        const format = detectFileFormat(workbook);
        
        if (format === 'single') {
          resolve(parseSingleSheetFormat(workbook));
        } else {
          resolve(parseMultiSheetFormat(workbook));
        }
      } catch (error: any) {
        reject(new Error(error.message || 'Failed to parse Excel file'));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

export function validateImportRows(rows: ImportRow[]): ValidationResult {
  const errors: ValidationError[] = [];
  const valid: ImportRow[] = [];

  rows.forEach(row => {
    let hasError = false;

    // Required fields
    if (!row.name || row.name.trim() === '') {
      errors.push({ rowNumber: row.rowNumber, field: 'Project Name', message: 'Project Name is required' });
      hasError = true;
    }

    if (!row.address.streetNumber || row.address.streetNumber.trim() === '') {
      errors.push({ rowNumber: row.rowNumber, field: 'Street Number', message: 'Street Number is required' });
      hasError = true;
    }

    if (!row.address.streetName || row.address.streetName.trim() === '') {
      errors.push({ rowNumber: row.rowNumber, field: 'Street Name', message: 'Street Name is required' });
      hasError = true;
    }

    if (!row.address.city || row.address.city.trim() === '') {
      errors.push({ rowNumber: row.rowNumber, field: 'City', message: 'City is required' });
      hasError = true;
    }

    if (!row.address.state || row.address.state.trim() === '') {
      errors.push({ rowNumber: row.rowNumber, field: 'State', message: 'State is required' });
      hasError = true;
    }

    if (!row.address.zipCode || row.address.zipCode.trim() === '') {
      errors.push({ rowNumber: row.rowNumber, field: 'Zip Code', message: 'Zip Code is required' });
      hasError = true;
    }

    // Email validation
    if (row.primaryClient?.email && !validateEmail(row.primaryClient.email)) {
      errors.push({ rowNumber: row.rowNumber, field: 'Primary Client Email', message: 'Invalid email format' });
      hasError = true;
    }

    if (row.secondaryClient?.email && !validateEmail(row.secondaryClient.email)) {
      errors.push({ rowNumber: row.rowNumber, field: 'Secondary Client Email', message: 'Invalid email format' });
      hasError = true;
    }

    // Enum validation
    if (row.phase && !VALID_PHASES.includes(row.phase)) {
      errors.push({ rowNumber: row.rowNumber, field: 'Phase', message: `Invalid phase. Must be one of: ${VALID_PHASES.join(', ')}` });
      hasError = true;
    }

    if (row.status && !VALID_STATUSES.includes(row.status)) {
      errors.push({ rowNumber: row.rowNumber, field: 'Status', message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
      hasError = true;
    }

    // Progress validation
    if (row.progress !== undefined && (row.progress < 0 || row.progress > 100)) {
      errors.push({ rowNumber: row.rowNumber, field: 'Progress %', message: 'Progress must be between 0 and 100' });
      hasError = true;
    }

    if (!hasError) {
      valid.push(row);
    }
  });

  return { valid, errors };
}

export async function importProjects(
  rows: ImportRow[],
  workspaceId: string,
  userId: string
): Promise<ImportResult> {
  const result: ImportResult = {
    created: 0,
    updated: 0,
    failed: 0,
    errors: []
  };

  // Process in batches of 50
  const BATCH_SIZE = 50;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    for (const row of batch) {
      try {
        const projectData = {
          name: row.name,
          workspace_id: workspaceId,
          address: row.address,
          primary_client_first_name: row.primaryClient?.firstName || null,
          primary_client_last_name: row.primaryClient?.lastName || null,
          primary_client_email: row.primaryClient?.email || null,
          primary_client_phone: row.primaryClient?.phone || null,
          secondary_client_first_name: row.secondaryClient?.firstName || null,
          secondary_client_last_name: row.secondaryClient?.lastName || null,
          secondary_client_email: row.secondaryClient?.email || null,
          secondary_client_phone: row.secondaryClient?.phone || null,
          estimated_amount: row.estimatedAmount || null,
          due_date: row.dueDate || null,
          phase: row.phase || 'Pre-Design',
          status: row.status || 'pending',
          progress: row.progress || 0,
        };

        if (row.projectId) {
          // UPDATE existing project
          const { error } = await supabase
            .from('projects')
            .update({
              ...projectData,
              updated_by: userId,
              updated_at: new Date().toISOString()
            })
            .eq('id', row.projectId)
            .eq('workspace_id', workspaceId);

          if (error) throw error;
          result.updated++;
        } else {
          // CREATE new project
          const { error } = await supabase
            .from('projects')
            .insert({
              ...projectData,
              created_by: userId
            });

          if (error) throw error;
          result.created++;
        }
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          rowNumber: row.rowNumber,
          message: error.message || 'Unknown error occurred'
        });
      }
    }
  }

  // Log activity
  try {
    await supabase.from('activity_log').insert({
      workspace_id: workspaceId,
      user_id: userId,
      action: 'imported',
      resource_type: 'projects',
      change_summary: `Imported ${result.created} new, updated ${result.updated} existing projects`,
      new_value: { created: result.created, updated: result.updated, failed: result.failed }
    });
  } catch (error) {
    console.error('Failed to log import activity:', error);
  }

  return result;
}

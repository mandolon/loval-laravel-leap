import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';
import { useProjects } from '@/lib/api/hooks/useProjects';
import { exportProjectsToExcel } from '@/lib/excelExport';
import { parseExcelFile, validateImportRows, importProjects, ImportRow, ValidationResult, ImportResult } from '@/lib/excelImport';
import { Download, Upload, AlertCircle, CheckCircle, XCircle, FileDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';

interface ExcelExportImportProps {
  workspaceId: string;
}

export function ExcelExportImport({ workspaceId }: ExcelExportImportProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const { data: projects } = useProjects(workspaceId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult | null>(null);
  const [importResults, setImportResults] = useState<ImportResult | null>(null);

  const handleExport = async () => {
    if (!projects || projects.length === 0) {
      toast({
        title: 'No Projects',
        description: 'There are no projects to export in this workspace.',
        variant: 'destructive'
      });
      return;
    }

    setIsExporting(true);
    try {
      exportProjectsToExcel(projects);

      // Log activity
      if (user?.id) {
        await supabase.from('activity_log').insert({
          workspace_id: workspaceId,
          user_id: user.id,
          action: 'exported',
          resource_type: 'projects',
          change_summary: `Exported ${projects.length} projects to Excel`
        });
      }

      toast({
        title: 'Export Successful',
        description: `Exported ${projects.length} projects to Excel file.`
      });
    } catch (error: any) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: error.message || 'Failed to export projects',
        variant: 'destructive'
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be selected again
    event.target.value = '';

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please upload a file smaller than 10MB',
        variant: 'destructive'
      });
      return;
    }

    // Validate file type
    if (!file.name.endsWith('.xlsx')) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload an .xlsx file',
        variant: 'destructive'
      });
      return;
    }

    setIsImporting(true);
    try {
      const rows = await parseExcelFile(file);
      const validation = validateImportRows(rows);

      setImportData(rows);
      setValidationResults(validation);
      setShowPreviewModal(true);
    } catch (error: any) {
      console.error('Parse error:', error);
      toast({
        title: 'Parse Failed',
        description: error.message || 'Failed to parse Excel file',
        variant: 'destructive'
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!validationResults || !user?.id) return;

    setShowPreviewModal(false);
    setIsImporting(true);

    try {
      const results = await importProjects(validationResults.valid, workspaceId, user.id);
      setImportResults(results);
      setShowResultsModal(true);

      if (results.created > 0 || results.updated > 0) {
        toast({
          title: 'Import Successful',
          description: `Created ${results.created}, updated ${results.updated} projects`
        });
      }
    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: 'Import Failed',
        description: error.message || 'Failed to import projects',
        variant: 'destructive'
      });
    } finally {
      setIsImporting(false);
    }
  };

  const downloadErrorReport = () => {
    if (!importResults) return;

    const errorRows = importResults.errors.map(err => ({
      'Row Number': err.rowNumber,
      'Error': err.message
    }));

    const worksheet = XLSX.utils.json_to_sheet(errorRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Errors');

    const timestamp = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `import_errors_${timestamp}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Project Data Management</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Export all projects to Excel for backup or analysis. Import to bulk create or update projects.
        </p>
      </div>

      <div className="flex gap-3">
        <Button
          onClick={handleExport}
          disabled={isExporting || !projects || projects.length === 0}
          variant="outline"
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          {isExporting ? 'Exporting...' : 'Export All Projects'}
        </Button>

        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={isImporting}
          variant="outline"
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          {isImporting ? 'Processing...' : 'Import Projects'}
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Preview</DialogTitle>
            <DialogDescription>
              Review the import summary before proceeding
            </DialogDescription>
          </DialogHeader>

          {validationResults && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <div>
                    <p className="text-sm font-medium">Valid Rows</p>
                    <p className="text-2xl font-bold">{validationResults.valid.length}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <Upload className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Creates</p>
                    <p className="text-2xl font-bold">
                      {validationResults.valid.filter(r => !r.projectId).length}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Updates</p>
                    <p className="text-2xl font-bold">
                      {validationResults.valid.filter(r => r.projectId).length}
                    </p>
                  </div>
                </div>
              </div>

              {validationResults.errors.length > 0 && (
                <div className="border border-destructive/20 rounded-lg p-4 bg-destructive/5">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    <h4 className="font-semibold text-destructive">
                      {validationResults.errors.length} Validation Errors
                    </h4>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {validationResults.errors.slice(0, 10).map((err, idx) => (
                      <div key={idx} className="text-sm">
                        <span className="font-medium">Row {err.rowNumber}:</span>{' '}
                        <span className="text-muted-foreground">{err.field}</span> - {err.message}
                      </div>
                    ))}
                    {validationResults.errors.length > 10 && (
                      <p className="text-sm text-muted-foreground italic">
                        ...and {validationResults.errors.length - 10} more errors
                      </p>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-3">
                    Rows with errors will be skipped during import.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmImport}
              disabled={!validationResults || validationResults.valid.length === 0}
            >
              Confirm Import ({validationResults?.valid.length || 0} rows)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Results Modal */}
      <Dialog open={showResultsModal} onOpenChange={setShowResultsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Results</DialogTitle>
            <DialogDescription>
              Import completed with the following results
            </DialogDescription>
          </DialogHeader>

          {importResults && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <div>
                    <p className="text-sm font-medium">Created</p>
                    <p className="text-2xl font-bold">{importResults.created}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Updated</p>
                    <p className="text-2xl font-bold">{importResults.updated}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <XCircle className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="text-sm font-medium">Failed</p>
                    <p className="text-2xl font-bold">{importResults.failed}</p>
                  </div>
                </div>
              </div>

              {importResults.failed > 0 && (
                <div className="border border-destructive/20 rounded-lg p-4 bg-destructive/5">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    <h4 className="font-semibold text-destructive">Failed Imports</h4>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                    {importResults.errors.slice(0, 5).map((err, idx) => (
                      <div key={idx} className="text-sm">
                        <span className="font-medium">Row {err.rowNumber}:</span> {err.message}
                      </div>
                    ))}
                    {importResults.errors.length > 5 && (
                      <p className="text-sm text-muted-foreground italic">
                        ...and {importResults.errors.length - 5} more errors
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadErrorReport}
                    className="gap-2"
                  >
                    <FileDown className="h-4 w-4" />
                    Download Error Report
                  </Button>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowResultsModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

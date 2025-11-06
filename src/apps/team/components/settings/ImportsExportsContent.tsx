import { useParams } from 'react-router-dom';
import { SETTINGS_CONSTANTS } from '../../lib/settings-constants';
import { ExcelExportImport } from '@/components/workspace/ExcelExportImport';

export function ImportsExportsContent() {
  const { workspaceId } = useParams();
  return (
    <div className="p-4 md:p-6 text-[var(--muted)]" data-testid="imports-exports-content">
      <h1 className="text-[var(--text)] text-xl font-medium mb-4">Imports / Exports</h1>
      
      <div 
        className="grid gap-8" 
        style={{ gridTemplateColumns: SETTINGS_CONSTANTS.CONTENT_COLS }}
        data-testid="imports-2col"
      >
        <div>
          <h2 className="text-[var(--text)] text-base font-medium mb-1">Project Data Management</h2>
          <p className="text-sm">
            Export all projects to Excel for backup or analysis. Import to bulk create or update projects.
          </p>
        </div>

        <div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            {workspaceId && <ExcelExportImport workspaceId={workspaceId} />}
          </div>
        </div>
      </div>
    </div>
  );
}

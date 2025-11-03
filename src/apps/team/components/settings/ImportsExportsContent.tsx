import { Download, Upload } from 'lucide-react';
import { SETTINGS_CONSTANTS } from '../../lib/settings-constants';

export function ImportsExportsContent() {
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
          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <button 
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm hover:bg-slate-50"
                data-testid="btn-export-all"
              >
                <Download className="h-4 w-4 text-[var(--muted)]" />
                Export All Projects
              </button>
              
              <button 
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm hover:bg-slate-50"
                data-testid="btn-import-projects"
              >
                <Upload className="h-4 w-4 text-[var(--muted)]" />
                Import Projects
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

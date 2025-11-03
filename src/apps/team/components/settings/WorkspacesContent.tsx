import { useMemo } from 'react';
import { SETTINGS_CONSTANTS } from '../../lib/settings-constants';

export function WorkspacesContent() {
  const workspaces = useMemo(() => [
    { short_id: 'W-ab12', name: 'PinerWorks', created_at: '2024-06-10' },
    { short_id: 'W-cd34', name: 'Rehome', created_at: '2024-11-01' }
  ], []);

  return (
    <div className="p-4 md:p-6 text-[var(--muted)]" data-testid="workspaces-content">
      <h1 className="text-[var(--text)] text-xl font-medium mb-4">Workspaces</h1>
      
      <div 
        className="grid gap-8" 
        style={{ gridTemplateColumns: SETTINGS_CONSTANTS.CONTENT_COLS }}
      >
        <div>
          <h2 className="text-[var(--text)] text-base font-medium mb-1">Assigned Workspaces</h2>
          <p className="text-sm leading-5">
            See the workspaces you're part of. Switching does not change permissions.
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white">
          {/* Table Header */}
          <div className="grid grid-cols-[1fr_auto] text-[12px] text-[var(--muted)] bg-slate-50 border-b border-slate-200 px-3 h-9 items-center">
            <div>NAME</div>
            <div>CREATED</div>
          </div>

          {/* Table Rows */}
          {workspaces.map((workspace, i) => (
            <div
              key={workspace.short_id}
              className={`grid grid-cols-[1fr_auto] px-3 h-11 items-center ${
                i ? 'border-t border-slate-200' : ''
              }`}
            >
              <div className="text-[var(--text)]">{workspace.name}</div>
              <div className="text-sm">{workspace.created_at}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { Loader2 } from 'lucide-react';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { SETTINGS_CONSTANTS } from '../../lib/settings-constants';

export function WorkspacesContent() {
  const { workspaces, loading } = useWorkspaces();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });
  };

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

          {/* Loading State */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--muted)]" />
            </div>
          ) : workspaces.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-[var(--muted)]">
              No workspaces found
            </div>
          ) : (
            /* Table Rows */
            workspaces.map((workspace, i) => (
              <div
                key={workspace.id}
                className={`grid grid-cols-[1fr_auto] px-3 h-11 items-center ${
                  i ? 'border-t border-slate-200' : ''
                }`}
              >
                <div className="text-[var(--text)]">{workspace.name}</div>
                <div className="text-sm">{formatDate(workspace.created_at)}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

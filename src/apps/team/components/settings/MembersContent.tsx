import { useParams } from 'react-router-dom';
import { SETTINGS_CONSTANTS } from '../../lib/settings-constants';
import { WorkspaceMembersTable } from '@/components/workspace/WorkspaceMembersTable';

export function MembersContent() {
  const { workspaceId } = useParams();

  return (
    <div className="p-4 md:p-6 text-[var(--muted)]" data-testid="teams-content">
      <h1 className="text-[var(--text)] text-xl font-medium mb-4">Members</h1>
      
      <div 
        className="grid gap-8" 
        style={{ gridTemplateColumns: SETTINGS_CONSTANTS.CONTENT_COLS }}
        data-testid="teams-2col"
      >
        <div>
          <h2 className="text-[var(--text)] text-base font-medium mb-1">Workspace Team</h2>
          <p className="text-sm">People who have access to this workspace. Check users to add them to this workspace, uncheck to remove them.</p>
        </div>

        <div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            {workspaceId && <WorkspaceMembersTable workspaceId={workspaceId} />}
          </div>
        </div>
      </div>
    </div>
  );
}

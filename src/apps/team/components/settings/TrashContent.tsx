import { useState, useCallback, useMemo } from 'react';
import { Search as SearchIcon, Filter, Trash2 } from 'lucide-react';
import { SETTINGS_CONSTANTS } from '../../lib/settings-constants';

type ProjectRow = {
  id: string;
  name: string;
  status: 'pending' | 'active' | 'completed' | 'archived';
  deletedOn: string;
  deletedBy: string;
};

type ThreadRow = {
  id: string;
  title: string;
  deletedOn: string;
};

export function TrashContent() {
  const [projects, setProjects] = useState<ProjectRow[]>([
    { id: 'p1', name: 'Echo Summit Cabin', status: 'active', deletedOn: 'Oct 31, 2025', deletedBy: 'Armando' },
    { id: 'p2', name: '1919 25th St ADU', status: 'pending', deletedOn: 'Oct 29, 2025', deletedBy: 'Matthew' },
  ]);

  const [threads, setThreads] = useState<ThreadRow[]>([
    { id: 't1', title: 'Window schedule discussion', deletedOn: 'Oct 30, 2025' },
    { id: 't2', title: 'Permit checklist Q&A', deletedOn: 'Oct 28, 2025' },
  ]);

  const restoreProject = useCallback((id: string) => {
    setProjects(list => list.filter(p => p.id !== id));
  }, []);

  const restoreThread = useCallback((id: string) => {
    setThreads(list => list.filter(t => t.id !== id));
  }, []);

  const deleteForever = useCallback((kind: 'project' | 'thread', id: string) => {
    if (kind === 'project') {
      setProjects(list => list.filter(p => p.id !== id));
    } else {
      setThreads(list => list.filter(t => t.id !== id));
    }
  }, []);

  const rows = useMemo(() => [
    ...projects.map(p => ({
      id: p.id,
      name: p.name,
      type: `Project (${p.status})`,
      location: '—',
      deletedOn: p.deletedOn,
      deletedBy: p.deletedBy,
      kind: 'project' as const,
    })),
    ...threads.map(t => ({
      id: t.id,
      name: t.title,
      type: 'AI Chat',
      location: '—',
      deletedOn: t.deletedOn,
      deletedBy: '—',
      kind: 'thread' as const,
    })),
  ], [projects, threads]);

  return (
    <div className="p-4 md:p-6 space-y-4 text-[var(--muted)]" data-testid="trash-content">
      <div className="flex items-center justify-between">
        <h2 className="text-[var(--text)] text-lg font-medium">Trash</h2>
        <div />
      </div>
      
      <p className="text-[var(--muted)] text-sm">
        Items shown below will be automatically deleted forever after 30 days.
      </p>

      {/* Search Bar */}
      <div className="flex items-center gap-2 max-w-[520px]">
        <div className="relative flex-1">
          <input
            placeholder="Search"
            className="w-full h-9 rounded-md border border-slate-300 pl-8 pr-2 text-sm"
          />
          <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted)]" />
        </div>
        <button className="h-9 w-10 rounded-md border border-slate-300 grid place-items-center">
          <Filter className="h-4 w-4 text-[var(--muted)]" />
        </button>
      </div>

      {/* Unified Table */}
      <div className="rounded-lg border border-slate-200 overflow-hidden">
        {/* Table Header */}
        <div
          data-testid="trash-header"
          className="items-center gap-2 px-3 h-10 text-[12px] text-[var(--muted)] bg-slate-50 border-b border-slate-200 grid"
          style={{ gridTemplateColumns: SETTINGS_CONSTANTS.TRASH_COLS }}
        >
          <div>NAME</div>
          <div>TYPE</div>
          <div>LOCATION</div>
          <div>DELETED ON</div>
          <div>DELETED BY</div>
          <div>ACTIONS</div>
        </div>

        {/* Table Rows */}
        {rows.length ? (
          rows.map((row, i) => (
            <div
              key={`${row.kind}:${row.id}`}
              data-testid={i === 0 ? 'trash-row' : undefined}
              className={`items-center gap-2 px-3 h-11 text-[13px] text-[var(--text)] grid ${
                i ? 'border-t border-slate-200' : ''
              }`}
              style={{ gridTemplateColumns: SETTINGS_CONSTANTS.TRASH_COLS }}
            >
              <div className="truncate">{row.name}</div>
              <div className="truncate">{row.type}</div>
              <div className="truncate">{row.location}</div>
              <div>{row.deletedOn}</div>
              <div>{row.deletedBy}</div>
              <div className="flex items-center gap-2">
                {/* Restore Button */}
                <button
                  onClick={() =>
                    row.kind === 'project' ? restoreProject(row.id) : restoreThread(row.id)
                  }
                  aria-label="Restore"
                  className="h-7 w-7 grid place-items-center rounded-md bg-white hover:bg-slate-50"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M3 12a9 9 0 1 0 3-6.7" />
                    <path d="M3 3v6h6" />
                  </svg>
                </button>

                {/* Delete Forever Button */}
                <button
                  onClick={() => deleteForever(row.kind, row.id)}
                  aria-label="Delete forever"
                  className="h-7 w-7 grid place-items-center rounded-md bg-red-500 hover:bg-red-600 text-white"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="px-3 py-6 text-sm text-[var(--muted)]">No deleted items.</div>
        )}
      </div>
    </div>
  );
}

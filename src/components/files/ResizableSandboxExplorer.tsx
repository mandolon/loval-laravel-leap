import React, { useState, useMemo } from 'react';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { DESIGN_TOKENS as T, UTILITY_CLASSES } from '@/lib/design-tokens';

function SectionHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className={UTILITY_CLASSES.sectionHeader}>
      <span>{title}</span>
      {right}
    </div>
  );
}

export const ResizableSandboxExplorer = React.memo(function ResizableSandboxExplorer({ compact = false }: { compact?: boolean }) {
  const ROOT = useMemo(() => ['Attachments', 'Build', 'Design', 'Permit', 'Photos', 'Plans'], []);
  const FOLDERS = useMemo(() => ['In Progress', 'Pending', 'Completed', 'Archived'], []);
  const FILES = useMemo(
    () => [
      { id: 1, name: 'RES-2427762 - INVOICE.pdf', size: '63.0 KB', modified: 'Oct 17, 02:46 AM', type: 'PDF' },
      { id: 2, name: 'Receipt-2482-0266.pdf', size: '20.2 KB', modified: 'Oct 17, 02:39 AM', type: 'PDF' },
      { id: 3, name: 'Flattened_Partial_Set_10.13.25.pdf', size: '5.3 MB', modified: 'Oct 17, 02:38 AM', type: 'PDF' },
      { id: 4, name: 'Invoice-INV-01.pdf', size: '3.3 KB', modified: 'Oct 17, 02:36 AM', type: 'PDF' },
    ],
    []
  );

  const [root, setRoot] = useState(ROOT[0]);
  const [folder, setFolder] = useState(FOLDERS[0]);
  const [sel, setSel] = useState(FILES[0].id);
  const selectedFile = FILES.find((f) => f.id === sel);

  return (
    <div className="flex flex-col h-full min-h-0">
      <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
        {/* Root Panel */}
        <ResizablePanel defaultSize={14} minSize={10} maxSize={25}>
          <div className={`flex flex-col h-full min-w-0 bg-white dark:bg-[#0E1118] border-r border-slate-200 dark:border-[#1a2030]/60`}>
            {/* Search bar - aligned with headers */}
            <div className="h-9 px-3 flex items-center gap-2 border-b border-slate-200 dark:border-[#1d2230]">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-slate-400 dark:text-neutral-500" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                placeholder="Search…"
                className={`w-full h-7 px-2 bg-transparent text-[11px] text-slate-700 dark:text-neutral-300 placeholder:text-slate-400 dark:placeholder:text-neutral-500 ${T.focus}`}
              />
            </div>
            <div className="flex flex-col items-start justify-start px-3 py-2 space-y-2 overflow-auto">
              {ROOT.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRoot(r)}
                  className={`px-2.5 py-1 ${T.radius} w-full text-left transition-colors ${T.text} ${root === r ? UTILITY_CLASSES.activeItem : UTILITY_CLASSES.inactiveItem} ${T.focus}`}
                  aria-current={root === r ? 'true' : undefined}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle className={UTILITY_CLASSES.handleHorizontal} />

        {/* Folders Panel */}
        <ResizablePanel defaultSize={18} minSize={15} maxSize={30}>
          <div className={`bg-white dark:bg-[#0F1219] border-r border-slate-200 dark:border-[#1d2230]/60 flex flex-col h-full min-w-0`}>
            <SectionHeader
              title="Folders"
              right={
                <button type="button" className={`px-2 py-0.5 border border-slate-200 dark:border-[#283046] ${T.radius} ${T.text} text-slate-600 dark:text-neutral-400 hover:bg-slate-50 dark:hover:bg-[#161B26] ${T.focus}`} aria-label="Add folder" title="Add folder">
                  ＋
                </button>
              }
            />
            <div className="flex-1 overflow-auto min-w-0">
              {FOLDERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFolder(f)}
                  className={`w-full text-left px-3 py-1 ${T.text} border-l-2 ${folder === f ? UTILITY_CLASSES.explorerActiveFolder : UTILITY_CLASSES.explorerInactiveFolder}`}
                  aria-current={folder === f ? 'true' : undefined}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle className={UTILITY_CLASSES.handleHorizontal} />

        {/* Files Panel */}
        <ResizablePanel defaultSize={68} minSize={40}>
          <div className={`bg-white dark:bg-[#0F1219] flex flex-col h-full min-w-0`}>
            <SectionHeader
              title="Files"
              right={
                <button type="button" className={`px-2 py-0.5 border border-slate-200 dark:border-[#283046] ${T.radius} ${T.text} text-slate-600 dark:text-neutral-400 hover:bg-slate-50 dark:hover:bg-[#161B26] ${T.focus}`} aria-label="Add file" title="Add file">
                  ＋
                </button>
              }
            />
            <div className="flex-1 overflow-auto min-w-0">
              {FILES.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSel(f.id)}
                  className={`w-full grid ${compact ? 'grid-cols-[minmax(0,1fr)]' : 'grid-cols-[minmax(0,1fr)_max-content_max-content_56px]'} gap-2 items-center px-3 py-1 text-left ${T.text} ${sel === f.id ? UTILITY_CLASSES.explorerActiveFile : UTILITY_CLASSES.explorerInactiveFile}`}
                  aria-current={sel === f.id ? 'true' : undefined}
                >
                  <span className="truncate min-w-0">{f.name}</span>
                  <span className={`text-slate-500 dark:text-neutral-400 whitespace-nowrap ${compact ? 'hidden' : ''}`}>{f.size}</span>
                  <span className={`text-slate-500 dark:text-neutral-400 whitespace-nowrap ${compact ? 'hidden' : ''}`}>{f.modified}</span>
                  <span className={`text-slate-500 dark:text-neutral-400 whitespace-nowrap ${compact ? 'hidden' : ''}`}>{f.type}</span>
                </button>
              ))}
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Footer for file properties */}
      <div className="h-7 px-3 flex items-center justify-between border-t border-slate-200 dark:border-[#1a2030]/40 bg-white dark:bg-[#0E1118] text-slate-500 dark:text-neutral-400 text-[10px]">
        <span>Selected File:</span>
        {selectedFile ? (
          <span className="truncate text-slate-700 dark:text-neutral-300 max-w-[60%]">
            {selectedFile.name} ({selectedFile.size})
          </span>
        ) : (
          <span className="text-slate-400 dark:text-neutral-500">None</span>
        )}
      </div>
    </div>
  );
});

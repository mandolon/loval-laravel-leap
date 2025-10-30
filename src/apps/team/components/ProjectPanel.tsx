import React, { useMemo, useState, useEffect, useRef, forwardRef } from "react";
import { Search, FolderClosed, BookOpen, MoreVertical } from "lucide-react";
import { useProjectFolders, useProjectFiles } from '@/lib/api/hooks/useProjectFiles';
import { useDrawingVersions, useUpdateDrawingScale } from '@/lib/api/hooks/useDrawings';
import { SCALE_PRESETS, getInchesPerSceneUnit, type ScalePreset, type ArrowCounterStats } from '@/utils/excalidraw-measurement-tools';

/**
 * PROJECT PANEL — Files & Whiteboards now share identical interaction rules
 * Added to WHITEBOARDS tab (matching Files):
 *  - Drag & drop (reorder versions; reorder/move pages between versions)
 *  - Context menu (Rename, Delete, New Version…)
 *  - Inline rename for versions & pages
 *  - New versions insert at top
 *  - Smooth collapse/expand animation
 *  - Search filtering keeps versions open
 * Still: selecting a page opens Properties inline (no tab switch)
 */

const SOFT_SQUARE = 12;

// Hide scrollbars
const HiddenScrollCSS = () => (
  <style>{`
    .no-scrollbar::-webkit-scrollbar{display:none}
    .no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}
  `}</style>
);

// Small soft square (filled/dashed) used by folders/versions
const SoftSquare = forwardRef(function SoftSquare(
  { filled = false, dashed = false }: { filled?: boolean; dashed?: boolean },
  ref: any
) {
  return (
    <span
      ref={ref}
      className={`inline-block rounded-[4px] align-middle ${
        dashed ? "border border-dashed border-slate-500" : filled ? "bg-[#4C75D1] opacity-70" : "border border-slate-400"
      }`}
      style={{ width: SOFT_SQUARE, height: SOFT_SQUARE, boxShadow: filled ? "inset 0 0 0 1px rgba(0,0,0,.28)" : undefined }}
    />
  );
});

// ------- Minimal helpers -------
const filterSections = (q: string, sections: any[], lists: any) => {
  const qq = String(q || "").trim().toLowerCase();
  if (!qq) return sections;
  return sections.filter((s) => (lists[s.id] || []).some((it: any) => String(it.name).toLowerCase().includes(qq)));
};

function nextNewFolderName(existingTitles: string[]) {
  const base = "New Folder";
  const used = new Set(existingTitles);
  if (!used.has(base)) return base;
  let n = 1;
  while (used.has(`${base} (${n})`)) n += 1;
  return `${base} (${n})`;
}
function nextNewVersionName(existingTitles: string[]) {
  const base = "New Version";
  const used = new Set(existingTitles);
  if (!used.has(base)) return base;
  let n = 1;
  while (used.has(`${base} (${n})`)) n += 1;
  return `${base} (${n})`;
}

// Collapsible container with smooth animation
function Expander({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) {
  const style = {
    display: "grid",
    gridTemplateRows: isOpen ? "1fr" : "0fr",
    transition: "grid-template-rows 240ms cubic-bezier(0.34, 1.56, 0.64, 1)",
  };
  return (
    <div style={style}>
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}

// Clickable section row (folder/version)
function SectionHeader({
  title,
  open,
  onToggle,
  onContextMenu,
  editing,
  onCommitEdit,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  icon,
}: any) {
  const [editValue, setEditValue] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleKeyDown = (e: any) => {
    if (e.key === "Enter") onCommitEdit(editValue);
    else if (e.key === "Escape") onCommitEdit(title);
  };

  return (
    <div
      className={`group relative flex items-center gap-1 py-[2px] px-1 rounded-lg select-none ${editing ? "border border-blue-400" : "hover:bg-slate-100"}`}
      onClick={onToggle}
      onContextMenu={onContextMenu}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {icon ? (
        <span className="inline-flex items-center justify-center" style={{ width: SOFT_SQUARE, height: SOFT_SQUARE }}>
          {icon}
        </span>
      ) : (
        <SoftSquare filled={open} dashed={!!editing} />
      )}
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => onCommitEdit(editValue)}
          onClick={(e) => e.stopPropagation()}
          className="w-full bg-transparent outline-none border-b border-slate-300 text-slate-800"
          style={{ fontSize: 11 }}
        />
      ) : (
        <span className="text-[11px] font-medium text-slate-800">{title}</span>
      )}
      <MoreVertical className="ml-auto hidden h-3.5 w-3.5 text-slate-400 group-hover:block" />
    </div>
  );
}

// Simple item row (file/page)
function ItemRow({
  item,
  selected,
  onClick,
  onContextMenu,
  editing,
  onCommitEdit,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  dragOverPosition,
}: any) {
  const [editValue, setEditValue] = useState(item.name);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleKeyDown = (e: any) => {
    if (e.key === "Enter") onCommitEdit(editValue);
    else if (e.key === "Escape") onCommitEdit(item.name);
  };

  return (
    <div
      className={`group relative flex items-center gap-0.5 py-[2px] px-1 rounded-lg cursor-pointer select-none transition-colors border ${
        selected ? "border-blue-400 ring-1 ring-blue-400/30 bg-slate-50" : "border-transparent hover:bg-slate-100"
      }`}
      onClick={onClick}
      onContextMenu={onContextMenu}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <span className="inline-block" style={{ width: SOFT_SQUARE, height: SOFT_SQUARE }} />

      {editing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => onCommitEdit(editValue)}
          className="flex-1 bg-transparent outline-none border-b border-slate-300 text-slate-800"
          style={{ fontSize: 11 }}
        />
      ) : (
        <span className="text-[11px] text-slate-800 truncate">{item.name}</span>
      )}

      <MoreVertical className="ml-auto hidden h-3.5 w-3.5 text-slate-400 group-hover:block" />

      {dragOverPosition === "above" && <div className="absolute left-2 right-2 -top-[1px] h-[2px] bg-blue-400 rounded" />}
      {dragOverPosition === "below" && <div className="absolute left-2 right-2 -bottom-[1px] h-[2px] bg-blue-400 rounded" />}
    </div>
  );
}

// Key-value pair display
function KeyVal({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between text-[10px] text-slate-700">
      <span className="font-medium text-slate-500">{k}</span>
      <span className="truncate ml-2">{v}</span>
    </div>
  );
}

// Format bytes helper
function formatBytes(bytes?: number | null) {
  if (bytes == null || bytes === 0) return "—";
  const k = 1024;
  if (bytes < k) return `${bytes} B`;
  if (bytes < k * k) return `${(bytes / k).toFixed(1)} KB`;
  return `${(bytes / (k * k)).toFixed(1)} MB`;
}

// ------- Project Panel -------
interface ProjectFile {
  id: string;
  filename: string;
  storage_path: string;
  mimetype: string | null;
  filesize: number | null;
  updated_at: string;
  folder_id: string;
}

export default function ProjectPanel({ 
  projectId, 
  projectName = "Project Files",
  onBreadcrumb,
  onFileSelect,
  onWhiteboardSelect,
  arrowCounterEnabled,
  onArrowCounterToggle,
  currentScale,
  onScaleChange,
  arrowStats
}: { 
  projectId: string; 
  projectName?: string; 
  onBreadcrumb?: (breadcrumb: string) => void;
  onFileSelect?: (file: ProjectFile | null) => void;
  onWhiteboardSelect?: (whiteboard: { pageId: string; pageName: string; versionTitle: string } | null) => void;
  arrowCounterEnabled?: boolean;
  onArrowCounterToggle?: () => void;
  currentScale?: ScalePreset;
  onScaleChange?: (scale: ScalePreset) => void;
  arrowStats?: ArrowCounterStats;
}) {
  const [tab, setTab] = useState<'files' | 'whiteboards'>('files');
  const [query, setQuery] = useState("");
  const [wbQuery, setWbQuery] = useState("");
  const [selectedWB, setSelectedWB] = useState<any>(null);

  // Database queries for Files tab
  const { data: rawFolders = [], isLoading: foldersLoading } = useProjectFolders(projectId);
  const { data: rawFiles = [], isLoading: filesLoading } = useProjectFiles(projectId);

  // Transform database data to component format
  const sections = useMemo(() => {
    return rawFolders.map(folder => ({
      id: folder.id,
      title: folder.name,
    }));
  }, [rawFolders]);

  const lists = useMemo(() => {
    const grouped: Record<string, Array<{ id: string; name: string }>> = {};
    rawFiles.forEach(file => {
      const folderId = file.folder_id;
      if (!grouped[folderId]) grouped[folderId] = [];
      grouped[folderId].push({
        id: file.id,
        name: file.filename,
      });
    });
    return grouped;
  }, [rawFiles]);

  // Local state for drag/drop mutations
  const [localSections, setLocalSections] = useState<typeof sections>([]);
  const [localLists, setLocalLists] = useState<typeof lists>({});

  useEffect(() => {
    setLocalSections(sections);
    setLocalLists(lists);
  }, [sections, lists]);

  // Expanded/collapsed (files) - initialize from database once
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const hasInitialized = useRef(false);
  
  useEffect(() => {
    if (hasInitialized.current || rawFolders.length === 0) return;
    const initial: Record<string, boolean> = {};
    rawFolders.forEach(folder => {
      initial[folder.id] = true; // All folders open by default
    });
    setExpanded(initial);
    hasInitialized.current = true;
  }, [rawFolders]);

  // Drag & drop state (files)
  const [dragState, setDragState] = useState<any>(null);
  const [dragOverState, setDragOverState] = useState<any>(null);
  const [sectionDragId, setSectionDragId] = useState<string | null>(null);
  const [sectionDropIndex, setSectionDropIndex] = useState(-1);

  // Selection / editing (files)
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<any>(null);

  // Context menu (files)
  const [menu, setMenu] = useState<any>({ show: false, x: 0, y: 0, target: null });
  useEffect(() => {
    const close = () => setMenu((m: any) => ({ ...m, show: false }));
    if (menu.show) {
      document.addEventListener("click", close);
      return () => document.removeEventListener("click", close);
    }
  }, [menu.show]);

  // Whiteboards data - fetch from database
  const { data: drawingVersions, isLoading: wbLoading } = useDrawingVersions(projectId);
  const updateDrawingScale = useUpdateDrawingScale();
  
  // Transform to UI format
  const wbSections = useMemo(() => 
    drawingVersions?.map(v => ({ id: v.id, title: v.version_number })) || []
  , [drawingVersions]);

  const wbPages = useMemo(() => {
    const pages: Record<string, any[]> = {};
    drawingVersions?.forEach(v => {
      pages[v.id] = v.drawing_pages.map(p => ({ id: p.id, name: p.name }));
    });
    return pages;
  }, [drawingVersions]);
  
  // Remove local measurement state - now controlled by parent

  // Expanded/collapsed (whiteboards)
  const [wbExpanded, setWbExpanded] = useState<any>({ v2: true, v15: true, v10: true });

  // Drag & drop state (whiteboards)
  const [wbDragState, setWbDragState] = useState<any>(null);
  const [wbDragOverState, setWbDragOverState] = useState<any>(null);
  const [wbSectionDragId, setWbSectionDragId] = useState<string | null>(null);
  const [wbSectionDropIndex, setWbSectionDropIndex] = useState(-1);

  // Selection / editing (whiteboards)
  const [wbSelectedId, setWbSelectedId] = useState<string | null>(null);
  const [wbEditing, setWbEditing] = useState<any>(null);

  // Context menu (whiteboards)
  const [wbMenu, setWbMenu] = useState<any>({ show: false, x: 0, y: 0, target: null });
  useEffect(() => {
    const close = () => setWbMenu((m: any) => ({ ...m, show: false }));
    if (wbMenu.show) {
      document.addEventListener("click", close);
      return () => document.removeEventListener("click", close);
    }
  }, [wbMenu.show]);

  // Mock metadata for whiteboard pages
  const pageMeta = useMemo(
    () => ({
      w21: { by: "Armando L.", at: "Oct 30, 2025 9:12 AM" },
      w22: { by: "Matt P.", at: "Oct 28, 2025 4:05 PM" },
      w23: { by: "Dustin H.", at: "Oct 27, 2025 1:17 PM" },
      w151: { by: "Armando L.", at: "Oct 20, 2025 10:02 AM" },
      w152: { by: "Matt P.", at: "Oct 19, 2025 3:41 PM" },
      w101: { by: "Armando L.", at: "Oct 05, 2025 8:29 AM" },
    }),
    []
  );

  const visFiles = useMemo(() => filterSections(query, localSections, localLists), [query, localSections, localLists]);
  const visWB = useMemo(() => filterSections(wbQuery, wbSections, wbPages), [wbQuery, wbSections, wbPages]);

  const openWBProps = (versionId: string, versionTitle: string, pageId: string, pageName: string) => {
    setSelectedWB({ versionId, versionTitle, pageId, pageName });
    setWbSelectedId(pageId);
    if (onBreadcrumb) onBreadcrumb(`Whiteboards › ${versionTitle} › ${pageName}`);
    if (onWhiteboardSelect) {
      onWhiteboardSelect({ pageId, pageName, versionTitle });
    }
  };

  // ---- Files: item drag/drop ----
  const handleItemDragStart = (listId: string, itemId: string, e: any) => {
    e.stopPropagation();
    setDragState({ fromList: listId, itemId });
    e.dataTransfer.effectAllowed = "move";
  };
  const handleItemDragOver = (listId: string, index: number, e: any) => {
    if (!dragState) return;
    e.preventDefault();
    e.stopPropagation();
    const bounds = e.currentTarget.getBoundingClientRect();
    const midY = bounds.top + bounds.height / 2;
    const position = e.clientY < midY ? "above" : "below";
    setDragOverState({ list: listId, index, position });
  };
  const handleItemDrop = (listId: string, index: number, e: any) => {
    if (!dragState) return;
    e.preventDefault();
    e.stopPropagation();
    const { fromList, itemId } = dragState;
    const item = (localLists[fromList] || []).find((i) => i.id === itemId);
    if (!item) return;
    setLocalLists((prev) => ({ ...prev, [fromList]: prev[fromList].filter((i) => i.id !== itemId) }));
    setLocalLists((prev) => {
      const target = [...(prev[listId] || [])];
      const insertIndex = dragOverState?.position === "above" ? index : index + 1;
      target.splice(insertIndex, 0, item);
      return { ...prev, [listId]: target };
    });
    setDragState(null);
    setDragOverState(null);
  };
  const handleItemDragEnd = () => {
    setDragState(null);
    setDragOverState(null);
  };

  // ---- Files: section drag/drop ----
  const handleSectionDragStart = (sectionId: string, e: any) => {
    e.stopPropagation();
    setSectionDragId(sectionId);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleSectionDragOver = (index: number, e: any) => {
    if (!sectionDragId) return;
    e.preventDefault();
    e.stopPropagation();
    setSectionDropIndex(index);
  };
  const handleSectionDrop = (e: any) => {
    if (!sectionDragId || sectionDropIndex < 0) return;
    e.preventDefault();
    e.stopPropagation();
    const dragIndex = localSections.findIndex((s) => s.id === sectionDragId);
    if (dragIndex === -1) return;
    setLocalSections((prev) => {
      const next = [...prev];
      const [dragged] = next.splice(dragIndex, 1);
      next.splice(sectionDropIndex, 0, dragged);
      return next;
    });
    setSectionDragId(null);
    setSectionDropIndex(-1);
  };
  const handleSectionDragEnd = () => {
    setSectionDragId(null);
    setSectionDropIndex(-1);
  };

  // ---- Files: helpers ----
  const getFilteredItems = (listId: string) => {
    const items = localLists[listId] || [];
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.name.toLowerCase().includes(q));
  };

  // ---- Files: renderers ----
  const renderSection = (section: any, index: number) => {
    const { id, title } = section;
    const isOpen = query.trim() ? true : !!expanded[id];
    const isEditing = editing?.type === "section" && editing?.list === id;
    const items = getFilteredItems(id);

    return (
      <div key={id} className="relative">
        {sectionDragId && sectionDropIndex === index && (
          <div className="absolute left-2 right-2 -top-1 h-0.5 bg-blue-400 rounded" />
        )}
        <div onDragOver={(e) => handleSectionDragOver(index, e)} onDrop={handleSectionDrop}>
          <SectionHeader
            title={title}
            open={isOpen}
            onToggle={() => setExpanded((s) => ({ ...s, [id]: !s[id] }))}
            onContextMenu={(e: any) => {
              e.preventDefault();
              e.stopPropagation();
              setMenu({ show: true, x: e.clientX, y: e.clientY, target: { type: "section", list: id } });
            }}
            editing={isEditing}
            onCommitEdit={(name: string) => {
              setLocalSections((prev) => prev.map((s) => (s.id === id ? { ...s, title: name } : s)));
              setEditing(null);
            }}
            draggable={true}
            onDragStart={(e: any) => handleSectionDragStart(id, e)}
            onDragOver={() => {}}
            onDrop={() => {}}
          />
          <Expander isOpen={isOpen}>
            <div className="ml-3">
              {!query.trim() && items.length === 0 && (
                <div className="group relative flex items-center gap-0.5 py-[2px] px-1 rounded-lg select-none text-slate-500/90">
                  <span className="inline-block" style={{ width: SOFT_SQUARE, height: SOFT_SQUARE }} />
                  <span className="text-[11px] italic">empty</span>
                </div>
              )}
              {items.map((item, idx) => {
                const isSelected = selectedId === item.id;
                const isItemEditing = editing?.type === "item" && editing?.list === id && editing?.id === item.id;
                const isDragOver = dragOverState?.list === id && dragOverState?.index === idx;
                return (
                  <ItemRow
                    key={item.id}
                    item={item}
                    selected={isSelected}
                    onClick={() => {
                      setSelectedId(item.id);
                      const fileData = rawFiles.find(f => f.id === item.id);
                      if (fileData && onFileSelect) {
                        onFileSelect(fileData);
                      }
                    }}
                    onContextMenu={(e: any) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setMenu({ show: true, x: e.clientX, y: e.clientY, target: { type: "item", list: id, id: item.id } });
                    }}
                    editing={isItemEditing}
                    onCommitEdit={(name: string) => {
                      setLocalLists((prev) => ({
                        ...prev,
                        [id]: prev[id].map((i) => (i.id === item.id ? { ...i, name } : i)),
                      }));
                      setEditing(null);
                    }}
                    draggable={!isItemEditing}
                    onDragStart={(e: any) => handleItemDragStart(id, item.id, e)}
                    onDragOver={(e: any) => handleItemDragOver(id, idx, e)}
                    onDrop={(e: any) => handleItemDrop(id, idx, e)}
                    dragOverPosition={isDragOver ? dragOverState.position : null}
                  />
                );
              })}
            </div>
          </Expander>
        </div>
      </div>
    );
  };

  // ---- Whiteboards: helpers ----
  const getWbFilteredPages = (version: string) => {
    const items = wbPages[version] || [];
    const q = wbQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i: any) => i.name.toLowerCase().includes(q));
  };

  // ---- Whiteboards: item drag/drop (pages) ----
  const handleWbItemDragStart = (version: string, pageId: string, e: any) => {
    e.stopPropagation();
    setWbDragState({ fromVersion: version, pageId });
    e.dataTransfer.effectAllowed = "move";
  };
  const handleWbItemDragOver = (version: string, index: number, e: any) => {
    // Disabled - needs API implementation
  };
  const handleWbItemDrop = (version: string, index: number, e: any) => {
    // Disabled - needs API implementation
  };
  const handleWbItemDragEnd = () => {
    setWbDragState(null);
    setWbDragOverState(null);
  };

  // ---- Whiteboards: section drag/drop (versions) ----
  const handleWbSectionDragStart = (versionId: string, e: any) => {
    // Disabled - needs API implementation
    e.preventDefault();
  };
  const handleWbSectionDragOver = (index: number, e: any) => {
    // Disabled - needs API implementation
  };
  const handleWbSectionDrop = (e: any) => {
    // Disabled - needs API implementation
  };
  const handleWbSectionDragEnd = () => {
    setWbSectionDragId(null);
    setWbSectionDropIndex(-1);
  };

  // ---- Whiteboards: renderers ----
  const renderWbSection = (section: any, index: number) => {
    const { id, title } = section;
    const isOpen = wbQuery.trim() ? true : !!wbExpanded[id];
    const isEditing = wbEditing?.type === "section" && wbEditing?.list === id;
    const items = getWbFilteredPages(id);

    return (
      <div key={id} className="relative">
        {wbSectionDragId && wbSectionDropIndex === index && (
          <div className="absolute left-2 right-2 -top-1 h-0.5 bg-blue-400 rounded" />
        )}
        <div onDragOver={(e) => handleWbSectionDragOver(index, e)} onDrop={handleWbSectionDrop}>
          <SectionHeader
            title={title}
            open={isOpen}
            onToggle={() => setWbExpanded((s: any) => ({ ...s, [id]: !s[id] }))}
            onContextMenu={(e: any) => {
              e.preventDefault();
              e.stopPropagation();
              setWbMenu({ show: true, x: e.clientX, y: e.clientY, target: { type: "section", list: id } });
            }}
            editing={isEditing}
            onCommitEdit={(name: string) => {
              // TODO: Implement rename with API mutation
              setWbEditing(null);
            }}
            draggable={false}
            onDragStart={(e: any) => handleWbSectionDragStart(id, e)}
            onDragOver={() => {}}
            onDrop={() => {}}
          />
          <Expander isOpen={isOpen}>
            <div className="ml-3">
              {!wbQuery.trim() && items.length === 0 && (
                <div className="group relative flex items-center gap-0.5 py-[2px] px-1 rounded-lg select-none text-slate-500/90">
                  <span className="inline-block" style={{ width: SOFT_SQUARE, height: SOFT_SQUARE }} />
                  <span className="text-[11px] italic">empty</span>
                </div>
              )}
              {items.map((item: any, idx: number) => {
                const isSelected = wbSelectedId === item.id;
                const isItemEditing = wbEditing?.type === "item" && wbEditing?.list === id && wbEditing?.id === item.id;
                const isDragOver = wbDragOverState?.version === id && wbDragOverState?.index === idx;
                return (
                  <ItemRow
                    key={item.id}
                    item={item}
                    selected={isSelected}
                    onClick={() => openWBProps(id, title, item.id, item.name)}
                    onContextMenu={(e: any) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setWbMenu({ show: true, x: e.clientX, y: e.clientY, target: { type: "item", list: id, id: item.id } });
                    }}
                    editing={isItemEditing}
                    onCommitEdit={(name: string) => {
                      // TODO: Implement rename with API mutation
                      setWbEditing(null);
                    }}
                    draggable={false}
                    onDragStart={(e: any) => handleWbItemDragStart(id, item.id, e)}
                    onDragOver={(e: any) => handleWbItemDragOver(id, idx, e)}
                    onDrop={(e: any) => handleWbItemDrop(id, idx, e)}
                    dragOverPosition={null}
                  />
                );
              })}
            </div>
          </Expander>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full w-full grid place-items-start">
      <HiddenScrollCSS />
      <div className="h-full w-[240px] rounded-xl bg-[#fcfcfc] border border-slate-200 overflow-y-auto no-scrollbar text-[11px]">
        {/* Tabs */}
        <div className="sticky top-0 z-10 h-10 px-2.5 border-b border-slate-200 bg-white flex items-center gap-2">
          <button
            className={`h-7 w-7 rounded-md opacity-70 hover:opacity-100 transition-opacity grid place-items-center border ${tab === "files" ? "border-slate-500 bg-white" : "border-transparent hover:bg-slate-100"}`}
            aria-label="Files"
            onClick={() => setTab("files")}
          >
            <FolderClosed className="h-4 w-4 text-slate-700" />
          </button>
          <button
            className={`h-7 w-7 rounded-md opacity-70 hover:opacity-100 transition-opacity grid place-items-center border ${tab === "whiteboards" ? "border-slate-500 bg-white" : "border-transparent hover:bg-slate-100"}`}
            aria-label="Whiteboards"
            onClick={() => setTab("whiteboards")}
          >
            <BookOpen className="h-4 w-4 text-slate-700" />
          </button>
        </div>

        {/* Files: search + tree */}
        {tab === "files" && (
          <>
            {(foldersLoading || filesLoading) ? (
              <div className="px-2.5 py-4 text-[11px] text-slate-500 text-center">
                Loading...
              </div>
            ) : (
              <>
                <div className="sticky top-10 z-10 h-9 px-2.5 border-b border-slate-200 bg-[#fcfcfc] flex items-center">
                  <div className="relative w-full">
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search"
                      className="w-full h-7 pl-6 pr-2 text-[11px] bg-white border border-slate-300 rounded-[6px] focus:outline-none"
                    />
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="px-2.5 pt-1.5 pb-2" onDragEnd={handleItemDragEnd}>
                  <SectionHeader
                    title={projectName}
                    open={true}
                    onToggle={() => {}}
                    onContextMenu={(e: any) => e.preventDefault()}
                    icon={<FolderClosed className="h-3 w-3 text-slate-700" />}
                  />
                  <div className="mt-1" onDragEnd={handleSectionDragEnd}>
                    {(query ? filterSections(query, localSections, localLists) : localSections).map((s, idx) => renderSection(s, idx))}
                  </div>
                </div>

                {/* Context Menu (Files) */}
                {menu.show && (
                  <div
                    className="fixed z-50 w-40 rounded-md border border-slate-200 bg-white shadow-xl overflow-hidden"
                    style={{ left: menu.x, top: menu.y }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="block w-full px-3 py-1.5 text-left text-[11px] text-slate-800 hover:bg-slate-100"
                      onClick={() => {
                        if (!menu.target) return;
                        if (menu.target.type === "item") setEditing({ type: "item", list: menu.target.list, id: menu.target.id });
                        else setEditing({ type: "section", list: menu.target.list });
                        setMenu((m: any) => ({ ...m, show: false }));
                      }}
                    >
                      Rename
                    </button>
                    <button
                      className="block w-full px-3 py-1.5 text-left text-[11px] text-red-600 hover:bg-red-50"
                      onClick={() => {
                        if (!menu.target) return;
                        if (menu.target.type === "item") {
                          const { list, id } = menu.target;
                          setLocalLists((prev) => ({ ...prev, [list]: prev[list].filter((i) => i.id !== id) }));
                          if (selectedId === id) setSelectedId(null);
                        } else {
                          const { list } = menu.target;
                          setLocalSections((prev) => prev.filter((s) => s.id !== list));
                          setLocalLists((prev) => {
                            const next = { ...prev };
                            delete next[list];
                            return next;
                          });
                        }
                        setMenu((m: any) => ({ ...m, show: false }));
                      }}
                    >
                      Delete
                    </button>
                    <button
                      className="block w-full px-3 py-1.5 text-left text-[11px] text-slate-800 hover:bg-slate-100"
                      onClick={() => {
                        const titles = localSections.map((s) => s.title);
                        const defaultName = nextNewFolderName(titles);
                        const id = "sec_" + Date.now();
                        setLocalSections((prev) => [{ id, title: defaultName }, ...prev]);
                        setLocalLists((prev) => ({ ...prev, [id]: [] }));
                        setExpanded((prev) => ({ ...prev, [id]: true }));
                        setEditing({ type: "section", list: id });
                        setMenu((m: any) => ({ ...m, show: false }));
                      }}
                    >
                      New Folder…
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Whiteboards: search + tree with full interactions */}
        {tab === "whiteboards" && (
          <>
            <div className="sticky top-10 z-10 h-9 px-2.5 border-b border-slate-200 bg-[#fcfcfc] flex items-center">
              <div className="w-full flex items-center gap-1">
                {selectedWB && (
                  <button
                    onClick={() => setSelectedWB(null)}
                    className="h-7 w-7 rounded-md opacity-70 hover:opacity-100 transition-opacity border border-slate-300 bg-white grid place-items-center hover:bg-slate-50"
                    aria-label="Back to whiteboards"
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                  </button>
                )}
                {!selectedWB && (
                  <div className="relative flex-1">
                    <input
                      value={wbQuery}
                      onChange={(e) => setWbQuery(e.target.value)}
                      placeholder="Search whiteboards"
                      className="w-full h-7 pl-6 pr-2 text-[11px] bg-white border border-slate-300 rounded-[6px] focus:outline-none"
                    />
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                )}
              </div>
            </div>

            {/* List view */}
            {wbLoading ? (
              <div className="px-2.5 py-4 text-[11px] text-slate-500 text-center">
                Loading whiteboards...
              </div>
            ) : (
              <div className={selectedWB ? "hidden px-2.5 pt-1.5 pb-2" : "px-2.5 pt-1.5 pb-2"} onDragEnd={handleWbItemDragEnd}>
                <SectionHeader
                  title="Whiteboards"
                  open={true}
                  onToggle={() => {}}
                  onContextMenu={(e: any) => e.preventDefault()}
                  icon={<BookOpen className="h-3 w-3 text-slate-700" />}
                />
                <div className="mt-1" onDragEnd={handleWbSectionDragEnd}>
                  {(wbQuery ? filterSections(wbQuery, wbSections, wbPages) : wbSections).map((s, idx) => renderWbSection(s, idx))}
                </div>
              </div>
            )}

            {/* Context Menu (Whiteboards) */}
            {wbMenu.show && (
              <div
                className="fixed z-50 w-44 rounded-md border border-slate-200 bg-white shadow-xl overflow-hidden"
                style={{ left: wbMenu.x, top: wbMenu.y }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="block w-full px-3 py-1.5 text-left text-[11px] text-slate-800 hover:bg-slate-100"
                  onClick={() => {
                    if (!wbMenu.target) return;
                    if (wbMenu.target.type === "item") {
                      setWbEditing({ type: "item", list: wbMenu.target.list, id: wbMenu.target.id });
                    } else {
                      setWbEditing({ type: "section", list: wbMenu.target.list });
                    }
                    setWbMenu((m: any) => ({ ...m, show: false }));
                  }}
                >
                  Rename
                </button>
                <button
                  className="block w-full px-3 py-1.5 text-left text-[11px] text-red-600 hover:bg-red-50"
                  onClick={() => {
                    // TODO: Implement delete with API mutation
                    setWbMenu((m: any) => ({ ...m, show: false }));
                  }}
                >
                  Delete
                </button>
                <button
                  className="block w-full px-3 py-1.5 text-left text-[11px] text-slate-800 hover:bg-slate-100"
                  onClick={() => {
                    // TODO: Implement create version with API mutation
                    setWbMenu((m: any) => ({ ...m, show: false }));
                  }}
                >
                  New Version…
                </button>
              </div>
            )}

            {/* Properties view (when whiteboard is selected) */}
            {selectedWB && (
              <div className="px-2.5 pt-1.5 pb-3">
                <div className="group relative flex items-center gap-1 py-[2px] px-1 rounded-lg select-none">
                  <span className="inline-flex items-center justify-center" style={{ width: SOFT_SQUARE, height: SOFT_SQUARE }}>
                    <BookOpen className="h-3 w-3 text-slate-700" />
                  </span>
                  <span className="text-[11px] font-medium text-slate-800">Whiteboards</span>
                  <span className="text-[11px] text-slate-400">/</span>
                  <span className="text-[11px] text-slate-700">{selectedWB.versionTitle}</span>
                  <span className="text-[11px] text-slate-400">/</span>
                  <span className="text-[11px] text-slate-900 font-medium truncate">{selectedWB.pageName}</span>
                </div>
                <div className="mt-2.5 rounded-xl border border-slate-200 bg-white shadow-sm p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[12px] font-semibold text-slate-900">Properties</div>
                    <button className="h-6 w-6 grid place-items-center rounded-md opacity-70 hover:opacity-100 transition-opacity hover:bg-slate-100" aria-label="Collapse">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                  </div>
                  <div className="space-y-3">
                    {/* File facts */}
                    {(() => {
                      const m = pageMeta[selectedWB.pageId as keyof typeof pageMeta] || { by: "—", at: "—" };
                      return (
                        <>
                          <KeyVal k="Version #" v={(m as any).version_number != null ? String((m as any).version_number) : "—"} />
                          <KeyVal k="Sheet" v={(m as any).filename || selectedWB.pageName} />
                          <KeyVal k="File ID" v={(m as any).file_short_id || "—"} />
                          <KeyVal k="MIME Type" v={(m as any).mimetype || "—"} />
                          <KeyVal k="Filesize" v={formatBytes((m as any).filesize)} />
                          <KeyVal k="Uploaded by" v={(m as any).uploaded_by_short_id || m.by} />
                          <KeyVal k="Created" v={m.at} />
                          <KeyVal k="Updated" v={(m as any).updated || m.at} />
                          <KeyVal k="Downloads" v={(m as any).download_count != null ? String((m as any).download_count) : "—"} />
                        </>
                      );
                    })()}
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200 space-y-3">
                    <div className="text-[11px] font-semibold text-slate-900 mb-2.5">Drawing Tools</div>
                    
                    {/* Arrow Counter Toggle - matching purple/pink design from screenshot */}
                    <div className="mb-4">
                      <div className="text-[10px] text-slate-600 mb-1.5">Arrow Counter</div>
                      <button
                        onClick={() => onArrowCounterToggle?.()}
                        className={`w-full h-10 rounded-lg border flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
                          arrowCounterEnabled
                            ? 'border-purple-400 bg-purple-50 text-purple-700'
                            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {arrowCounterEnabled && (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                        {arrowCounterEnabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>

                    {/* Drawing Scale Dropdown */}
                    <div className="mb-4">
                      <div className="text-[10px] text-slate-600 mb-1.5">Drawing Scale</div>
                      <select
                        value={currentScale}
                        onChange={(e) => {
                          const scale = e.target.value as ScalePreset;
                          onScaleChange?.(scale);
                          
                          // Update database
                          if (selectedWB?.pageId) {
                            updateDrawingScale.mutate({
                              pageId: selectedWB.pageId,
                              scaleName: scale,
                              inchesPerSceneUnit: getInchesPerSceneUnit(SCALE_PRESETS[scale])
                            });
                          }
                        }}
                        className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        {Object.keys(SCALE_PRESETS).map(scale => (
                          <option key={scale} value={scale}>{scale}</option>
                        ))}
                      </select>
                    </div>

                    {/* Live Statistics - matching design from screenshot */}
                    {arrowCounterEnabled && arrowStats && arrowStats.count > 0 && (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <div className="text-center text-purple-700 font-semibold text-sm mb-1">
                          {arrowStats.count} arrow{arrowStats.count !== 1 ? 's' : ''} labeled
                        </div>
                        {arrowStats.values.length > 0 && (
                          <div className="text-center text-xs text-slate-600">
                            Values: {arrowStats.values.join(', ')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

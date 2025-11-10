import React, { useMemo, useState, useEffect, useRef, forwardRef, useCallback } from "react";
import { Search, FolderClosed, BookOpen, MoreVertical, Settings2, Info, Plus } from "lucide-react";
import { useProjectFolders, useProjectFiles, useDeleteProjectFile, useDeleteFolder, useMoveProjectFile, useRenameFolder, useRenameProjectFile, useUploadProjectFiles, downloadProjectFile } from '@/lib/api/hooks/useProjectFiles';
import { useProjectFolderDragDrop } from '@/lib/api/hooks/useProjectFolderDragDrop';
import { useDrawingVersions, useUpdateDrawingScale, useCreateDrawingPage, useCreateDrawingVersion, useDeleteDrawingVersion, useDeleteDrawingPage, useUpdateDrawingVersion, useUpdateDrawingPageName } from '@/lib/api/hooks/useDrawings';
import { SCALE_PRESETS, getInchesPerSceneUnit, type ScalePreset, type ArrowCounterStats } from '@/utils/excalidraw-measurement-tools';
import { useHardDeleteProject, useProject } from '@/lib/api/hooks/useProjects';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useRoleAwareNavigation } from '@/hooks/useRoleAwareNavigation';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ProjectInfoNavigation } from './ProjectInfoNavigation';

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
  onUpload,
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
        <SoftSquare filled={!open} dashed={!!editing} />
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
      {onUpload ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUpload();
          }}
          className="ml-auto hidden h-3.5 w-3.5 text-slate-400 group-hover:block hover:text-slate-600 transition-colors"
          title="Upload files to this folder"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      ) : (
        <MoreVertical className="ml-auto hidden h-3.5 w-3.5 text-slate-400 group-hover:block" />
      )}
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
  showArrowStats,
  onToggleArrowStats,
  currentScale,
  onScaleChange,
  arrowStats,
  onCalibrate,
  inchesPerSceneUnit
}: { 
  projectId: string; 
  projectName?: string; 
  onBreadcrumb?: (breadcrumb: string) => void;
  onFileSelect?: (file: ProjectFile | null) => void;
  onWhiteboardSelect?: (whiteboard: { pageId: string; pageName: string; versionTitle: string } | null) => void;
  showArrowStats?: boolean;
  onToggleArrowStats?: () => void;
  currentScale?: ScalePreset;
  onScaleChange?: (scale: ScalePreset) => void;
  arrowStats?: ArrowCounterStats;
  onCalibrate?: () => void;
  inchesPerSceneUnit?: number;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('projectTab') as 'files' | 'whiteboards' | 'settings' | 'info') || 'files';
  const [tab, setTab] = useState<'files' | 'whiteboards' | 'settings' | 'info'>(initialTab);
  const [query, setQuery] = useState("");
  const [wbQuery, setWbQuery] = useState("");
  const [selectedWB, setSelectedWB] = useState<any>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const { currentWorkspaceId } = useWorkspaces();
  const navigate = useNavigate();
  const { navigateToWorkspace } = useRoleAwareNavigation();
  const hardDeleteProjectMutation = useHardDeleteProject(currentWorkspaceId || "");
  const { data: project } = useProject(projectId);
  const { toast } = useToast();

  // Database queries for Files tab
  const { data: rawFolders = [], isLoading: foldersLoading } = useProjectFolders(projectId);
  const { data: rawFiles = [], isLoading: filesLoading } = useProjectFiles(projectId);
  const deleteFile = useDeleteProjectFile(projectId);
  const deleteFolder = useDeleteFolder(projectId);
  const moveFile = useMoveProjectFile(projectId);
  const renameFolder = useRenameFolder(projectId);
  const renameFile = useRenameProjectFile(projectId);
  const uploadFiles = useUploadProjectFiles(projectId);
  const { reorderFoldersMutation, moveFolderAcrossSectionsMutation, batchUpdateFoldersMutation } = useProjectFolderDragDrop(projectId);

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

  // Local state for drag/drop mutations - initialize from database data
  const [localSections, setLocalSections] = useState<typeof sections>([]);
  const [localLists, setLocalLists] = useState<typeof lists>({});
  
  // Folder partitioning state (above/below separator)
  const [separatorIndex, setSeparatorIndex] = useState<number>(-1); // -1 means no separator, or index where separator appears
  const STORAGE_KEY = `project-folders-arrangement-${projectId}`;

  // Load saved folder arrangement from localStorage
  useEffect(() => {
    if (!projectId) return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.separatorIndex !== undefined) {
          setSeparatorIndex(parsed.separatorIndex);
        }
        // Order is now handled in the sections effect above
      }
    } catch (e) {
      console.error('Failed to load folder arrangement:', e);
    }
  }, [projectId, STORAGE_KEY]);

  // Save folder arrangement to localStorage
  const saveFolderArrangement = useCallback((sections: typeof localSections, separatorIdx: number) => {
    if (!projectId) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        order: sections.map(s => s.id),
        separatorIndex: separatorIdx,
      }));
    } catch (e) {
      console.error('Failed to save folder arrangement:', e);
    }
  }, [projectId, STORAGE_KEY]);

  // Initialize separator when folders are first loaded
  useEffect(() => {
    if (localSections.length > 0 && separatorIndex < 0) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        // Only initialize if no saved arrangement exists
        const mid = Math.floor(localSections.length / 2);
        setSeparatorIndex(mid);
        saveFolderArrangement(localSections, mid);
      }
    }
  }, [localSections.length, separatorIndex, saveFolderArrangement, STORAGE_KEY]);

  // Only update local state when data actually changes (deep comparison)
  useEffect(() => {
    if (JSON.stringify(localSections) !== JSON.stringify(sections)) {
      // When sections change, check if we have a saved order
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.order && Array.isArray(parsed.order)) {
            // Reorder sections based on saved order
            const orderMap = new Map(parsed.order.map((id: string, idx: number) => [id, idx]));
            const sorted = [...sections].sort((a, b) => {
              const aIdx = orderMap.get(a.id) ?? Infinity;
              const bIdx = orderMap.get(b.id) ?? Infinity;
              return (aIdx as number) - (bIdx as number);
            });
            // Only use sorted order if all current sections are in the saved order
            const allInOrder = sections.every(s => orderMap.has(s.id));
            if (allInOrder && sorted.length === sections.length) {
              setLocalSections(sorted);
            } else {
              // If new folders were added, append them to the end
              const newFolders = sections.filter(s => !orderMap.has(s.id));
              setLocalSections([...sorted, ...newFolders]);
            }
          } else {
            setLocalSections(sections);
          }
        } catch (e) {
          console.error('Failed to apply saved order:', e);
          setLocalSections(sections);
        }
      } else {
        setLocalSections(sections);
      }
    }
  }, [sections, STORAGE_KEY]);

  useEffect(() => {
    if (JSON.stringify(localLists) !== JSON.stringify(lists)) {
      setLocalLists(lists);
    }
  }, [lists]);

  // Split sections into above/below separator
  const sectionsAbove = useMemo(() => {
    if (separatorIndex < 0) return [];
    return localSections.slice(0, separatorIndex);
  }, [localSections, separatorIndex]);

  const sectionsBelow = useMemo(() => {
    if (separatorIndex < 0) return localSections;
    return localSections.slice(separatorIndex);
  }, [localSections, separatorIndex]);

  // Expanded/collapsed (files) - initialize from database only once
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  
  useEffect(() => {
    if (rawFolders.length > 0 && Object.keys(expanded).length === 0) {
      const initial: Record<string, boolean> = {};
      rawFolders.forEach(folder => {
        initial[folder.id] = true; // All folders open by default
      });
      setExpanded(initial);
    }
  }, [rawFolders, expanded]);

  // Drag & drop state (files)
  const [dragState, setDragState] = useState<any>(null);
  const [dragOverState, setDragOverState] = useState<any>(null);
  const [sectionDragId, setSectionDragId] = useState<string | null>(null);
  const [sectionDropIndex, setSectionDropIndex] = useState(-1);
  const [sectionDropSide, setSectionDropSide] = useState<'above' | 'below' | null>(null);
  const [separatorDragging, setSeparatorDragging] = useState(false);

  // Selection / editing (files)
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<any>(null);

  // File upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetFolderId, setUploadTargetFolderId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState<Array<{
    name: string;
    progress: number;
    status: 'uploading' | 'done' | 'error';
  }>>([]);

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
  const { data: drawingVersions, isLoading: wbLoading, error: wbError } = useDrawingVersions(projectId);
  const updateDrawingScale = useUpdateDrawingScale();
  const createDrawingPage = useCreateDrawingPage();
  const createDrawingVersion = useCreateDrawingVersion(projectId);
  const deleteDrawingVersion = useDeleteDrawingVersion();
  const deleteDrawingPage = useDeleteDrawingPage();
  const updateDrawingVersion = useUpdateDrawingVersion();
  const updateDrawingPageName = useUpdateDrawingPageName();
  
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
    
    // Update UI optimistically
    setLocalLists((prev) => ({ ...prev, [fromList]: prev[fromList].filter((i) => i.id !== itemId) }));
    setLocalLists((prev) => {
      const target = [...(prev[listId] || [])];
      const insertIndex = dragOverState?.position === "above" ? index : index + 1;
      target.splice(insertIndex, 0, item);
      return { ...prev, [listId]: target };
    });
    
    // If moving to a different folder, update the database
    if (fromList !== listId) {
      moveFile.mutate({
        fileId: itemId,
        newFolderId: listId
      });
    }
    
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
  
  const handleSectionDragOver = (index: number, isAboveSeparator: boolean, e: any) => {
    if (!sectionDragId) return;
    e.preventDefault();
    e.stopPropagation();
    
    // Simple section drop - no separator detection needed
    const actualIndex = isAboveSeparator ? index : sectionsAbove.length + index;
    setSectionDropIndex(actualIndex);
    setSectionDropSide(null);
  };
  
  const handleSectionDrop = (e: any) => {
    if (!sectionDragId || sectionDropIndex < 0) return;
    e.preventDefault();
    e.stopPropagation();
    
    const dragIndex = localSections.findIndex((s) => s.id === sectionDragId);
    if (dragIndex === -1) return;
    
    // Initialize separator if needed
    let newSeparatorIndex = separatorIndex;
    if (newSeparatorIndex < 0 && localSections.length > 0) {
      newSeparatorIndex = Math.floor(localSections.length / 2);
    }
    
    setLocalSections((prev) => {
      const next = [...prev];
      const [dragged] = next.splice(dragIndex, 1);
      
      // Adjust drop index if we dragged from before the drop position
      const adjustedDropIndex = dragIndex < sectionDropIndex ? sectionDropIndex - 1 : sectionDropIndex;
      next.splice(adjustedDropIndex, 0, dragged);
      
      // Update separator index to maintain relative position
      // If we moved a folder across the separator, adjust separator position
      if (newSeparatorIndex >= 0) {
        if (dragIndex < newSeparatorIndex && adjustedDropIndex >= newSeparatorIndex) {
          // Moved folder from above to below separator
          newSeparatorIndex = newSeparatorIndex - 1;
        } else if (dragIndex >= newSeparatorIndex && adjustedDropIndex < newSeparatorIndex) {
          // Moved folder from below to above separator
          newSeparatorIndex = newSeparatorIndex + 1;
        }
      }
      
      // Save arrangement to localStorage for separator position
      setSeparatorIndex(newSeparatorIndex);
      saveFolderArrangement(next, newSeparatorIndex);
      
      // Persist folder order to database
      // For now, we just reorder locally - in a real app, you'd batch update all folder positions
      reorderFoldersMutation.mutate({
        folderId: sectionDragId,
        newIndex: adjustedDropIndex,
        parentFolderId: null
      });
      
      return next;
    });
    
    setSectionDragId(null);
    setSectionDropIndex(-1);
    setSectionDropSide(null);
  };
  
  const handleSectionDragEnd = () => {
    setSectionDragId(null);
    setSectionDropIndex(-1);
    setSectionDropSide(null);
  };
  
  // Separator dragging handlers
  const handleSeparatorMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSeparatorDragging(true);
    
    const container = e.currentTarget.closest('.px-2\\.5')?.parentElement;
    if (!container) return;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const sections = container.querySelectorAll('[data-section-index]');
      let newIndex = separatorIndex;
      
      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        const indexAttr = section.getAttribute('data-section-index');
        if (indexAttr && moveEvent.clientY >= rect.top && moveEvent.clientY <= rect.bottom) {
          const midY = rect.top + rect.height / 2;
          const idx = parseInt(indexAttr, 10);
          newIndex = moveEvent.clientY < midY ? idx : idx + 1;
        }
      });
      
      // Clamp to valid range
      newIndex = Math.max(0, Math.min(localSections.length, newIndex));
      if (newIndex !== separatorIndex) {
        setSeparatorIndex(newIndex);
      }
    };
    
    const handleMouseUp = () => {
      setSeparatorDragging(false);
      saveFolderArrangement(localSections, separatorIndex);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  // ---- Files: upload handlers ----
  const handleUploadClick = (folderId: string) => {
    setUploadTargetFolderId(folderId);
    fileInputRef.current?.click();
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !uploadTargetFolderId) return;

    const fileArray = Array.from(files);
    setIsUploading(true);
    
    // Initialize upload tracking
    setUploadingFiles(fileArray.map(f => ({
      name: f.name,
      progress: 0,
      status: 'uploading' as const
    })));

    try {
      await uploadFiles.mutateAsync({
        files: fileArray,
        folder_id: uploadTargetFolderId
      });
      
      // Mark all as done
      setUploadingFiles(prev => prev.map(f => ({
        ...f,
        progress: 100,
        status: 'done' as const
      })));
      
      // Clear after 2 seconds
      setTimeout(() => {
        setUploadingFiles([]);
      }, 2000);
    } catch (error) {
      // Mark all as error
      setUploadingFiles(prev => prev.map(f => ({
        ...f,
        status: 'error' as const
      })));
    } finally {
      setIsUploading(false);
      setUploadTargetFolderId(null);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFolderDragOver = (e: React.DragEvent, folderId: string) => {
    // Check if dragging files from OS (not internal drag)
    if (dragState) return; // Internal drag, ignore
    
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleFolderDragEnter = (e: React.DragEvent, folderId: string) => {
    // Only track OS file drags (not internal drag operations)
    if (dragState) return;
    
    // Check if dragging files (not other elements)
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      e.stopPropagation();
      setDragOverFolderId(folderId);
    }
  };

  const handleFolderDragLeave = (e: React.DragEvent, folderId: string) => {
    if (dragState) return;
    
    // Only clear if actually leaving this specific folder
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!e.currentTarget.contains(relatedTarget)) {
      setDragOverFolderId(null);
    }
  };

  const handleFolderDrop = async (e: React.DragEvent, folderId: string) => {
    // Check if dragging files from OS
    if (dragState) return; // Internal drag, handled elsewhere
    
    e.preventDefault();
    e.stopPropagation();
    
    // Clear drag-over state
    setDragOverFolderId(null);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    setIsUploading(true);
    
    // Initialize upload tracking
    setUploadingFiles(files.map(f => ({
      name: f.name,
      progress: 0,
      status: 'uploading' as const
    })));

    try {
      await uploadFiles.mutateAsync({
        files,
        folder_id: folderId
      });
      
      // Mark all as done
      setUploadingFiles(prev => prev.map(f => ({
        ...f,
        progress: 100,
        status: 'done' as const
      })));
      
      // Clear after 2 seconds
      setTimeout(() => {
        setUploadingFiles([]);
      }, 2000);
    } catch (error) {
      // Mark all as error
      setUploadingFiles(prev => prev.map(f => ({
        ...f,
        status: 'error' as const
      })));
    } finally {
      setIsUploading(false);
    }
  };

  // ---- Files: helpers ----
  const getFilteredItems = (listId: string) => {
    const items = localLists[listId] || [];
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.name.toLowerCase().includes(q));
  };

  // ---- Files: renderers ----
  const renderSection = (section: any, index: number, isAboveSeparator: boolean) => {
    const { id, title } = section;
    const isOpen = query.trim() ? true : !!expanded[id];
    const isEditing = editing?.type === "section" && editing?.list === id;
    const items = getFilteredItems(id);
    const actualIndex = isAboveSeparator ? index : sectionsAbove.length + index;

    return (
      <div key={id} className="relative mb-1" data-section-index={actualIndex}>
        {sectionDragId && sectionDropIndex === actualIndex && !sectionDropSide && (
          <div className="absolute left-2 right-2 -top-1 h-0.5 bg-blue-400 rounded" />
        )}
        <div 
          className={`transition-all ${dragOverFolderId === id ? 'bg-blue-50 ring-2 ring-blue-400 ring-inset rounded-lg' : ''}`}
          onDragEnter={(e) => handleFolderDragEnter(e, id)}
          onDragLeave={(e) => handleFolderDragLeave(e, id)}
          onDragOver={(e) => {
            handleSectionDragOver(index, isAboveSeparator, e);
            handleFolderDragOver(e, id);
          }} 
          onDrop={(e) => {
            handleSectionDrop(e);
            handleFolderDrop(e, id);
          }}
        >
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
              const trimmedName = name.trim();
              if (trimmedName && trimmedName !== title) {
                renameFolder.mutate({
                  folderId: id,
                  newName: trimmedName
                });
              }
              setLocalSections((prev) => prev.map((s) => (s.id === id ? { ...s, title: trimmedName || title } : s)));
              setEditing(null);
            }}
            draggable={true}
            onDragStart={(e: any) => handleSectionDragStart(id, e)}
            onDragOver={() => {}}
            onDrop={() => {}}
            onUpload={() => handleUploadClick(id)}
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
                      const trimmedName = name.trim();
                      if (trimmedName && trimmedName !== item.name) {
                        renameFile.mutate({
                          fileId: item.id,
                          newName: trimmedName
                        });
                      }
                      setLocalLists((prev) => ({
                        ...prev,
                        [id]: prev[id].map((i) => (i.id === item.id ? { ...i, name: trimmedName || item.name } : i)),
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
  
  // Separator component - now draggable
  const SeparatorLine = () => {
    if (separatorIndex < 0) return null;
    
    return (
      <div
        className={`relative my-3 mx-2 transition-all cursor-ns-resize select-none ${
          separatorDragging 
            ? 'h-1 bg-blue-400' 
            : 'h-px bg-slate-300 border-t border-slate-200 hover:h-0.5 hover:bg-slate-400'
        }`}
        onMouseDown={handleSeparatorMouseDown}
        title="Drag to move separator"
      >
        {separatorDragging && (
          <div className="absolute inset-0 flex items-center justify-center -mt-1">
            <div className="px-2 py-0.5 text-[10px] font-medium rounded shadow-sm bg-blue-400 text-white">
              Separator
            </div>
          </div>
        )}
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
      <div key={id} className="relative mb-1">
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
              const trimmedName = name.trim();
              if (trimmedName && trimmedName !== title) {
                updateDrawingVersion.mutate({
                  drawingId: id,
                  projectId,
                  versionNumber: trimmedName
                });
              }
              setWbEditing(null);
            }}
            draggable={false}
            onDragStart={(e: any) => handleWbSectionDragStart(id, e)}
            onDragOver={() => {}}
            onDrop={() => {}}
            onUpload={() => {
              createDrawingPage.mutate({
                drawingId: id,
                projectId
              });
            }}
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
                      const trimmedName = name.trim();
                      if (trimmedName && trimmedName !== item.name) {
                        updateDrawingPageName.mutate({
                          pageId: item.id,
                          projectId,
                          name: trimmedName
                        });
                      }
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

  // Update URL when tab changes
  const handleTabChange = (newTab: typeof tab) => {
    setTab(newTab);
    setSearchParams(prev => {
      const params = new URLSearchParams(prev);
      params.set('projectTab', newTab);
      return params;
    });
  };

  return (
    <div className="h-full w-full flex flex-col">
      <HiddenScrollCSS />
      
      {/* Tab buttons header - always visible, part of normal flow */}
      <div className="sticky top-0 z-10 h-10 px-2.5 border-b border-slate-200 bg-white flex items-center gap-2 shrink-0">
        <button
          className={`h-7 w-7 rounded-md opacity-70 hover:opacity-100 transition-opacity grid place-items-center border ${tab === "files" ? "border-slate-500 bg-white" : "border-transparent hover:bg-slate-100"}`}
          aria-label="Files"
          title="Files"
          onClick={() => handleTabChange("files")}
        >
          <FolderClosed className="h-4 w-4 text-slate-700" />
        </button>
        <button
          className={`h-7 w-7 rounded-md opacity-70 hover:opacity-100 transition-opacity grid place-items-center border ${tab === "whiteboards" ? "border-slate-500 bg-white" : "border-transparent hover:bg-slate-100"}`}
          aria-label="Whiteboards"
          title="Whiteboards"
          onClick={() => handleTabChange("whiteboards")}
        >
          <BookOpen className="h-4 w-4 text-slate-700" />
        </button>
        <button
          className={`h-7 w-7 rounded-md opacity-70 hover:opacity-100 transition-opacity grid place-items-center border ${tab === "info" ? "border-slate-500 bg-white" : "border-transparent hover:bg-slate-100"}`}
          aria-label="Project Info"
          title="Project Info"
          onClick={() => handleTabChange("info")}
        >
          <Info className="h-4 w-4 text-slate-700" />
        </button>
        <button
          className={`h-7 w-7 rounded-md opacity-70 hover:opacity-100 transition-opacity grid place-items-center border ${tab === "settings" ? "border-slate-500 bg-white" : "border-transparent hover:bg-slate-100"} ml-auto`}
          aria-label="Project Settings"
          title="Project Settings"
          onClick={() => handleTabChange("settings")}
        >
          <Settings2 className="h-4 w-4 text-slate-700" />
        </button>
      </div>
      
      {/* Content area - flex-1 to take remaining height */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === "info" ? (
          <ProjectInfoNavigation
            projectId={projectId}
            workspaceId={currentWorkspaceId || ''}
            onClose={() => handleTabChange('files')}
          />
        ) : (
          <div className="h-full w-full overflow-y-auto no-scrollbar text-[11px] bg-[#fcfcfc]">
            {/* Files: search + tree */}
            {tab === "files" && (
          <>
            {(foldersLoading || filesLoading) ? (
              <div className="px-2.5 py-4 text-[11px] text-slate-500 text-center">
                Loading...
              </div>
            ) : (
              <>
                <div className="sticky top-0 z-10 h-9 px-2.5 border-b border-slate-200 bg-[#fcfcfc] flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search"
                      className="w-full h-7 pl-6 pr-2 text-[11px] bg-white border border-slate-300 rounded-[6px] focus:outline-none"
                    />
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileInputChange}
                  className="hidden"
                  aria-label="Upload files"
                />

                <div className="px-2.5 pt-1.5 pb-2" onDragEnd={handleItemDragEnd}>
                  <SectionHeader
                    title={projectName}
                    open={true}
                    onToggle={() => {}}
                    onContextMenu={(e: any) => e.preventDefault()}
                    icon={<FolderClosed className="h-3 w-3 text-slate-700" />}
                  />
                  <div className="mt-1" onDragEnd={handleSectionDragEnd}>
                    {/* Sections above separator */}
                    {!query.trim() && separatorIndex >= 0 && sectionsAbove.map((s, idx) => renderSection(s, idx, true))}
                    
                    {/* Separator line */}
                    {!query.trim() && separatorIndex >= 0 && <SeparatorLine />}
                    
                    {/* Sections below separator */}
                    {!query.trim() && separatorIndex >= 0 && sectionsBelow.map((s, idx) => renderSection(s, idx, false))}
                    
                    {/* Fallback: if no separator yet, show all sections normally */}
                    {!query.trim() && separatorIndex < 0 && localSections.map((s, idx) => renderSection(s, idx, true))}
                    
                    {/* When searching, show filtered results */}
                    {query.trim() && (query ? filterSections(query, localSections, localLists) : localSections).map((s, idx) => renderSection(s, idx, true))}
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
                    {menu.target?.type === "item" && (
                      <button
                        className="block w-full px-3 py-1.5 text-left text-[11px] text-slate-800 hover:bg-slate-100 border-t border-slate-100"
                        onClick={async () => {
                          if (!menu.target?.id) return;
                          const file = rawFiles.find(f => f.id === menu.target.id);
                          if (file && file.storage_path && file.filename) {
                            try {
                              await downloadProjectFile(file.storage_path, file.filename);
                              toast({
                                title: 'Download started',
                                description: `Downloading ${file.filename}`,
                              });
                            } catch (error: any) {
                              toast({
                                title: 'Download failed',
                                description: error?.message || 'Failed to download file',
                                variant: 'destructive',
                              });
                            }
                          }
                          setMenu((m: any) => ({ ...m, show: false }));
                        }}
                      >
                        Download
                      </button>
                    )}
                    {menu.target?.type === "section" && (
                      <button
                        className="block w-full px-3 py-1.5 text-left text-[11px] text-slate-800 hover:bg-slate-100 border-t border-slate-100"
                        onClick={() => {
                          if (!menu.target?.list) return;
                          handleUploadClick(menu.target.list);
                          setMenu((m: any) => ({ ...m, show: false }));
                        }}
                      >
                        Upload Files…
                      </button>
                    )}
                    <button
                      className="block w-full px-3 py-1.5 text-left text-[11px] text-red-600 hover:bg-red-50 border-t border-slate-100"
                      onClick={() => {
                        if (!menu.target) return;
                        if (menu.target.type === "item") {
                          // Delete file with database mutation
                          deleteFile.mutate({
                            fileId: menu.target.id,
                            projectId
                          });
                          
                          // Clear selection if deleting currently selected file
                          if (selectedId === menu.target.id) {
                            setSelectedId(null);
                          }
                        } else {
                          // Delete folder with database mutation
                          deleteFolder.mutate({
                            folderId: menu.target.list,
                            projectId
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
            <div className="sticky top-0 z-10 h-9 px-2.5 border-b border-slate-200 bg-[#fcfcfc] flex items-center">
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
            ) : wbError ? (
              <div className="px-2.5 py-4 text-[11px] text-red-600 text-center">
                Error loading whiteboards. Please refresh the page.
                {process.env.NODE_ENV === 'development' && (
                  <div className="mt-1 text-[10px] text-slate-500">
                    {String(wbError)}
                  </div>
                )}
              </div>
            ) : (
              <div 
                className={selectedWB ? "hidden px-2.5 pt-1.5 pb-2" : "px-2.5 pt-1.5 pb-2"} 
                onDragEnd={handleWbItemDragEnd}
                onContextMenu={(e: any) => {
                  // Only show context menu if clicking on the background (not on a section/item)
                  if (e.target.closest('[data-section-index]') || e.target.closest('.group')) {
                    return; // Let section/item handle their own context menu
                  }
                  e.preventDefault();
                  e.stopPropagation();
                  setWbMenu({ show: true, x: e.clientX, y: e.clientY, target: { type: "background" } });
                }}
              >
                <SectionHeader
                  title="Whiteboards"
                  open={true}
                  onToggle={() => {}}
                  onContextMenu={(e: any) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setWbMenu({ show: true, x: e.clientX, y: e.clientY, target: { type: "background" } });
                  }}
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
                {/* Show rename/delete only if clicking on a specific item/section */}
                {wbMenu.target && wbMenu.target.type !== "background" && (
                  <>
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
                    {wbMenu.target?.type === "section" && (
                      <button
                        className="block w-full px-3 py-1.5 text-left text-[11px] text-slate-800 hover:bg-slate-100 border-t border-slate-100"
                        onClick={() => {
                          if (!wbMenu.target?.list) return;
                          createDrawingPage.mutate({ 
                            drawingId: wbMenu.target.list,
                            projectId 
                          });
                          setWbMenu((m: any) => ({ ...m, show: false }));
                        }}
                      >
                        New Page…
                      </button>
                    )}
                    <button
                      className="block w-full px-3 py-1.5 text-left text-[11px] text-red-600 hover:bg-red-50 border-t border-slate-100"
                      onClick={() => {
                        if (!wbMenu.target) return;
                        
                        if (wbMenu.target.type === "item") {
                          // Delete drawing page
                          deleteDrawingPage.mutate({
                            pageId: wbMenu.target.id,
                            projectId
                          });
                          
                          // Clear selection if deleting currently selected page
                          if (wbSelectedId === wbMenu.target.id) {
                            setWbSelectedId(null);
                            setSelectedWB(null);
                          }
                        } else if (wbMenu.target.type === "section") {
                          // Delete drawing version
                          deleteDrawingVersion.mutate({
                            drawingId: wbMenu.target.list,
                            projectId
                          });
                          
                          // Clear selection if deleting version containing selected page
                          if (selectedWB?.versionId === wbMenu.target.list) {
                            setWbSelectedId(null);
                            setSelectedWB(null);
                          }
                        }
                        
                        setWbMenu((m: any) => ({ ...m, show: false }));
                      }}
                    >
                      Delete
                    </button>
                  </>
                )}
                {/* Show "New Version" for background clicks or always show at bottom */}
                <button
                  className={`block w-full px-3 py-1.5 text-left text-[11px] text-slate-800 hover:bg-slate-100 ${wbMenu.target && wbMenu.target.type !== "background" ? "border-t border-slate-100" : ""}`}
                  onClick={() => {
                    if (!currentWorkspaceId) return;
                    
                    // Generate next version number
                    const existingVersions = drawingVersions || [];
                    const versionNumbers = existingVersions
                      .map(v => {
                        const match = v.version_number.match(/^v?(\d+)$/i);
                        return match ? parseInt(match[1], 10) : 0;
                      })
                      .filter(n => n > 0);
                    
                    const nextVersionNumber = versionNumbers.length > 0 
                      ? `v${Math.max(...versionNumbers) + 1}`
                      : 'v1';
                    
                    createDrawingVersion.mutate({
                      versionNumber: nextVersionNumber,
                      workspaceId: currentWorkspaceId
                    });
                    
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
                    
                    {/* Arrow Counter - always enabled, button toggles stats visibility */}
                    <div className="mb-4">
                      <div className="text-[10px] text-slate-600 mb-1.5">Arrow Counter</div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => onToggleArrowStats?.()}
                          className={`flex-1 h-10 rounded-lg border flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
                            showArrowStats
                              ? 'border-purple-400 bg-purple-50 text-purple-700'
                              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {showArrowStats && (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                          {showArrowStats ? 'Hide Values' : 'Show Values'}
                        </button>
                        <button
                          onClick={() => onCalibrate?.()}
                          className="px-4 h-10 rounded-lg border border-blue-400 bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors whitespace-nowrap"
                          title="Set scale by calibrating with a known measurement"
                        >
                          Set Scale
                        </button>
                      </div>
                      {inchesPerSceneUnit && (
                        <div className="mt-2 text-[10px] text-slate-500">
                          Current scale: {(1 / inchesPerSceneUnit).toFixed(3)} px/inch
                        </div>
                      )}
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
                    {showArrowStats && arrowStats && arrowStats.count > 0 && (
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

        {/* Settings tab */}
        {tab === "settings" && (
          <div className="px-2.5 pt-1.5 pb-2">
            <div className="space-y-4">
              <div>
                <div className="text-[11px] font-medium text-slate-700 mb-2">Project Settings</div>
                <div className="text-[10px] text-slate-500 mb-4">{projectName}</div>
              </div>
              
              <div className="pt-4 border-t border-slate-200">
                <Button
                  variant="destructive"
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="w-full h-8 text-[11px]"
                >
                  Delete Project Permanently
                </Button>
                <div className="mt-2 text-[10px] text-slate-500 text-center">
                  This action cannot be undone
                </div>
              </div>
            </div>
          </div>
        )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project Permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the project "{projectName}" and all of its data including files, tasks, whiteboards, and all related information.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                hardDeleteProjectMutation.mutate(projectId, {
                  onSuccess: () => {
                    setDeleteConfirmOpen(false);
                    // Navigate to projects list or home, then refresh
                    if (currentWorkspaceId) {
                      navigateToWorkspace("/projects");
                    } else {
                      navigate('/');
                    }
                    // Refresh the page to update the project list
                    window.location.reload();
                  },
                });
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upload Progress Bar */}
      {uploadingFiles.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 bg-background border-t border-border shadow-lg">
          <div className="px-3 py-2 max-h-32 overflow-y-auto">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-foreground">
                Uploading {uploadingFiles.length} file{uploadingFiles.length > 1 ? 's' : ''}...
              </span>
              {uploadingFiles.every(f => f.status === 'done') && (
                <span className="text-[10px] text-green-600">✓ Complete</span>
              )}
            </div>
            {uploadingFiles.map((file, idx) => (
              <div key={idx} className="mb-1.5 last:mb-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] text-muted-foreground truncate flex-1 mr-2">
                    {file.name}
                  </span>
                  {file.status === 'uploading' && (
                    <span className="text-[9px] text-blue-600">Uploading...</span>
                  )}
                  {file.status === 'done' && (
                    <span className="text-[9px] text-green-600">✓</span>
                  )}
                  {file.status === 'error' && (
                    <span className="text-[9px] text-red-600">Failed</span>
                  )}
                </div>
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      file.status === 'error' ? 'bg-red-500' :
                      file.status === 'done' ? 'bg-green-500' :
                      'bg-blue-500'
                    }`}
                    style={{ 
                      width: file.status === 'uploading' ? '60%' : '100%',
                      animation: file.status === 'uploading' ? 'pulse 1.5s ease-in-out infinite' : 'none'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useMemo, useEffect, useRef, useCallback, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { 
  Folder, 
  Search, 
  Grid, 
  List,
  File,
  FileText,
  Image as ImageIcon,
  Minus,
  Plus,
  ChevronUp
} from 'lucide-react';
import { MOCK_FILES } from '@/data/mock';
import { useProjectFolders, useProjectFiles as useProjectFilesApi, useCreateFolder } from '@/lib/api/hooks/useProjectFiles';
import { supabase } from '@/integrations/supabase/client';

// Utility: format bytes to human readable (simplistic)
function formatFileSize(bytes: number) {
  if (!bytes && bytes !== 0) return '—';
  const thresh = 1024;
  if (bytes < thresh) return bytes + ' B';
  const units = ['KB','MB','GB','TB'];
  let u = -1; let value = bytes;
  do { value /= thresh; ++u; } while (value >= thresh && u < units.length - 1);
  return value.toFixed(value >= 10 ? 0 : 1) + ' ' + units[u];
}

function ensureUniqueNameInList(baseName: string, phaseName: string, folderName: string, existing: any[]) {
  let name = baseName;
  const extIdx = baseName.lastIndexOf('.');
  const stem = extIdx > 0 ? baseName.slice(0, extIdx) : baseName;
  const ext = extIdx > 0 ? baseName.slice(extIdx) : '';
  let counter = 1;
  const normalizedPhase = phaseName.toLowerCase();
  const normalizedFolder = folderName.toLowerCase();
  while (existing.some(item => item.phase?.toLowerCase() === normalizedPhase && item.folder?.toLowerCase() === normalizedFolder && item.name === name)) {
    name = `${stem} (${counter++})${ext}`;
  }
  return name;
}

const FileIcon = ({ fileName, className }: { fileName: string; className: string }) => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  if (extension === 'pdf') {
    return <FileText className={className} />;
  } else if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(extension || '')) {
    return <ImageIcon className={className} />;
  }
  
  return <File className={className} />;
};

// Floating (portal) dropdown to escape clipping/overflow contexts
const FloatingSearchDropdown = ({ 
  anchorRef, 
  results, 
  onSelect, 
  onClose: _onClose, 
  searchQuery, 
  keyboardSelectedIndex, 
  placement = 'up', 
  darkMode 
}: {
  anchorRef: RefObject<HTMLElement>;
  results: any[];
  onSelect: (result: any) => void;
  onClose: () => void;
  searchQuery: string;
  keyboardSelectedIndex: number;
  placement?: 'up' | 'down';
  darkMode: boolean;
}) => {
  const [coords, setCoords] = useState<{left: number; width: number; top: number; placement: string} | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const recalc = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    setCoords({
      left: r.left,
      width: r.width,
      // For 'up' we anchor to the top edge then translate -100%
      top: placement === 'up' ? r.top - 4 : r.bottom + 4,
      placement
    });
  }, [anchorRef, placement]);

  useEffect(() => {
    recalc();
    window.addEventListener('resize', recalc);
    window.addEventListener('scroll', recalc, true);
    const id = setInterval(recalc, 750);
    return () => {
      window.removeEventListener('resize', recalc);
      window.removeEventListener('scroll', recalc, true);
      clearInterval(id);
    };
  }, [recalc]);

  if (!results.length || !coords) return null;

  const body = (
    <div
      ref={dropdownRef}
      data-search-dropdown
      style={{
        position: 'fixed',
        left: coords.left,
        top: coords.top,
        width: coords.width,
        zIndex: 100000,
        transform: coords.placement === 'up' ? 'translateY(-100%)' : 'translateY(0)'
      }}
      className="bg-popover border border-border rounded-md shadow-xl max-h-96 overflow-y-auto custom-scrollbar"
    >
      <div className="px-3 py-1.5 text-[11px] text-muted-foreground bg-muted border-b border-border/60">
        {results.length} result{results.length !== 1 ? 's' : ''} for "{searchQuery}"
      </div>
      {results.map((result, index) => {
        const isKeyboardSelected = keyboardSelectedIndex === index;
        return (
          <div
            key={`${result.type}-${result.name}-${index}`}
            className={`flex items-center px-3 py-1 cursor-pointer border-b border-border/60 last:border-b-0 ${
              isKeyboardSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/60'
            }`}
            onClick={() => onSelect(result)}
          >
            <FileIcon
              fileName={result.name}
              className="h-4 w-4 mr-3 flex-shrink-0 text-muted-foreground"
            />
            <div className="flex-1 min-w-0">
              <div className="text-[11px] truncate text-foreground">{result.name}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
  return createPortal(body, document.body);
};

const SidebarItem = ({ item, selected, keyboardFocused, onClick, darkMode }: {
  item: any;
  selected: boolean;
  keyboardFocused: boolean;
  onClick: () => void;
  darkMode: boolean;
}) => {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-2.5 h-7 flex items-center gap-2 rounded-md transition-colors focus:outline-none active:transform-none border-0 ${
        selected ? 'bg-primary text-primary-foreground' : 
        keyboardFocused ? 'bg-accent/50 text-foreground' : 
        'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
      }`}
      data-selected={selected ? 'true' : 'false'}
      data-focus={keyboardFocused ? 'true' : 'false'}
    >
      <Folder className="h-3.5 w-3.5 flex-shrink-0" />
      <span className={`truncate text-[11px] ${selected ? 'font-medium' : ''}`}>{item.name}</span>
    </button>
  );
};

const FolderList = ({ phase, folders, selectedFolder, keyboardFocused, keyboardSelectedIndex, onFolderClick, allFiles, darkMode, onCreateFolder, onFolderReorder, onUploadFiles }: {
  phase: any;
  folders: any[];
  selectedFolder: any;
  keyboardFocused: boolean;
  keyboardSelectedIndex: number;
  onFolderClick: (folder: any) => void;
  allFiles: any[];
  darkMode: boolean;
  onCreateFolder?: (folderName: string) => void;
  onFolderReorder?: (draggedFolder: any, targetFolder: any) => void;
  onUploadFiles?: (fileList: File[], options?: { phaseName?: string; folderName?: string; selectFolder?: boolean }) => void;
}) => {
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const handleMoveFolderUp = useCallback((folder: any) => {
    if (!onFolderReorder || !folder) return;
    const currentIndex = folders.findIndex(f => f.name === folder.name);
    if (currentIndex <= 0) return;
    const targetFolder = folders[currentIndex - 1];
    if (targetFolder) {
      onFolderReorder(folder, targetFolder);
    }
  }, [folders, onFolderReorder]);

  const formatFolderDate = (date: string) => {
    if (!date) return '—';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    const month = d.toLocaleString('en-US', { month: 'short' });
    const day = d.getDate();
    const year = String(d.getFullYear()).slice(-2);
    return `${month} ${day}, ${year}`;
  };

  const getMostRecentFileDate = (phaseName: string, folderName: string) => {
    if (!phaseName || !folderName) return '—';
    const folderFiles = (allFiles || []).filter(f => f.phase === phaseName && f.folder === folderName);
    if (!folderFiles.length) return '—';
    const mostRecent = folderFiles.reduce((acc, f) => {
      const d = new Date(f.modified);
      return (acc && acc.getTime() > d.getTime()) ? acc : d;
    }, null as Date | null);
    return formatFolderDate(mostRecent?.toISOString() || '');
  };

  const handleCreateFolderClick = () => {
    if (!phase) return;
    setIsCreatingFolder(true);
    setNewFolderName('');
    // Focus input after render
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSaveFolder = () => {
    if (newFolderName.trim() && onCreateFolder) {
      onCreateFolder(newFolderName.trim());
      setIsCreatingFolder(false);
      setNewFolderName('');
    }
  };

  const handleCancelFolder = () => {
    // Only cancel if there's no text entered
    if (!newFolderName.trim()) {
      setIsCreatingFolder(false);
      setNewFolderName('');
    } else {
      // If text was entered, save it
      handleSaveFolder();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveFolder();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsCreatingFolder(false);
      setNewFolderName('');
    }
  };

  // External folder drop handlers (for dragging folders from desktop)
  const [isExternalDragOver, setIsExternalDragOver] = useState(false);
  const externalDragCounterRef = useRef(0);
  
  const handleExternalDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    externalDragCounterRef.current += 1;
    setIsExternalDragOver(true);
  };

  const handleExternalDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleExternalDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    externalDragCounterRef.current = Math.max(0, externalDragCounterRef.current - 1);
    if (externalDragCounterRef.current === 0) {
      setIsExternalDragOver(false);
    }
  };

  const handleExternalDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    externalDragCounterRef.current = 0;
    setIsExternalDragOver(false);
    
    console.log('[FileExplorer] External drop detected')
    console.log('[FileExplorer] Phase:', phase)
    console.log('[FileExplorer] onCreateFolder available:', !!onCreateFolder)
    console.log('[FileExplorer] DataTransfer items:', e.dataTransfer?.items?.length)
    console.log('[FileExplorer] DataTransfer files:', e.dataTransfer?.files?.length)
    
    if (!phase || !onCreateFolder) {
      console.warn('[FileExplorer] Drop cancelled - no phase or onCreateFolder handler')
      return;
    }
    
    // Handle dropped items (folders and files)
    const items = e.dataTransfer?.items;
    const files = e.dataTransfer?.files;
    
    const createdFolderNames = new Set<string>();

    const tryCreateFolder = (folderName: string) => {
      const normalized = folderName.trim();
      if (!normalized) return null;
      const lower = normalized.toLowerCase();
      if (createdFolderNames.has(lower)) {
        return normalized;
      }
      const folderExists = folders.some(f => f.name.toLowerCase() === lower);
      if (!folderExists) {
        onCreateFolder(normalized);
      }
      createdFolderNames.add(lower);
      return normalized;
    };

    const readDirectoryFiles = async (directoryEntry: any): Promise<File[]> => {
      const collected: File[] = [];

      if (!directoryEntry?.createReader) {
        return collected;
      }

      const reader = directoryEntry.createReader();
      const readEntries = (): Promise<any[]> => new Promise((resolve, reject) => {
        reader.readEntries((batch: any[]) => resolve(batch), reject);
      });

      try {
        while (true) {
          const batch = await readEntries();
          if (!batch.length) break;
          await Promise.all(batch.map(async (entry: any) => {
            if (entry.isFile) {
              const file: File = await new Promise((resolve, reject) => entry.file(resolve, reject));
              collected.push(file);
            } else if (entry.isDirectory) {
              // Skip nested folders
            }
          }));
        }
      } catch (err) {
        // Failed to read directory entries
      }

      return collected;
    };

    const folderFilesMap = new Map<string, File[]>();

    if (items) {
      const itemArray = Array.from(items);
      await Promise.all(itemArray.map(async (item, index) => {
        if (item.kind === 'file') {
          const entry = item.webkitGetAsEntry?.();

          if (entry?.isDirectory) {
            const folderName = entry.name;
            const filesFromDir = await readDirectoryFiles(entry);
            if (!filesFromDir.length) {
              return;
            }

            const normalizedName = tryCreateFolder(folderName);
            if (!normalizedName) return;

            const existing = folderFilesMap.get(normalizedName) || [];
            existing.push(...filesFromDir);
            folderFilesMap.set(normalizedName, existing);
          }
        }
      }));
    }
    
    if ((!items || folderFilesMap.size === 0) && files && files.length > 0) {
      Array.from(files).forEach((file, index) => {
        const relativePath = (file as any).webkitRelativePath as string | undefined;
        if (relativePath) {
          const segments = relativePath.split(/[\\/]/).filter(Boolean);
          if (segments.length > 2) {
            return;
          }
          const folderName = segments[0] || file.name;
          const normalizedName = tryCreateFolder(folderName);
          if (normalizedName) {
            const existing = folderFilesMap.get(normalizedName) || [];
            existing.push(file);
            folderFilesMap.set(normalizedName, existing);
          }
        }
      });
    }

    if (folderFilesMap.size > 0) {
      const folderNames = Array.from(folderFilesMap.keys());
      folderNames.forEach((folderName, index) => {
        const fileList = folderFilesMap.get(folderName) || [];
        if (fileList.length && onUploadFiles) {
          onUploadFiles(fileList, {
            phaseName: phase.name,
            folderName,
            selectFolder: index === folderNames.length - 1
          });
        }
      });
    }
  };

  return (
    <div 
      className={`flex flex-col flex-1 overflow-hidden bg-card ${isExternalDragOver ? 'ring-2 ring-primary ring-opacity-50' : ''}`}
      onDragEnter={handleExternalDragEnter}
      onDragOver={handleExternalDragOver}
      onDragLeave={handleExternalDragLeave}
      onDrop={handleExternalDrop}
    >
  <div className="flex items-center h-7 border-b border-border bg-muted text-[11px] text-muted-foreground select-none pl-3 pr-2">
        <div className="flex-[2] pr-2">Folder</div>
        <div className="flex-[1] hidden lg:block">Modified</div>
        <div className="h-5 w-5 flex items-center justify-center">
          {phase && (
            <button
              onClick={handleCreateFolderClick}
              className="h-5 w-5 flex items-center justify-center rounded hover:bg-accent/50 transition-colors text-muted-foreground hover:text-foreground"
              title="Create new folder"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar relative">
        {/* External drag overlay */}
        {isExternalDragOver && (
          <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary/60 flex items-center justify-center text-primary z-10 pointer-events-none">
            <div className="text-center">
              <div className="text-[11px] font-medium leading-normal tracking-normal text-primary">
                Drop folders here to add them
              </div>
            </div>
          </div>
        )}
        
            {!phase ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-[11px]">
            Select a phase
          </div>
        ) : (
          <>
            {/* New folder input row */}
            {isCreatingFolder && (
        <div className="flex items-center h-7 border-b border-border/50 bg-card pl-3 pr-3">
                <div className="flex-[2] pr-2 min-w-0 flex items-center">
                  <Folder className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onBlur={handleCancelFolder}
                    onKeyDown={handleKeyDown}
                    className="flex-1 bg-transparent outline-none text-[11px] border-none focus:ring-0 p-0 text-foreground placeholder:text-muted-foreground"
                    placeholder="New folder name..."
                    autoFocus
                  />
                </div>
                <span className="flex-[1] text-[11px] text-muted-foreground tabular-nums hidden lg:block">
                  —
                </span>
                <div className="h-5 w-5"></div>
              </div>
            )}
            
            {/* Existing folders */}
            {folders.length === 0 && !isCreatingFolder ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-[11px]">
                No folders found
              </div>
            ) : (
              folders.map((f, index) => {
            const isSelected = selectedFolder && selectedFolder.name === f.name;
            const isKeyboardFocused = keyboardFocused && keyboardSelectedIndex === index;
            const isFirstFolder = index === 0;
            return (
              <div
                key={f.name}
                className={`group flex items-center h-7 border-b border-border/50 pl-3 pr-3 cursor-pointer transition-colors ${
                  isSelected ? 'bg-primary' : 
                  isKeyboardFocused ? 'bg-accent/50' : 
                  'hover:bg-accent/50'
                }`}
                onClick={() => onFolderClick(f)}
                data-selected={isSelected ? 'true' : 'false'}
                data-focus={isKeyboardFocused ? 'true' : 'false'}
                tabIndex={0}
              >
                <div className={`flex items-center flex-[2] pr-2 min-w-0 ${
                  isSelected ? "text-primary-foreground font-medium" :
                  isKeyboardFocused ? "text-foreground" :
                  "text-foreground/80"
                }`}>
                  <Folder className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                  <span className="truncate text-[11px]">{f.name}</span>
                </div>
                <span className="flex-[1] text-[11px] text-muted-foreground tabular-nums hidden lg:block">
                  {getMostRecentFileDate(phase?.name, f.name)}
                </span>
                <div className="h-5 w-5 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleMoveFolderUp(f);
                    }}
                    disabled={isFirstFolder}
                    className={`h-4 w-4 flex items-center justify-center rounded transition-opacity opacity-0 group-hover:opacity-100 ${
                      isFirstFolder ? 'cursor-not-allowed text-muted-foreground/60' : 'text-muted-foreground hover:text-foreground'
                    }`}
                    aria-label="Move folder up"
                    title={isFirstFolder ? 'Top folder' : 'Move folder up'}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
          </>
        )}
      </div>
    </div>
  );
};

const FileList = ({ folder, files, viewMode, selectedFile, keyboardFocused, keyboardSelectedIndex, onFileClick, onUploadFiles, canUpload, darkMode }: {
  folder: any;
  files: any[];
  viewMode: string;
  selectedFile: any;
  keyboardFocused: boolean;
  keyboardSelectedIndex: number;
  onFileClick: (file: any) => void;
  onUploadFiles?: (files: File[], options?: { phaseName?: string; folderName?: string; selectFolder?: boolean }) => void;
  canUpload: boolean;
  darkMode: boolean;
}) => {
  // Drag and drop state
  const [isDragOver, setIsDragOver] = useState(false);
  // Use a ref so increments/decrements are synchronous and not subject to stale state
  const dragCounterRef = useRef(0);
  
  const formatFileModified = (dateString: string) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const month = d.toLocaleString('en-US', { month: 'short' });
    const day = d.getDate();
    const year = String(d.getFullYear()).slice(-2);
    const hasTime = /\d{1,2}:\d{2}/.test(dateString);
    let hours = d.getHours();
    let minutes = d.getMinutes();
    if (!hasTime) {
      hours = 9; 
      minutes = 0;
    }
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hr12 = hours % 12 === 0 ? 12 : hours % 12;
    const mm = String(minutes).padStart(2,'0');
    return `${month} ${day}, ${year} ${hr12}:${mm} ${ampm}`;
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;

    // Only show drag over state if files are being dragged (not text/other content)
    if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
      const hasFiles = Array.from(e.dataTransfer.items).some((item) => item.kind === 'file');
      if (hasFiles) setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Decrement and clamp to zero
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only allow copy effect for files
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      const hasFiles = Array.from(e.dataTransfer.items).some(item => item.kind === 'file');
      e.dataTransfer.dropEffect = hasFiles ? 'copy' : 'none';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    dragCounterRef.current = 0;
    
    if (!canUpload || !onUploadFiles) return;
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      // Filter out any invalid files if needed
      const validFiles = files.filter(file => file.size > 0);
      if (validFiles.length > 0) {
        onUploadFiles(validFiles, { phaseName: folder?.phase, folderName: folder?.name });
      }
    }
  };

  // As a safety net, hide overlay if drag ends anywhere (e.g., cancelled drop)
  useEffect(() => {
    const onDragEnd = () => {
      dragCounterRef.current = 0;
      setIsDragOver(false);
    };
    window.addEventListener('dragend', onDragEnd);
    window.addEventListener('drop', onDragEnd);
    return () => {
      window.removeEventListener('dragend', onDragEnd);
      window.removeEventListener('drop', onDragEnd);
    };
  }, []);

  const getFileExtension = (name: string) => {
    if (!name || typeof name !== 'string') return '';
    const lastDot = name.lastIndexOf('.');
    if (lastDot === -1 || lastDot === name.length - 1) return '';
    return name.slice(lastDot + 1).toUpperCase();
  };

  if (viewMode === "grid") {
    return (
      <div 
        className={`flex-1 overflow-auto bg-card p-3 custom-scrollbar relative ${isDragOver ? 'ring-2 ring-primary ring-opacity-40' : ''}`}
        onDragEnter={canUpload ? handleDragEnter : undefined}
        onDragLeave={canUpload ? handleDragLeave : undefined}
        onDragOver={canUpload ? handleDragOver : undefined}
        onDrop={canUpload ? handleDrop : undefined}
      >
        {/* Drag overlay for grid view */}
        {isDragOver && canUpload && (
            <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary/60 flex items-center justify-center text-primary z-10 pointer-events-none">
            <div className="text-center">
              <div className="text-[11px] font-medium leading-normal tracking-normal text-primary">
                Drop files here to upload
              </div>
              <div className="text-[11px] text-primary/80 mt-1">
                PDF, images, and documents supported
              </div>
            </div>
          </div>
        )}
        {!folder ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-[11px]">
            Select a folder
          </div>
        ) : (
          <div className="grid gap-2 grid-cols-5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-8 xl:grid-cols-9 2xl:grid-cols-10">
            {files.map((file, index) => {
              const isSelected = selectedFile && selectedFile.name === file.name;
              const isKeyboardFocused = keyboardFocused && keyboardSelectedIndex === index;
              
              const handleDragStart = (e: React.DragEvent) => {
                e.dataTransfer.effectAllowed = 'copy';
                const fileData = {
                  name: file.name,
                  type: file.type,
                  url: file.remote ? file.url : undefined,
                  phase: file.phase,
                  folder: file.folder
                };
                e.dataTransfer.setData('application/json', JSON.stringify(fileData));
                e.dataTransfer.setData('text/plain', file.name);
              };
              
              return (
                <div
                  key={file.name}
                  className={`flex flex-col items-stretch p-2 rounded-md cursor-pointer transition-colors gap-1 ${
                    isSelected ? 'bg-primary' : 
                    isKeyboardFocused ? 'bg-accent/50' : 
                    'hover:bg-accent/50'
                  }`}
                  onClick={() => onFileClick(file)}
                  draggable={true}
                  onDragStart={handleDragStart}
                  data-selected={isSelected ? 'true' : 'false'}
                  data-focus={isKeyboardFocused ? 'true' : 'false'}
                  tabIndex={0}
                  title={file.name}
                >
                  <div
                    className={`thumbnail-box ${'thumbnail-loading'} relative`}
                    data-kind={/\.pdf$/i.test(file.name) ? 'pdf' : /\.(png|jpg|jpeg|gif|bmp|svg|webp)$/i.test(file.name) ? 'image' : 'file'}
                    data-selected={isSelected ? 'true' : 'false'}
                    data-focus={isKeyboardFocused ? 'true' : 'false'}
                  >
                    <FileIcon
                      fileName={file.name}
                      className="thumbnail-icon file-grid-icon text-muted-foreground"
                    />
                    <div className="thumbnail-ext-badge">
                      {(() => {
                        const ext = file.name.split('.').pop() || '';
                        return ext.length > 5 ? ext.slice(0,5) : ext;
                      })()}
                    </div>
                  </div>
                  <span className={`text-[11px] leading-snug text-center truncate w-full px-0.5 ${
                    isSelected ? 'text-primary-foreground font-medium' : isKeyboardFocused ? 'text-foreground' : 'text-foreground/80'
                  }`}>{file.name}</span>
                  <span className="text-[11px] text-muted-foreground">{file.size}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      className="flex-1 flex flex-col bg-card"
    >
      {/* Fixed Header */}
  <div className="flex items-center h-7 border-b border-border bg-muted text-[11px] text-muted-foreground select-none pl-3 pr-1 flex-shrink-0">
        <div className="flex-1 pr-3 flex items-center min-w-0">
          <span className="inline-block w-4 h-4 mr-2" aria-hidden="true"></span>
          Name
        </div>
        <div className="w-20 shrink-0 pr-1 hidden md:block">Size</div>
        <div className="w-28 shrink-0 pr-1 hidden lg:block">Modified</div>
        <div className="w-16 shrink-0 pr-2 hidden xl:block">Type</div>
        <div className="w-6 shrink-0 flex items-center justify-end">
          {canUpload && folder && (
            <>
              <input
                type="file"
                multiple
                className="hidden"
                id="file-explorer-upload-input"
                onChange={(e) => {
                  const list = e.target.files;
                  if (list && list.length) {
                    onUploadFiles?.(Array.from(list), { phaseName: folder?.phase, folderName: folder?.name });
                    // reset so selecting same files again re-triggers
                    e.target.value = '';
                  }
                }}
                accept=".pdf,.png,.jpg,.jpeg,.gif,.bmp,.svg,.webp,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
              />
              <button
                type="button"
                onClick={() => document.getElementById('file-explorer-upload-input')?.click()}
                title="Upload files"
                className="h-5 w-5 flex items-center justify-center rounded hover:bg-accent/50 transition-colors text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
      {/* Scrollable Content (drag target) */}
      <div 
        className={`flex-1 overflow-y-auto custom-scrollbar relative ${isDragOver ? 'ring-2 ring-primary ring-opacity-40' : ''}`}
        onDragEnter={canUpload ? handleDragEnter : undefined}
        onDragLeave={canUpload ? handleDragLeave : undefined}
        onDragOver={canUpload ? handleDragOver : undefined}
        onDrop={canUpload ? handleDrop : undefined}
      >
        {/* Drag overlay (scoped to scrollable region only) */}
        {isDragOver && canUpload && (
          <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary/60 flex items-center justify-center text-primary z-10 pointer-events-none">
            <div className="text-center">
              <div className="text-[11px] font-medium leading-normal tracking-normal text-primary">
                Drop files here to upload
              </div>
              <div className="text-[11px] text-primary/80 mt-1">
                PDF, images, and documents supported
              </div>
            </div>
          </div>
        )}
        {!folder ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-[11px]">
            No file selected
          </div>
        ) : files.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-[11px]">
            No files found
          </div>
        ) : (
          files.map((file, index) => {
            const isSelected = selectedFile && selectedFile.name === file.name;
            const isKeyboardFocused = keyboardFocused && keyboardSelectedIndex === index;
            
            const handleDragStart = (e: React.DragEvent) => {
              e.dataTransfer.effectAllowed = 'copy';
              const fileData = {
                name: file.name,
                type: file.type,
                url: file.remote ? file.url : undefined,
                phase: file.phase,
                folder: file.folder
              };
              e.dataTransfer.setData('application/json', JSON.stringify(fileData));
              e.dataTransfer.setData('text/plain', file.name);
            };
            
            return (
              <div
                key={file.name}
                className={`flex items-center h-7 border-b border-border/50 pl-3 pr-3 cursor-pointer transition-colors ${
                  isSelected ? 'bg-primary text-primary-foreground' : 
                  isKeyboardFocused ? 'bg-accent/50 text-foreground' : 
                  'text-foreground/80 hover:bg-accent/50'
                }`}
                onClick={() => onFileClick(file)}
                draggable={true}
                onDragStart={handleDragStart}
                data-selected={isSelected ? 'true' : 'false'}
                data-focus={isKeyboardFocused ? 'true' : 'false'}
                tabIndex={0}
                style={darkMode ? { borderColor: 'hsl(var(--border))' } : {}}
              >
                <div className={`flex-1 flex items-center pr-3 min-w-0 ${
                  isSelected ? "text-gray-900 font-medium" :
                  isKeyboardFocused ? "text-gray-800" :
                  "text-gray-700"
                }`} style={darkMode ? { color: (isSelected || isKeyboardFocused) ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))' } : {}}>
                  <FileIcon
                    fileName={file.name}
                    className={`h-3.5 w-3.5 mr-2 ${darkMode ? 'text-muted-foreground' : 'text-gray-500'}`}
                  />
                  <span className="truncate text-[11px]">{file.name}</span>
                </div>
                <span className="w-20 shrink-0 text-[11px] text-gray-500 tabular-nums pr-1 hidden md:inline">{file.size}</span>
                <span className="w-28 shrink-0 text-[11px] text-gray-500 tabular-nums pr-1 hidden lg:inline">{formatFileModified(file.modified)}</span>
                <span className="w-16 shrink-0 text-[11px] text-gray-500 hidden xl:inline">{getFileExtension(file.name)}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

interface FileExplorerProps {
  projectId?: string;
  className?: string;
  onFileSelect?: (file: any) => void;
  heightMode?: 'compact' | 'tall' | 'collapsed' | 'custom';
  onToggleHeight?: () => void;
  darkMode?: boolean;
  viewerStatus?: any;
  canUpload?: boolean;
  onUploadFiles?: (files: File[], folderId?: string) => void;
  isActive?: boolean;
  onClick?: () => void;
}

export default function FileExplorer({ 
  projectId,
  className = "h-full", 
  onFileSelect, 
  heightMode = 'compact', 
  onToggleHeight, 
  darkMode = false, 
  viewerStatus,
  canUpload: _canUpload = true,
  onUploadFiles: _onUploadFiles,
  isActive = true,
  onClick
}: FileExplorerProps) {
  
  // Fetch real folders and files from Supabase
  const { data: foldersData = [] } = useProjectFolders(projectId || '')
  const { data: filesData = [] } = useProjectFilesApi(projectId || '')
  const createFolderMutation = useCreateFolder(projectId || '')
  
  // Transform folders into tree structure
  const root = useMemo(() => {
    if (!foldersData || foldersData.length === 0) {
      return {
        name: 'Project Files',
        type: 'project',
        children: [],
      }
    }
    
    // Get root folders (no parent) - these are our phases
    const rootFolders = foldersData.filter(f => f.parent_folder_id === null)
    
    // Get child folders for each root folder
    const rootWithChildren = rootFolders.map(rootFolder => ({
      id: rootFolder.id,
      name: rootFolder.name,
      type: 'phase',
      is_system: rootFolder.is_system_folder,
      children: foldersData
        .filter(f => f.parent_folder_id === rootFolder.id)
        .map(child => ({
          id: child.id,
          name: child.name,
          type: 'folder',
          phase: rootFolder.name, // Add phase name to folder
        })),
    }))
    
    return {
      name: 'Project Files',
      type: 'project',
      children: rootWithChildren,
    }
  }, [foldersData])
  
  // Transform files into the format expected by FileExplorer (without URLs initially)
  const liveFiles = useMemo(() => {
    if (!filesData || filesData.length === 0) {
      return MOCK_FILES // Fallback to mock if no live data
    }
    
    return filesData.map((file) => {
      // Find the folder and parent folder (phase) for this file
      const folder = foldersData.find((f) => f.id === file.folder_id)
      const parentFolder = folder?.parent_folder_id 
        ? foldersData.find((f) => f.id === folder.parent_folder_id)
        : null
      
      const phaseName = parentFolder?.name || folder?.name || 'Uncategorized'
      const folderName = folder?.parent_folder_id ? folder.name : 'Root'
      
      return {
        name: file.filename,
        size: formatFileSize(file.filesize || 0),
        modified: new Date(file.created_at).toLocaleDateString(),
        phase: phaseName,
        folder: folderName,
        type: file.mimetype?.split('/')[0] || 'other',
        url: '', // Will be populated by useEffect
        storage_path: file.storage_path, // Keep storage path for URL generation
        id: file.id,
      }
    })
  }, [filesData, foldersData])
  
  // Core navigation state
  const [rootState, setRootState] = useState(root);
  const [files, setFiles] = useState(liveFiles);
  
  // Generate signed URLs for files from database
  useEffect(() => {
    const generateSignedUrls = async () => {
      if (!filesData || filesData.length === 0 || !liveFiles || liveFiles.length === 0) return;
      
      const filesWithUrls = await Promise.all(
        liveFiles.map(async (file: any) => {
          if (!file.storage_path) return file;
          
          try {
            const { data: signedUrlData, error } = await supabase.storage
              .from('project-files')
              .createSignedUrl(file.storage_path, 3600); // Valid for 1 hour
            
            if (error) {
              console.error('Error generating signed URL:', error);
              return file;
            }
            
            return {
              ...file,
              url: signedUrlData?.signedUrl || '',
            };
          } catch (err) {
            console.error('Error generating signed URL:', err);
            return file;
          }
        })
      );
      
      setFiles(filesWithUrls);
    };
    
    generateSignedUrls();
  }, [liveFiles, filesData]);
  
  // Only update state when data actually changes (not just reference)
  useEffect(() => {
    const rootChanged = JSON.stringify(rootState) !== JSON.stringify(root)
    if (rootChanged) {
      setRootState(root)
    }
  }, [root])
  
  useEffect(() => {
    const filesChanged = JSON.stringify(files) !== JSON.stringify(liveFiles)
    if (filesChanged) {
      setFiles(liveFiles)
    }
  }, [liveFiles])
  
  const phases = rootState.children;
  const rootRef = useRef(rootState);
  useEffect(() => {
    rootRef.current = rootState;
  }, [rootState]);
  
  // Track blob URLs for cleanup
  const blobUrlsRef = useRef<Set<string>>(new Set());
  
  const [selectedPhase, setSelectedPhase] = useState<any>(phases[0] || null);
  const [selectedFolder, setSelectedFolder] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [viewMode, setViewMode] = useState("list");
  const [focusedPanel, setFocusedPanel] = useState('phases');
  const [keyboardSelectedPhase, setKeyboardSelectedPhase] = useState(0);
  const [keyboardSelectedFolder, setKeyboardSelectedFolder] = useState(0);
  const [keyboardSelectedFile, setKeyboardSelectedFile] = useState(0);
  const [keyboardSelectedSearchResult, setKeyboardSelectedSearchResult] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const currentFiles = useMemo(() => {
    if (!selectedFolder || !selectedPhase) return [];
    return files.filter(file => 
      file.phase === selectedPhase.name && file.folder === selectedFolder.name
    );
  }, [selectedPhase, selectedFolder, files]);

  const performSearch = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    const results: Array<{
      type: 'file';
      name: string;
      phase: string;
      folder: string;
      size: string;
      modified: string;
      data: (typeof files)[number];
    }> = [];
    
    files.forEach(file => {
      if (file.name.toLowerCase().includes(query)) {
        results.push({
          type: 'file',
          name: file.name,
          phase: file.phase,
          folder: file.folder,
          size: file.size,
          modified: file.modified,
          data: file
        });
      }
    });
    
    return results.slice(0, 20);
  }, [searchQuery, phases, files]);

  useEffect(() => {
    const shouldShow = searchQuery.trim().length > 0 && performSearch.length > 0;
    if (showSearchDropdown !== shouldShow) {
      setShowSearchDropdown(shouldShow);
    }
    setKeyboardSelectedSearchResult(0);
  }, [performSearch, searchQuery, showSearchDropdown]);

  useEffect(() => {
    if (!showSearchDropdown) {
      setKeyboardSelectedSearchResult(0);
    }
  }, [showSearchDropdown]);

  const filteredFolders = useMemo(() => {
    return selectedPhase?.children || [];
  }, [selectedPhase]);

  const handleSearchResultSelect = (result: any) => {
    setShowSearchDropdown(false);
    
    if (result.type === 'file') {
      const phase = phases.find((p: any) => p.name === result.phase);
      const folder = phase?.children?.find((f: any) => f.name === result.folder);
      
      if (phase && folder) {
        setSelectedPhase(phase);
        setSelectedFolder(folder);
        setSelectedFile(null);
        
        const phaseIndex = phases.findIndex((p: any) => p.name === result.phase);
        const folderIndex = phase.children?.findIndex((f: any) => f.name === result.folder) || 0;
        
        setKeyboardSelectedPhase(phaseIndex);
        setKeyboardSelectedFolder(folderIndex);
        
        const folderFiles = files.filter(file => 
          file.phase === result.phase && file.folder === result.folder
        );
        const fileIndex = folderFiles.findIndex(f => f.name === result.name);
        setKeyboardSelectedFile(fileIndex >= 0 ? fileIndex : 0);
        setFocusedPanel('files');
        setSearchQuery("");

        // Select/open the file directly so viewer updates immediately
        const fileObj = folderFiles[fileIndex >= 0 ? fileIndex : 0];
        if (fileObj) {
          setSelectedFile(fileObj);
          if (onFileSelect) onFileSelect(fileObj);
        }
        
        requestAnimationFrame(() => {
          const activeElement = document.activeElement;
          if (activeElement instanceof HTMLElement) {
            activeElement.blur();
          }
        });
      }
    }
  };

  const handleFileClick = (file: any) => {
    setSelectedFile(file);
    if (onFileSelect) {
      onFileSelect(file);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only respond when this explorer is active
      if (!isActive) return;
      
      // Reserve Shift + Up/Down for App-level pane switching
      if (e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        return;
      }
      if (e.key.startsWith('Arrow')) {

      }
      // In collapsed mode, limit navigation to search dropdown only
    // (panels are hidden, so we don't process panel navigation)
    // The dropdown handling block below will manage ArrowUp/Down/Enter/Escape.
    // Handle search dropdown navigation
    if (showSearchDropdown && performSearch.length > 0) {
      if (keyboardSelectedSearchResult >= performSearch.length) {
        setKeyboardSelectedSearchResult(0);
      }
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setKeyboardSelectedSearchResult(prev => Math.max(0, prev - 1));
          return;
        case 'ArrowDown':
          e.preventDefault();
          setKeyboardSelectedSearchResult(prev => Math.min(performSearch.length - 1, prev + 1));
          return;
        case 'Enter': {
          e.preventDefault();
          const currentResults = performSearch;
          const clampedIndex = Math.min(keyboardSelectedSearchResult, currentResults.length - 1);
          const selectedResult = currentResults[clampedIndex];
          if (selectedResult) {
            handleSearchResultSelect(selectedResult);
            // Set focus back to the explorer for continued keyboard navigation
            setTimeout(() => {
              const explorerElement = document.querySelector('[data-explorer-root]');
              if (explorerElement) {
                (explorerElement as HTMLElement).focus();
              }
            }, 100);
          }
          return;
        }
        case 'Escape':
          e.preventDefault();
          setShowSearchDropdown(false);
          setSearchQuery("");
          return;
      }
    }
    
    // Don't handle navigation when typing in search input
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    
    // Handle main navigation
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();

        if (focusedPanel === 'phases') {
          setKeyboardSelectedPhase(prev => Math.max(0, prev - 1));
        } else if (focusedPanel === 'folders') {
          setKeyboardSelectedFolder(prev => Math.max(0, prev - 1));
        } else if (focusedPanel === 'files') {
          setKeyboardSelectedFile(prev => Math.max(0, prev - 1));
        }

        break;
        
      case 'ArrowDown':
        e.preventDefault();

        if (focusedPanel === 'phases') {
          setKeyboardSelectedPhase(prev => Math.min(phases.length - 1, prev + 1));
        } else if (focusedPanel === 'folders') {
          setKeyboardSelectedFolder(prev => Math.min(filteredFolders.length - 1, prev + 1));
        } else if (focusedPanel === 'files') {
          setKeyboardSelectedFile(prev => Math.min(currentFiles.length - 1, prev + 1));
        }

        break;
        
      case 'ArrowRight':
        e.preventDefault();

        if (focusedPanel === 'phases') {
          const phase = phases[keyboardSelectedPhase];
          if (phase && (!selectedPhase || selectedPhase.name !== phase.name)) {
            setSelectedPhase(phase);

          }
          setFocusedPanel('folders');
          // If we just changed phase, reset folder index
          setKeyboardSelectedFolder(0);

        } else if (focusedPanel === 'folders') {
          const folder = filteredFolders[keyboardSelectedFolder];
          if (folder) {
            if (!selectedFolder || selectedFolder.name !== folder.name) {
              setSelectedFolder(folder);

            }
            setFocusedPanel('files');
            setKeyboardSelectedFile(0);

          }
        }
        break;
        
      case 'ArrowLeft':
        e.preventDefault();

        if (focusedPanel === 'files') {
          setFocusedPanel('folders');
          setKeyboardSelectedFolder(0); // reset to top when moving back

        } else if (focusedPanel === 'folders') {
          setFocusedPanel('phases');
          setKeyboardSelectedPhase(0); // reset to top when moving back

        }
        break;
        
      case 'Enter':
        e.preventDefault();

        if (focusedPanel === 'phases') {
          const phase = phases[keyboardSelectedPhase];
          if (phase) {
            setSelectedPhase(phase);
            setFocusedPanel('folders');
            setKeyboardSelectedFolder(0);

          }
        } else if (focusedPanel === 'folders') {
          const folder = filteredFolders[keyboardSelectedFolder];
          if (folder) {
            setSelectedFolder(folder);
            setFocusedPanel('files');
            setKeyboardSelectedFile(0);

          }
        } else if (focusedPanel === 'files') {
          const file = currentFiles[keyboardSelectedFile];
          if (file) {
            handleFileClick(file);

          }
        }
        break;
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isActive,
    showSearchDropdown, performSearch, keyboardSelectedSearchResult, handleSearchResultSelect,
    focusedPanel, keyboardSelectedPhase, keyboardSelectedFolder, keyboardSelectedFile,
    phases, filteredFolders, currentFiles, selectedFolder, handleFileClick,
    searchQuery
  ]);

  // Create folder handler
  const handleCreateFolder = useCallback(async (folderName: string) => {
    if (!selectedPhase || !folderName.trim() || !projectId) return;
    
    // Check if folder already exists
    const folderExists = selectedPhase.children?.some((f: any) => 
      f.name.toLowerCase() === folderName.trim().toLowerCase()
    );
    
    if (folderExists) {
      // Could add a toast notification here
      return;
    }
    
    // Find the actual parent folder ID from foldersData
    const parentFolder = foldersData.find((f: any) => f.name === selectedPhase.name && f.is_system_folder);
    
    try {
      // Actually create the folder in the database
      const newFolder = await createFolderMutation.mutateAsync({
        name: folderName.trim(),
        parent_folder_id: parentFolder?.id || null
      });
      
      // Update the local state with the real folder data
      setRootState(prevRoot => {
        const newRoot = { ...prevRoot };
        newRoot.children = newRoot.children.map((phase: any) => {
          if (phase.name === selectedPhase.name) {
            const updatedPhase = {
              ...phase,
              children: [
                ...(phase.children || []),
                { 
                  id: newFolder.id,
                  name: newFolder.name, 
                  type: 'folder', 
                  phase: phase.name 
                }
              ]
            };
            // Update selectedPhase reference to point to the new phase object
            setSelectedPhase(updatedPhase);
            return updatedPhase;
          }
          return phase;
        });
        return newRoot;
      });
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  }, [selectedPhase, projectId, foldersData, createFolderMutation]);

  // Reorder folders via drag and drop
  const handleFolderReorder = useCallback((draggedFolder: any, targetFolder: any) => {
    if (!selectedPhase || !draggedFolder || !targetFolder || draggedFolder.name === targetFolder.name) return;

    setRootState(prevRoot => {
      const newRoot = { ...prevRoot };
      newRoot.children = newRoot.children.map((phase: any) => {
        if (phase.name === selectedPhase.name) {
          const folders = phase.children || [];
          const draggedIndex = folders.findIndex((f: any) => f.name === draggedFolder.name);
          const targetIndex = folders.findIndex((f: any) => f.name === targetFolder.name);
          
          if (draggedIndex === -1 || targetIndex === -1) return phase;
          
          // Create new array with reordered folders
          const newFolders = [...folders];
          const [removed] = newFolders.splice(draggedIndex, 1);
          newFolders.splice(targetIndex, 0, removed);
          
          const updatedPhase = {
            ...phase,
            children: newFolders
          };
          
          // Update selectedPhase reference
          setSelectedPhase(updatedPhase);
          return updatedPhase;
        }
        return phase;
      });
      return newRoot;
    });
  }, [selectedPhase]);

  // Upload handling
  const ensureUniqueName = useCallback((baseName: string, phaseName: string, folderName: string, existingList?: any[]) => {
    return ensureUniqueNameInList(baseName, phaseName, folderName, existingList || files);
  }, [files]);

  const filesRef = useRef(files);
  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  const handleUploadFiles = useCallback((fileList: File[], options?: { phaseName?: string; folderName?: string; selectFolder?: boolean }) => {
    if (!fileList || !fileList.length) return;
    
    // Find the folder ID based on phase and folder names
    const phaseName = options?.phaseName || selectedPhase?.name;
    const folderName = options?.folderName || selectedFolder?.name;
    
    if (!phaseName || !folderName) {
      console.warn('Cannot upload files: missing phase or folder');
      return;
    }
    
    // Find the folder object to get its ID
    const phaseFolder = foldersData?.find(f => f.name === phaseName && f.parent_folder_id === null);
    if (!phaseFolder) {
      console.warn('Cannot find phase folder:', phaseName);
      return;
    }
    
    const targetFolder = foldersData?.find(f => f.name === folderName && f.parent_folder_id === phaseFolder.id);
    if (!targetFolder) {
      console.warn('Cannot find target folder:', folderName, 'in phase:', phaseName);
      return;
    }
    
    // Call the upload function with the folder ID
    console.log('Uploading files to folder:', targetFolder.name, 'with ID:', targetFolder.id);
    if (_onUploadFiles) {
      _onUploadFiles(fileList, targetFolder.id);
    }
  }, [selectedPhase, selectedFolder, foldersData, _onUploadFiles]);

  // Revoke object URLs on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      // Clean up all tracked blob URLs on component unmount
      blobUrlsRef.current.forEach(url => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          // Ignore errors if URL was already revoked
        }
      });
      blobUrlsRef.current.clear();
    };
  }, []); // Empty deps - only run on unmount

  return (
    <div 
      className={`explorer-root w-full flex flex-col text-[11px] text-gray-800 font-sans min-h-0 ${(heightMode === 'collapsed' || heightMode === 'compact') ? 'overflow-visible' : 'overflow-hidden'} ${className}`}
      tabIndex={0}
      onFocus={(e) => { 
        // Only reset if focusing the root container itself, not child elements
        if (e.target === e.currentTarget) {
          setFocusedPanel('phases'); 
          setKeyboardSelectedPhase(0); 
          setKeyboardSelectedFolder(0); 
          setKeyboardSelectedFile(0); 

        }
      }}
      onClick={onClick}
      data-explorer-root
      style={{ fontFamily: '"Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif' }}
    >
      {/* Header */}
  <div className="h-8 border-b border-border bg-muted/80 flex items-center px-2 relative text-[11px]">
        <div className={`absolute left-1/2 -translate-x-1/2 w-full flex justify-center pointer-events-none ${(heightMode === 'collapsed' || heightMode === 'compact') ? 'z-[9999]' : ''}`}>
          <div
            ref={searchContainerRef}
            className={`w-full relative pointer-events-auto text-[11px] ${(heightMode === 'collapsed' || heightMode === 'compact') ? 'z-[9999]' : ''}`}
            style={{
              maxWidth: 'min(48rem, calc(100% - 160px))',
              margin: '0 auto'
            }}
          >
            <div className="h-6 px-2 rounded border border-border bg-muted/50 flex items-center gap-1 relative">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                className="flex-1 bg-transparent outline-none text-[11px] pr-5 text-foreground placeholder:text-muted-foreground"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowSearchDropdown(searchQuery.trim().length > 0 && performSearch.length > 0)}
                ref={searchInputRef}
              />
              {searchQuery && (
                <button
                  className="absolute right-1 h-4 w-4 rounded-full bg-gray-400 hover:bg-gray-500 flex items-center justify-center focus:outline-none active:transform-none"
                  style={{ ...(darkMode ? { backgroundColor: 'hsl(var(--muted-foreground))' } : {}), transform: 'none' }}
                  onClick={() => {
                    setSearchQuery("");
                    setShowSearchDropdown(false);
                  }}
                  title="Clear search"
                >
                  <span className="text-white text-[11px] leading-none">×</span>
                </button>
              )}
            </div>
            {showSearchDropdown && (
              <FloatingSearchDropdown
                anchorRef={searchContainerRef as unknown as RefObject<HTMLElement>}
                results={performSearch}
                searchQuery={searchQuery}
                keyboardSelectedIndex={keyboardSelectedSearchResult}
                onSelect={handleSearchResultSelect}
                onClose={() => setShowSearchDropdown(false)}
                placement="up"
                darkMode={darkMode}
              />
            )}
          </div>
        </div>
        
        <div className="hidden md:flex items-center gap-2 ml-auto pr-1">
          {selectedFolder && heightMode !== 'collapsed' && (
            <button
              className={`h-6 px-2 rounded border border-border inline-flex items-center gap-1 focus:outline-none active:transform-none text-[11px] text-foreground ${viewMode === 'grid' ? 'bg-accent' : 'bg-muted/50'} hover:bg-accent`}
              onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
              title={viewMode === "grid" ? "Switch to List View" : "Switch to Grid View"}
            >
              {viewMode === "grid" ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
            </button>
          )}
          {onToggleHeight && (
            <button
              onClick={onToggleHeight}
              title={heightMode === 'collapsed' ? 'Restore Explorer' : heightMode === 'compact' ? 'Collapse to Search' : 'Make Explorer Compact'}
              className="h-6 w-6 rounded border border-border bg-muted/50 hover:bg-accent flex items-center justify-center text-foreground"
            >
              <div className="relative w-3 h-3">
                <Minus
                  className={`absolute h-3 w-3 transition-transform ${
                    heightMode === 'tall' || heightMode === 'custom' ? 'translate-y-[-2px]' :
                    heightMode === 'compact' ? 'translate-y-0' :
                    'translate-y-[2px]'
                  }`}
                />
              </div>
            </button>
          )}
        </div>
      </div>
      {heightMode !== 'collapsed' && (
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Sidebar */}
          <aside className="w-[clamp(140px,18%,180px)] border-r border-border bg-muted flex flex-col">
            <nav className="flex-1 overflow-y-auto px-1 py-1 custom-scrollbar">
              {phases.map((item: any, index: number) => (
                <SidebarItem
                  key={item.name}
                  item={item}
                  selected={selectedPhase?.name === item.name}
                  keyboardFocused={focusedPanel === 'phases' && keyboardSelectedPhase === index}
                  darkMode={darkMode}
                  onClick={() => {
                    setSelectedPhase(item);
                    setSelectedFolder(null);
                    setSelectedFile(null);
                    setKeyboardSelectedPhase(index);
                  }}
                />
              ))}
            </nav>
          </aside>
          {/* Folder List View */}
          <div className="w-[260px] border-r border-border">
            <FolderList 
              phase={selectedPhase} 
              folders={filteredFolders} 
              selectedFolder={selectedFolder}
              keyboardFocused={focusedPanel === 'folders'}
              keyboardSelectedIndex={keyboardSelectedFolder}
              onFolderClick={(folder) => {
                setSelectedFolder(folder);
                setSelectedFile(null);
              }}
              allFiles={files}
              darkMode={darkMode}
              onCreateFolder={handleCreateFolder}
              onFolderReorder={handleFolderReorder}
              onUploadFiles={handleUploadFiles}
            />
          </div>
          {/* File List View */}
          <FileList 
            folder={selectedFolder} 
            files={currentFiles} 
            viewMode={viewMode}
            selectedFile={selectedFile}
            keyboardFocused={focusedPanel === 'files'}
            keyboardSelectedIndex={keyboardSelectedFile}
            onFileClick={handleFileClick}
            onUploadFiles={handleUploadFiles}
            canUpload={!!selectedPhase && !!selectedFolder}
            darkMode={darkMode}
          />
        </div>
      )}

      {heightMode !== 'collapsed' && (
        <div className="h-5 border-t border-border bg-muted/80 flex items-center justify-between px-2 text-[11px] text-muted-foreground">
          <div className="truncate flex-1">
            {viewerStatus && viewerStatus.name ? (
              <span className="truncate">
                {viewerStatus.name}
                {viewerStatus.size ? ` • ${viewerStatus.size}` : ''}
                {viewerStatus.modified ? ` • Modified ${viewerStatus.modified}` : ''}
                {viewerStatus.pixels && (typeof viewerStatus.pixels.width === 'number') ? ` • ${viewerStatus.pixels.width}×${viewerStatus.pixels.height}px` : ''}
                {viewerStatus.type === 'pdf' && viewerStatus.pageNumber && viewerStatus.numPages ? ` • Page ${viewerStatus.pageNumber}/${viewerStatus.numPages}` : ''}
              </span>
            ) : selectedFolder ? (
              <span>
                {currentFiles.length} {currentFiles.length === 1 ? 'file' : 'files'} in {selectedFolder.name}
              </span>
            ) : selectedPhase ? (
              <span>
                {filteredFolders.length} {filteredFolders.length === 1 ? 'folder' : 'folders'}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-3 whitespace-nowrap flex-shrink-0">
            {viewerStatus?.loading && viewerStatus?.type === 'pdf' && (
              <div className="flex items-center gap-1.5">
                <div className="animate-spin rounded-full h-3 w-3 border border-muted-foreground border-t-transparent" />
                <span className="text-muted-foreground">Loading PDF...</span>
              </div>
            )}
            {!viewerStatus?.loading && viewerStatus?.type === 'image' && (
              <span className="text-muted-foreground">Helpers: Shift+Wheel zoom • Shift+ +/- zoom • R rotate • F fullscreen</span>
            )}
            {!viewerStatus?.loading && viewerStatus?.type === 'pdf' && (
              <span className="text-muted-foreground">Helpers: Shift+Wheel zoom • Shift+ +/- zoom • R rotate • Arrows nav • F fullscreen</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

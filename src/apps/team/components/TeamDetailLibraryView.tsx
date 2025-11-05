import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { useDetailLibraryCategories, useDetailLibrarySubfolders, useDetailLibraryFiles, useDetailLibraryItems, useCreateDetailLibrarySubfolder, useUpdateDetailLibrarySubfolder, useDeleteDetailLibrarySubfolder, useHardDeleteDetailFile, useDeleteDetailItem } from '@/lib/api/hooks/useDetailLibrary';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import SimpleImageViewer from '@/components/detail-library/SimpleImageViewer';
import { TabsRow } from './TeamDashboardCore';
import type { DetailLibraryFile, DetailLibraryItem, DetailColorTag, DetailLibrarySubfolder } from '@/lib/api/types';
import { Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

// Component to load items for a folder
interface FolderItemsLoaderProps {
  fileId: string;
  onItemsLoaded: (fileId: string, items: DetailLibraryItem[]) => void;
}

const FolderItemsLoader = memo(function FolderItemsLoader({ fileId, onItemsLoaded }: FolderItemsLoaderProps) {
  const { data: items = [] } = useDetailLibraryItems(fileId);
  
  useEffect(() => {
    onItemsLoaded(fileId, items);
  }, [fileId, items, onItemsLoaded]);
  
  return null; // This component doesn't render anything
});

// Resizer component for preview panel
const Resizer = memo(function Resizer({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <div 
      data-testid="resizer" 
      onMouseDown={onMouseDown} 
      className="relative w-[6px] h-full self-stretch cursor-col-resize group"
    >
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-slate-200" />
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-1 opacity-0 group-hover:opacity-100 bg-slate-400 transition-opacity" />
    </div>
  );
});

// Detail Information Card component
interface DetailInfoCardProps {
  category: string | null;
  createdBy: string | null;
  createdAt: string | null;
  scale?: string | null;
  fileId?: string | null;
  itemId?: string | null;
  onDeleted?: () => void;
}

const DetailInfoCard = memo(function DetailInfoCard({ category, createdBy, createdAt, scale, fileId, itemId, onDeleted }: DetailInfoCardProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const deleteFileMutation = useHardDeleteDetailFile();
  const deleteItemMutation = useDeleteDetailItem();

  const handleDelete = useCallback(async () => {
    if (itemId) {
      // Delete item
      try {
        await deleteItemMutation.mutateAsync({ itemId });
        setDeleteConfirmOpen(false);
        onDeleted?.();
      } catch (error) {
        console.error('Failed to delete item:', error);
      }
    } else if (fileId) {
      // Delete file
      try {
        await deleteFileMutation.mutateAsync({ fileId });
        setDeleteConfirmOpen(false);
        onDeleted?.();
      } catch (error) {
        console.error('Failed to delete file:', error);
      }
    }
  }, [fileId, itemId, deleteFileMutation, deleteItemMutation, onDeleted]);

  const isDeleting = deleteFileMutation.isPending || deleteItemMutation.isPending;
  const hasDeleteOption = fileId || itemId;

  return (
    <>
      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-[12px] font-medium text-[#202020]">Detail Information</h4>
          {hasDeleteOption && (
            <button
              onClick={() => setDeleteConfirmOpen(true)}
              className="text-[11px] text-red-600 hover:text-red-700 font-medium transition-colors"
              title="Delete detail"
            >
              Delete
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-[12px]">
          <div>
            <div className="text-slate-500 mb-0.5">Category</div>
            <div className="text-[#202020]">{category || '—'}</div>
          </div>
          <div>
            <div className="text-slate-500 mb-0.5">Scale</div>
            <div className="text-[#202020]">{scale || '—'}</div>
          </div>
          <div>
            <div className="text-slate-500 mb-0.5">Created by</div>
            <div className="text-[#202020]">{createdBy || '—'}</div>
          </div>
          <div>
            <div className="text-slate-500 mb-0.5">Date created</div>
            <div className="text-[#202020]">{formatDate(createdAt)}</div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Detail</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to permanently delete this detail? This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});

// Folder item component with expand/collapse - now handles subfolder structure
interface FolderItemProps {
  folder: {
    id: string;
    name: string;
    subfolder: DetailLibrarySubfolder | null;
    files: DetailLibraryFile[];
    fileItemsMap: Record<string, DetailLibraryItem[]>;
  };
  isOpen: boolean;
  onToggle: () => void;
  onFolderClick: () => void;
  onOpenDetail: (item: any) => void;
  onFileExpand: (fileId: string) => void;
  expandedFileIds: Set<string>;
  loadingFiles: Set<string>;
}

const FolderItem = memo(function FolderItem({ 
  folder, 
  isOpen, 
  onToggle,
  onFolderClick,
  onOpenDetail, 
  onFileExpand,
  expandedFileIds,
  loadingFiles
}: FolderItemProps) {
  const fileCount = folder.files.length;
  
  return (
    <div className="mt-1 rounded-lg border border-slate-200 overflow-hidden">
      <div className="w-full flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 transition-colors">
        <button
          onClick={onToggle}
          className="flex items-center"
          aria-expanded={isOpen}
          aria-label={`${folder.name} folder toggle`}
        >
          {isOpen ? (
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
              <path d="m6 9 6 6 6-6" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
              <path d="m9 18 6-6-6-6" />
            </svg>
          )}
        </button>
        <button
          onClick={onFolderClick}
          className="flex-1 text-left"
        >
          <span className="text-[13px] font-medium text-[#202020]">{folder.name}</span>
        </button>
        <span className="ml-auto text-[11px] text-slate-500">
          {fileCount}
        </span>
      </div>
      {isOpen && (
        <>
          {fileCount === 0 ? (
            <div className="py-2 px-3 text-[12px] text-slate-500">No files</div>
          ) : (
            <table className="w-full text-[12px]">
              <tbody>
                {folder.files.map((file) => {
                  const fileItems = folder.fileItemsMap[file.id] || [];
                  const hasItems = fileItems.length > 0;
                  const isExpanded = expandedFileIds.has(file.id);
                  const isLoading = loadingFiles.has(file.id);
                  
                  return (
                    <React.Fragment key={file.id}>
                      <tr className="group hover:bg-slate-50">
                        <td className="py-1.5 px-3 border-t border-slate-200">
                          <div className="flex items-center gap-2">
                            {hasItems && (
                              <button
                                onClick={() => onFileExpand(file.id)}
                                className="text-slate-400 hover:text-slate-600"
                              >
                                {isExpanded ? (
                                  <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2" fill="none">
                                    <path d="m6 9 6 6 6-6" />
                                  </svg>
                                ) : (
                                  <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2" fill="none">
                                    <path d="m9 18 6-6-6-6" />
                                  </svg>
                                )}
                              </button>
                            )}
                            <button 
                              onClick={() => onOpenDetail(file)} 
                              className="text-slate-700 hover:text-slate-900 transition-colors text-left flex-1"
                            >
                              {file.title}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && hasItems && (
                        <>
                          {isLoading ? (
                            <tr>
                              <td className="py-1 px-3 pl-8 text-[11px] text-slate-500">Loading...</td>
                            </tr>
                          ) : (
                            fileItems.map((item) => (
                              <tr key={item.id} className="group hover:bg-slate-50">
                                <td className="py-1 px-3 pl-8 border-t border-slate-100">
                                  <button 
                                    onClick={() => onOpenDetail(item)} 
                                    className="text-slate-600 hover:text-slate-900 transition-colors text-left w-full"
                                  >
                                    {item.title}
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
});

// Category vertical list component
interface CategoryVerticalListProps {
  folders: Array<{
    id: string;
    name: string;
    subfolder: DetailLibrarySubfolder | null;
    files: DetailLibraryFile[];
    fileItemsMap: Record<string, DetailLibraryItem[]>;
  }>;
  onOpenDetail: (item: any) => void;
  onFolderClick: (folder: { id: string; name: string; subfolder: DetailLibrarySubfolder | null; files: DetailLibraryFile[] }) => void;
  onFolderToggle: (folderId: string) => void;
  onFileExpand: (fileId: string) => void;
  onAddDetail: () => void;
  openFolders: Record<string, boolean>;
  expandedFileIds: Set<string>;
  loadingFiles: Set<string>;
}

const CategoryVerticalList = memo(function CategoryVerticalList({ 
  folders, 
  onOpenDetail,
  onFolderClick,
  onFolderToggle,
  onFileExpand,
  onAddDetail,
  openFolders,
  expandedFileIds,
  loadingFiles
}: CategoryVerticalListProps) {
  if (!folders.length) {
    return (
      <div className="py-12 text-center">
        <p className="text-slate-500 text-sm mb-4">No details found</p>
        <button
          onClick={onAddDetail}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Detail and Category</span>
        </button>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {folders.map((folder) => (
        <FolderItem 
          key={folder.id} 
          folder={folder} 
          isOpen={openFolders[folder.id] ?? true} 
          onToggle={() => onFolderToggle(folder.id)}
          onFolderClick={() => onFolderClick(folder)}
          onOpenDetail={onOpenDetail}
          onFileExpand={onFileExpand}
          expandedFileIds={expandedFileIds}
          loadingFiles={loadingFiles}
        />
      ))}
    </div>
  );
});

// Category Properties component
interface CategoryPropertiesProps {
  folder: {
    id: string;
    name: string;
    subfolder: DetailLibrarySubfolder | null;
    files: DetailLibraryFile[];
  };
  categoryId: string;
  onClose: () => void;
  onAddDetail: () => void;
}

const CategoryProperties = memo(function CategoryProperties({ 
  folder, 
  categoryId,
  onClose,
  onAddDetail
}: CategoryPropertiesProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(folder.name);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  
  const updateMutation = useUpdateDetailLibrarySubfolder();
  const deleteMutation = useDeleteDetailLibrarySubfolder();
  
  // Sync name when folder changes
  useEffect(() => {
    setName(folder.name);
  }, [folder.name]);
  
  const handleSave = useCallback(async () => {
    if (!folder.subfolder) return; // Can't rename uncategorized
    
    try {
      await updateMutation.mutateAsync({
        subfolderId: folder.subfolder!.id,
        name: name.trim(),
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update:', error);
    }
  }, [folder.subfolder, name, updateMutation]);
  
  const handleDelete = useCallback(async () => {
    if (!folder.subfolder) return; // Can't delete uncategorized
    
    try {
      await deleteMutation.mutateAsync({
        subfolderId: folder.subfolder!.id,
      });
      setDeleteConfirmOpen(false);
      onClose();
    } catch (error) {
      console.error('Failed to delete:', error);
      alert(`Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [folder.subfolder, deleteMutation, onClose]);
  
  const isUncategorized = folder.id === 'uncategorized';
  
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-6 py-3">
        <div className="flex items-start justify-between">
          <h3 className="text-[13px] font-semibold text-[#202020] flex-1 pr-2">
            {folder.name} Properties
          </h3>
          <button
            onClick={onClose}
            className="shrink-0 p-1 -mt-0.5 text-slate-400 hover:text-slate-600 transition-colors rounded hover:bg-slate-100"
            aria-label="Close properties"
            title="Close properties"
          >
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto p-6">
        <div className="space-y-6">
          {/* Name */}
          <div>
            <Label className="text-[12px] font-medium text-[#202020] mb-2 block">Name</Label>
            {isEditing && !isUncategorized ? (
              <div className="flex gap-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1"
                  autoFocus
                />
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={updateMutation.isPending || !name.trim()}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setName(folder.name);
                  }}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-slate-700">{folder.name}</span>
                {!isUncategorized && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditing(true)}
                    className="h-7 px-2"
                  >
                    Rename
                  </Button>
                )}
              </div>
            )}
          </div>
          
          {/* Add Detail Button */}
          <div>
            <Button
              onClick={onAddDetail}
              className="w-full"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Detail to Category
            </Button>
          </div>
          
          {/* Delete */}
          {!isUncategorized && (
            <div>
              <Label className="text-[12px] font-medium text-[#202020] mb-2 block text-red-600">Danger Zone</Label>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteConfirmOpen(true)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Category
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to delete "{folder.name}"? This action cannot be undone.
              {folder.files.length > 0 && (
                <span className="block mt-2 text-red-600">
                  Warning: This category contains {folder.files.length} file(s). All files must be deleted or moved first.
                </span>
              )}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending || folder.files.length > 0}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

// Main Team Detail Library View component
export const TeamDetailLibraryView = memo(function TeamDetailLibraryView() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<any>(null);
  const [selectedFolder, setSelectedFolder] = useState<{ id: string; name: string; subfolder: DetailLibrarySubfolder | null; files: DetailLibraryFile[] } | null>(null);
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const [expandedFileIds, setExpandedFileIds] = useState<Set<string>>(new Set());
  const [loadingFiles, setLoadingFiles] = useState<Set<string>>(new Set());
  const [fileItemsMap, setFileItemsMap] = useState<Record<string, DetailLibraryItem[]>>({});
  const [addFileDialogOpen, setAddFileDialogOpen] = useState(false);
  const [subfolderMode, setSubfolderMode] = useState<'existing' | 'new'>('existing');
  const [selectedSubfolderId, setSelectedSubfolderId] = useState<string>('');
  const [newSubfolderName, setNewSubfolderName] = useState('');
  const [scaleMode, setScaleMode] = useState<'NTS' | 'custom'>('NTS');
  const [customScale, setCustomScale] = useState<string>('');

  // Preview width state with localStorage persistence
  const WIDTH_KEY = 'team:detailPreviewWidth';
  const DEFAULT_PREVIEW_WIDTH = 480;
  const MIN_PREVIEW_WIDTH = 320;
  const MAX_PREVIEW_WIDTH = 1400;

  const [previewWidth, setPreviewWidth] = useState(() => {
    try {
      const raw = localStorage.getItem(WIDTH_KEY);
      return raw ? JSON.parse(raw) : DEFAULT_PREVIEW_WIDTH;
    } catch {
      return DEFAULT_PREVIEW_WIDTH;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(WIDTH_KEY, JSON.stringify(previewWidth));
    } catch {}
  }, [previewWidth]);

  // Fetch categories from database
  const { data: categories = [], isLoading: categoriesLoading } = useDetailLibraryCategories();
  
  // Set default category when categories load
  useEffect(() => {
    if (categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  // Fetch subfolders for selected category
  const { data: subfolders = [] } = useDetailLibrarySubfolders(selectedCategoryId || undefined);
  
  // Fetch files for selected category (no subfolder filtering - we'll group by subfolder in UI)
  const { data: files = [], isLoading: filesLoading } = useDetailLibraryFiles(
    selectedCategoryId || undefined,
    undefined // No subfolder filtering
  );

  // Handle items loaded callback - use ref to avoid dependency issues
  const handleItemsLoadedRef = useRef<(fileId: string, items: DetailLibraryItem[]) => void>();
  handleItemsLoadedRef.current = (fileId: string, items: DetailLibraryItem[]) => {
    setFileItemsMap((prev) => ({ ...prev, [fileId]: items }));
    setLoadingFiles((prev) => {
      const next = new Set(prev);
      next.delete(fileId);
      return next;
    });
  };

  const handleItemsLoaded = useCallback((fileId: string, items: DetailLibraryItem[]) => {
    handleItemsLoadedRef.current?.(fileId, items);
  }, []);

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);
  
  // Determine if selectedDetail is a file or item, and get parent file if item
  const isItem = selectedDetail && 'parentFileId' in selectedDetail;
  const parentFileId = isItem ? (selectedDetail as DetailLibraryItem).parentFileId : null;
  
  // Fetch parent file if selectedDetail is an item
  const { data: parentFile } = useQuery({
    queryKey: ['detail-library-file', parentFileId],
    queryFn: async () => {
      if (!parentFileId) return null;
      const { data, error } = await supabase
        .from('detail_library_files')
        .select('*')
        .eq('id', parentFileId)
        .single();
      if (error) throw error;
      if (!data) return null;
      // Transform to match DetailLibraryFile type
      return {
        id: data.id,
        shortId: data.short_id,
        categoryId: data.category_id,
        subfolderId: data.subfolder_id,
        title: data.title,
        filename: data.filename,
        filesize: data.filesize,
        mimetype: data.mimetype,
        storagePath: data.storage_path,
        colorTag: data.color_tag as DetailColorTag,
        description: data.description,
        authorName: data.author_name,
        scale: data.scale,
        uploadedBy: data.uploaded_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        deletedAt: data.deleted_at,
      } as DetailLibraryFile;
    },
    enabled: !!parentFileId,
  });

  // Get the actual file for determining category and creator
  const actualFile = isItem ? parentFile : (selectedDetail as DetailLibraryFile | null);
  
  // Fetch user name for creator
  const uploadedById = actualFile?.uploadedBy;
  const { data: creatorUser } = useQuery({
    queryKey: ['user', uploadedById],
    queryFn: async () => {
      if (!uploadedById) return null;
      const { data, error } = await supabase
        .from('users')
        .select('name')
        .eq('id', uploadedById)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!uploadedById,
  });

  // Get category name - use selectedCategory if it matches, or find by categoryId
  const detailCategoryId = actualFile?.categoryId;
  const detailCategory = detailCategoryId 
    ? categories.find(c => c.id === detailCategoryId)
    : selectedCategory;
  const categoryName = detailCategory?.name || null;
  
  // Get creator name
  const creatorName = creatorUser?.name || null;
  
  // Get creation date - use item's createdAt if item, otherwise file's createdAt
  const createdAt = selectedDetail?.createdAt || null;
  
  // Get scale - use file's scale (items don't have scale, they inherit from parent file)
  const scale = actualFile?.scale || null;
  
  // Create tabs from database categories
  const libTabs = categories.map((cat) => ({
    key: cat.id,
    label: cat.name,
    icon: (
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M3 7h5l2 2h11v11a2 2 0 0 1-2 2H3z" />
        <path d="M3 7V5a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v2" />
      </svg>
    ),
  }));

  // Transform files into subfolder-grouped structure
  const folders = useMemo(() => {
    const subfolderMap = new Map<string, { subfolder: DetailLibrarySubfolder; files: DetailLibraryFile[] }>();
    const uncategorizedFiles: DetailLibraryFile[] = [];
    
    files.forEach((file) => {
      if (file.subfolderId) {
        const existing = subfolderMap.get(file.subfolderId);
        if (existing) {
          existing.files.push(file);
        } else {
          const subfolder = subfolders.find(s => s.id === file.subfolderId);
          if (subfolder) {
            subfolderMap.set(file.subfolderId, { subfolder, files: [file] });
          }
        }
      } else {
        uncategorizedFiles.push(file);
      }
    });
    
    // Convert map to array of folders
    const result = Array.from(subfolderMap.values()).map(({ subfolder, files }) => ({
      id: subfolder.id,
      name: subfolder.name,
      subfolder: subfolder,
      files: files,
      fileItemsMap: fileItemsMap,
    }));
    
    // Add uncategorized folder if needed
    if (uncategorizedFiles.length > 0) {
      result.push({
        id: 'uncategorized',
        name: 'Uncategorized',
        subfolder: null,
        files: uncategorizedFiles,
        fileItemsMap: fileItemsMap,
      });
    }
    
    return result;
  }, [files, subfolders, fileItemsMap]);

  // Handle folder toggle (subfolder expand/collapse)
  const handleFolderToggle = useCallback((folderId: string) => {
    const isCurrentlyOpen = openFolders[folderId] ?? false;
    setOpenFolders((prev) => ({ ...prev, [folderId]: !isCurrentlyOpen }));
  }, [openFolders]);

  // Handle file expand (to show items within a file)
  const handleFileExpand = useCallback((fileId: string) => {
    const isExpanded = expandedFileIds.has(fileId);
    if (!isExpanded) {
      setExpandedFileIds((prev) => new Set(prev).add(fileId));
      setLoadingFiles((prev) => new Set(prev).add(fileId));
    } else {
      setExpandedFileIds((prev) => {
        const next = new Set(prev);
        next.delete(fileId);
        return next;
      });
    }
  }, [expandedFileIds]);

  // Initialize folders as open when they load
  useEffect(() => {
    if (folders.length > 0 && Object.keys(openFolders).length === 0) {
      const initialOpenFolders: Record<string, boolean> = {};
      folders.forEach((folder) => {
        initialOpenFolders[folder.id] = true;
      });
      setOpenFolders(initialOpenFolders);
    }
  }, [folders, openFolders]);

  // Reset state when category changes (but keep preview open)
  useEffect(() => {
    setOpenFolders({});
    setExpandedFileIds(new Set());
    setFileItemsMap({});
    // Don't clear selectedDetail - keep preview open when switching tabs
    // But clear selectedFolder when switching categories
    setSelectedFolder(null);
    setSubfolderMode('existing');
    setSelectedSubfolderId('');
    setNewSubfolderName('');
    setScaleMode('NTS');
    setCustomScale('');
  }, [selectedCategoryId]);

  // Mutation hooks
  const createSubfolderMutation = useCreateDetailLibrarySubfolder();
  const queryClient = useQueryClient();

  // Handle adding file
  const handleAddFile = useCallback(async (formData: FormData) => {
    if (!selectedCategoryId) return;

    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const colorTag = (formData.get('colorTag') || 'slate') as DetailColorTag;
    const fileInput = formData.get('file') as File | null;
    
    // Get scale value
    const scaleValue = scaleMode === 'NTS' ? 'NTS' : customScale.trim() || null;

    let subfolderId: string | undefined;

    // Handle subfolder selection/creation
    if (subfolderMode === 'new') {
      if (!newSubfolderName.trim()) {
        alert('Please enter a subfolder name');
        return;
      }
      try {
        const created = await createSubfolderMutation.mutateAsync({
          categoryId: selectedCategoryId,
          name: newSubfolderName.trim(),
        });
        subfolderId = created.id;
      } catch (error) {
        console.error('Failed to create subfolder:', error);
        return;
      }
    } else {
      // Allow empty selectedSubfolderId for uncategorized files
      subfolderId = selectedSubfolderId || undefined;
    }

    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      if (fileInput) {
        // Upload file
        const { data: category } = await supabase
          .from('detail_library_categories')
          .select('slug')
          .eq('id', selectedCategoryId)
          .single();
        
        if (!category) throw new Error('Category not found');

        const fileId = crypto.randomUUID();
        const storagePath = `${category.slug}/${fileId}/${fileInput.name}`;

        const { error: uploadError } = await supabase.storage
          .from('detail-library')
          .upload(storagePath, fileInput);

        if (uploadError) throw uploadError;

        const { error: fileError } = await supabase
          .from('detail_library_files')
          .insert([{
            category_id: selectedCategoryId,
            subfolder_id: subfolderId || null,
            title,
            filename: fileInput.name,
            filesize: fileInput.size,
            mimetype: fileInput.type,
            storage_path: storagePath,
            color_tag: colorTag,
            description: description || null,
            scale: scaleValue,
            uploaded_by: user.id,
            short_id: '',
          }]);

        if (fileError) throw fileError;
      } else {
        // Create placeholder card
        const { error } = await supabase
          .from('detail_library_files')
          .insert([{
            category_id: selectedCategoryId,
            subfolder_id: subfolderId || null,
            title,
            filename: `${title.toLowerCase().replace(/\s+/g, '-')}.placeholder`,
            filesize: 0,
            mimetype: 'application/octet-stream',
            storage_path: '',
            color_tag: colorTag,
            description: description || null,
            scale: scaleValue,
            uploaded_by: user.id,
            short_id: '',
          }]);

        if (error) throw error;
      }

      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['detail-library'] });

      setAddFileDialogOpen(false);
      setSubfolderMode('existing');
      setSelectedSubfolderId('');
      setNewSubfolderName('');
      setScaleMode('NTS');
      setCustomScale('');
    } catch (error) {
      console.error('Failed to add file:', error);
      alert(`Failed to add file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [selectedCategoryId, subfolderMode, newSubfolderName, selectedSubfolderId, scaleMode, customScale, createSubfolderMutation, queryClient]);

  // Resizer drag handlers
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current) return;
    const delta = startXRef.current - e.clientX;
    const newWidth = Math.max(MIN_PREVIEW_WIDTH, Math.min(MAX_PREVIEW_WIDTH, startWidthRef.current + delta));
    setPreviewWidth(newWidth);
  }, []);

  const handleMouseUp = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [handleMouseMove]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = previewWidth;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [previewWidth, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [handleMouseMove, handleMouseUp]);

  // Handle detail selection
  const handleOpenDetail = useCallback((item: any) => {
    setSelectedDetail(item);
    setSelectedFolder(null); // Clear folder selection when selecting a detail
    // Persist selection in localStorage
    try {
      if (item?.id) {
        localStorage.setItem('team:selectedDetailId', item.id);
      }
    } catch {}
  }, []);

  // Handle folder selection
  const handleFolderClick = useCallback((folder: { id: string; name: string; subfolder: DetailLibrarySubfolder | null; files: DetailLibraryFile[] }) => {
    setSelectedFolder(folder);
    setSelectedDetail(null); // Clear detail selection when selecting a folder
    try {
      localStorage.removeItem('team:selectedDetailId');
    } catch {}
  }, []);

  // Handle closing preview panel
  const handleClosePreview = useCallback(() => {
    setSelectedDetail(null);
    setSelectedFolder(null);
    try {
      localStorage.removeItem('team:selectedDetailId');
    } catch {}
  }, []);

  // Restore selection from localStorage
  useEffect(() => {
    try {
      const savedId = localStorage.getItem('team:selectedDetailId');
      if (savedId && files.length > 0) {
        // Find item in current folders
        const found = folders.flatMap(f => f.items).find(item => item.id === savedId);
        if (found) {
          setSelectedDetail(found);
        }
      }
    } catch {}
  }, [folders, files.length]);

  if (categoriesLoading) {
    return (
      <div className="px-6 pt-1 pb-12">
        <div className="mt-6 text-sm text-slate-600">Loading categories...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="h-full flex flex-col overflow-hidden">
        {/* Tabs header */}
        <div className="px-6 pt-1 shrink-0 relative z-10">
          <div className="mt-1 mb-3">
            <TabsRow 
              tabs={libTabs} 
              active={selectedCategoryId || ''} 
              onChange={(categoryId) => {
                setSelectedCategoryId(categoryId);
              }} 
            />
          </div>
        </div>

        {selectedCategory && (
          <>
            {/* Grid fills remaining height; resizer + preview are under the tabs */}
            <div 
              className="flex-1 min-h-0 grid items-stretch -mt-3" 
              style={{ 
                gridTemplateColumns: (selectedDetail || selectedFolder) ? `1fr 6px ${previewWidth}px` : '1fr' 
              }}
            >
              {/* Left: scrollable tables */}
              <div className="h-full overflow-auto stable-scroll relative">
                <div className="px-6 py-4">
                  {filesLoading ? (
                    <div className="py-8 text-center text-slate-500 text-sm">Loading files...</div>
                  ) : (
                    <>
                      {/* Load items for expanded folders */}
                      {Array.from(expandedFileIds).map((fileId) => (
                        <FolderItemsLoader
                          key={fileId}
                          fileId={fileId}
                          onItemsLoaded={handleItemsLoaded}
                        />
                      ))}
                      <CategoryVerticalList 
                        folders={folders} 
                        onOpenDetail={handleOpenDetail}
                        onFolderClick={handleFolderClick}
                        onFolderToggle={handleFolderToggle}
                        onFileExpand={handleFileExpand}
                        onAddDetail={() => setAddFileDialogOpen(true)}
                        openFolders={openFolders}
                        expandedFileIds={expandedFileIds}
                        loadingFiles={loadingFiles}
                      />
                    </>
                  )}
                </div>
              </div>
              
              {(selectedDetail || selectedFolder) && (
                <>
                  <Resizer onMouseDown={handleMouseDown} />
                  <aside className="h-full overflow-auto bg-slate-50 border-l border-slate-200 flex flex-col">
                    {selectedFolder ? (
                      <CategoryProperties
                        folder={selectedFolder}
                        categoryId={selectedCategoryId || ''}
                        onClose={handleClosePreview}
                        onAddDetail={() => {
                          setAddFileDialogOpen(true);
                          // Pre-select the subfolder if it exists
                          if (selectedFolder.subfolder) {
                            setSubfolderMode('existing');
                            setSelectedSubfolderId(selectedFolder.subfolder.id);
                          } else {
                            // For uncategorized, allow adding without subfolder
                            setSubfolderMode('existing');
                            setSelectedSubfolderId('');
                          }
                        }}
                      />
                    ) : (
                      <>
                        {/* Title header with white background */}
                        <div className="shrink-0 bg-white border-b border-slate-200 px-6 py-3">
                          <div className="flex items-start justify-between">
                            <h3 className="text-[13px] font-semibold text-[#202020] flex-1 pr-2">
                              {selectedDetail?.title || 'Detail'}
                            </h3>
                            <button
                              onClick={handleClosePreview}
                              className="shrink-0 p-1 -mt-0.5 text-slate-400 hover:text-slate-600 transition-colors rounded hover:bg-slate-100"
                              aria-label="Close preview"
                              title="Close preview"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                width="14"
                                height="14"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M18 6L6 18M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        
                        {/* Image preview */}
                        <div className="flex-1 min-h-0 overflow-auto p-6">
                          <div className="h-full flex flex-col">
                            <div className="flex-1 min-h-0 mb-4">
                              <div className="h-full shadow-sm rounded overflow-hidden">
                                <SimpleImageViewer 
                                  file={selectedDetail}
                                  className="h-full"
                                />
                              </div>
                            </div>
                            
                            {/* Detail Information Card */}
                            <DetailInfoCard 
                              category={categoryName}
                              createdBy={creatorName}
                              createdAt={createdAt}
                              scale={scale}
                              fileId={isItem ? null : (selectedDetail?.id || null)}
                              itemId={isItem ? (selectedDetail?.id || null) : null}
                              onDeleted={handleClosePreview}
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </aside>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Add File Dialog */}
      <Dialog open={addFileDialogOpen} onOpenChange={setAddFileDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add File to {selectedCategory?.name}</DialogTitle>
          </DialogHeader>
          <form
            id="add-file-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleAddFile(new FormData(e.currentTarget));
            }}
            className="space-y-4"
          >
            {/* Subfolder Selection */}
            <div>
              <Label>Category/Subfolder *</Label>
              <RadioGroup value={subfolderMode} onValueChange={(value: 'existing' | 'new') => setSubfolderMode(value)} className="mt-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="existing" id="existing" />
                  <Label htmlFor="existing" className="font-normal cursor-pointer">Select existing</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="new" id="new" />
                  <Label htmlFor="new" className="font-normal cursor-pointer">Create new</Label>
                </div>
              </RadioGroup>
              
              {subfolderMode === 'existing' && (
                <div className="mt-2">
                  <Select value={selectedSubfolderId} onValueChange={setSelectedSubfolderId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a subfolder..." />
                    </SelectTrigger>
                    <SelectContent>
                      {subfolders.length === 0 ? (
                        <SelectItem value="none" disabled>No subfolders available</SelectItem>
                      ) : (
                        subfolders.map((subfolder) => (
                          <SelectItem key={subfolder.id} value={subfolder.id}>
                            {subfolder.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {subfolderMode === 'new' && (
                <div className="mt-2">
                  <Input
                    value={newSubfolderName}
                    onChange={(e) => setNewSubfolderName(e.target.value)}
                    placeholder="Enter category name..."
                  />
                </div>
              )}
            </div>
            
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                name="title"
                required
                placeholder="Enter file title..."
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Enter description (optional)..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="file">File (optional - leave empty to create placeholder)</Label>
              <Input
                id="file"
                name="file"
                type="file"
                accept="image/*,.pdf"
              />
            </div>
            <div>
              <Label>Scale</Label>
              <RadioGroup value={scaleMode} onValueChange={(value: 'NTS' | 'custom') => setScaleMode(value)} className="mt-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="NTS" id="scale-nts" />
                  <Label htmlFor="scale-nts" className="font-normal cursor-pointer">NTS</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="scale-custom" />
                  <Label htmlFor="scale-custom" className="font-normal cursor-pointer">Custom</Label>
                </div>
              </RadioGroup>
              
              {scaleMode === 'custom' && (
                <div className="mt-2">
                  <Input
                    value={customScale}
                    onChange={(e) => setCustomScale(e.target.value)}
                    placeholder="Enter scale (e.g., 1/4 inch = 1 foot)"
                  />
                </div>
              )}
            </div>
            <div>
              <Label>Color Tag</Label>
              <div className="flex gap-2 mt-1">
                {(['slate', 'green', 'amber', 'violet', 'pink', 'cyan'] as DetailColorTag[]).map((color) => (
                  <label key={color} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="colorTag"
                      value={color}
                      defaultChecked={color === 'slate'}
                      className="sr-only"
                    />
                    <div
                      className={`w-6 h-6 rounded-full border-2 ${
                        color === 'slate' ? 'border-slate-400' :
                        color === 'green' ? 'border-green-400' :
                        color === 'amber' ? 'border-amber-400' :
                        color === 'violet' ? 'border-violet-400' :
                        color === 'pink' ? 'border-pink-400' :
                        'border-cyan-400'
                      }`}
                      style={{
                        backgroundColor: color === 'slate' ? '#64748b' :
                          color === 'green' ? '#22c55e' :
                          color === 'amber' ? '#f59e0b' :
                          color === 'violet' ? '#a855f7' :
                          color === 'pink' ? '#ec4899' :
                          '#06b6d4'
                      }}
                    />
                  </label>
                ))}
              </div>
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddFileDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="add-file-form"
              disabled={createSubfolderMutation.isPending}
            >
              {createSubfolderMutation.isPending ? 'Adding...' : 'Add File'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});


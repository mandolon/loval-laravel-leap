// src/components/files/FileExplorer.tsx
// File browser component - folder tree and file table
// Separated from viewer for better architecture

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  File,
  FileText,
  Image as ImageIcon,
  Folder as FolderIcon,
  ChevronRight as ChevronRightIcon,
  AlertCircle,
  CheckCircle2,
  MoreVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Folder, FileRecord, TableItem, UploadingFile } from './types';

// ============================================
// MAIN COMPONENT
// ============================================
interface FileExplorerProps {
  projectId: string;
  onFileSelect: (file: FileRecord) => void;
  selectedFileId?: string | null;
}

export const FileExplorer = ({ projectId, onFileSelect, selectedFileId: externalSelectedFileId }: FileExplorerProps) => {
  // State
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const fileTableRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // ============================================
  // QUERIES
  // ============================================

  // Query: Get all folders for project
  const { data: folders = [], isLoading: foldersLoading } = useQuery({
    queryKey: ['folders', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('is_system_folder', { ascending: false })
        .order('name', { ascending: true });

      if (error) throw error;
      return (data || []) as Folder[];
    },
    enabled: !!projectId,
  });

  // Query: Get files in selected folder
  const { data: files = [], isLoading: filesLoading, refetch: refetchFiles } = useQuery({
    queryKey: ['files', projectId, selectedFolderId],
    queryFn: async () => {
      if (!selectedFolderId) return [];

      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('project_id', projectId)
        .eq('folder_id', selectedFolderId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as FileRecord[];
    },
    enabled: !!projectId && !!selectedFolderId,
  });

  // ============================================
  // MUTATIONS
  // ============================================

  // Mutation: Upload file
  const uploadFileMutation = useMutation({
    mutationFn: async (input: { file: File; folderId: string }) => {
      const { file, folderId } = input;

      // Get current user
      const session = await supabase.auth.getSession();
      const userId = session.data.session?.user.id;
      if (!userId) throw new Error('Not authenticated');

      // Generate unique storage path
      const fileId = crypto.randomUUID();
      const timestamp = Date.now();
      const storagePath = `project/${projectId}/files/${folderId}/${fileId}_${timestamp}_${file.name}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      // Insert file record
      const { data, error: insertError } = await supabase
        .from('files')
        .insert({
          id: fileId,
          short_id: `F-${Math.random().toString(36).substr(2, 4)}`,
          project_id: projectId,
          folder_id: folderId,
          filename: file.name,
          filesize: file.size,
          mimetype: file.type,
          storage_path: storagePath,
          version_number: 1,
          download_count: 0,
          uploaded_by: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        // Cleanup storage on error
        await supabase.storage.from('project-files').remove([storagePath]);
        throw insertError;
      }

      return data as FileRecord;
    },
    onSuccess: () => {
      refetchFiles();
      queryClient.invalidateQueries({ queryKey: ['files', projectId, selectedFolderId] });
    },
  });

  // Mutation: Delete file
  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const { error } = await supabase
        .from('files')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', fileId);

      if (error) throw error;
    },
    onSuccess: () => {
      refetchFiles();
    },
  });

  // Mutation: Download file
  const downloadFileMutation = useMutation({
    mutationFn: async (file: FileRecord) => {
      // Get signed URL
      const { data, error } = await supabase.storage
        .from('project-files')
        .createSignedUrl(file.storage_path, 60);

      if (error) throw error;
      if (!data) throw new Error('No signed URL');

      // Increment download count
      await supabase
        .from('files')
        .update({ download_count: file.download_count + 1 })
        .eq('id', file.id);

      // Trigger download
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = file.filename;
      link.click();
    },
    onSuccess: () => {
      refetchFiles();
      toast.success('Download started');
    },
  });

  // ============================================
  // EFFECTS
  // ============================================

  // Auto-select first system folder
  useEffect(() => {
    if (!selectedFolderId && folders.length > 0) {
      const systemFolder = folders.find(f => f.is_system_folder && !f.parent_folder_id);
      if (systemFolder) {
        setSelectedFolderId(systemFolder.id);
        setExpandedFolders(new Set([systemFolder.id]));
      }
    }
  }, [folders, selectedFolderId]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleFilesDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFiles(false);

    if (!selectedFolderId) {
      toast.error('Please select a folder first');
      return;
    }

    const fileList = e.dataTransfer.files;
    if (fileList.length === 0) return;

    // Process each file
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const uploadId = `${file.name}-${Date.now()}`;

      // Add to uploading queue
      setUploadingFiles(prev => [...prev, {
        id: uploadId,
        filename: file.name,
        progress: 0,
        status: 'pending',
      }]);

      try {
        // Simulate progress
        setUploadingFiles(prev =>
          prev.map(uf => uf.id === uploadId ? { ...uf, status: 'uploading', progress: 30 } : uf)
        );

        // Upload file
        await uploadFileMutation.mutateAsync({
          file,
          folderId: selectedFolderId,
        });

        // Mark complete
        setUploadingFiles(prev =>
          prev.map(uf => uf.id === uploadId ? { ...uf, status: 'complete', progress: 100 } : uf)
        );

        // Remove from queue after 2 seconds
        setTimeout(() => {
          setUploadingFiles(prev => prev.filter(uf => uf.id !== uploadId));
        }, 2000);
      } catch (error) {
        setUploadingFiles(prev =>
          prev.map(uf =>
            uf.id === uploadId
              ? { ...uf, status: 'error', error: error instanceof Error ? error.message : 'Upload failed' }
              : uf
          )
        );
      }
    }
  };

  // ============================================
  // DATA PROCESSING
  // ============================================

  // Build table items (folders + files)
  const tableItems: TableItem[] = [];

  // Add subfolders
  const subfolders = folders.filter(f => f.parent_folder_id === selectedFolderId);
  subfolders.forEach(folder => {
    tableItems.push({
      type: 'folder',
      id: folder.id,
      name: folder.name,
    });
  });

  // Add files
  files.forEach(file => {
    tableItems.push({
      type: 'file',
      id: file.id,
      name: file.filename,
      modifiedDate: file.updated_at,
      filesize: file.filesize || 0,
      mimetype: file.mimetype || '',
      storagePath: file.storage_path,
    });
  });

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="h-full flex bg-background border-t">
      {/* Left: Folder tree sidebar */}
      <div className="w-48 border-r bg-muted/30 overflow-y-auto flex-shrink-0">
          <div className="py-2">
            {foldersLoading ? (
              <div className="p-4 text-sm text-muted-foreground">Loading folders...</div>
            ) : (
              folders
                .filter(f => f.is_system_folder && !f.parent_folder_id)
                .map(folder => (
                  <FolderTreeItem
                    key={folder.id}
                    folder={folder}
                    folders={folders}
                    selectedFolderId={selectedFolderId}
                    onSelectFolder={setSelectedFolderId}
                    expandedFolders={expandedFolders}
                    onToggleExpanded={(id) => {
                      const newExpanded = new Set(expandedFolders);
                      if (newExpanded.has(id)) {
                        newExpanded.delete(id);
                      } else {
                        newExpanded.add(id);
                      }
                      setExpandedFolders(newExpanded);
                    }}
                    depth={0}
                  />
                ))
            )}
        </div>
      </div>

      {/* Right: File table */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
          <div
            ref={fileTableRef}
            onDragEnter={() => setIsDraggingFiles(true)}
            onDragLeave={() => setIsDraggingFiles(false)}
            onDrop={handleFilesDrop}
            onDragOver={(e) => e.preventDefault()}
            className={`flex-1 overflow-auto relative transition-colors ${
              isDraggingFiles ? 'bg-primary/5' : ''
            }`}
          >
            {isDraggingFiles && (
              <div className="absolute inset-0 flex items-center justify-center bg-primary/10 pointer-events-none z-50">
                <div className="text-primary font-medium bg-background px-6 py-4 rounded-lg shadow-lg">
                  Drop files here
                </div>
              </div>
            )}

            {filesLoading ? (
              <div className="p-4 text-sm text-muted-foreground">Loading files...</div>
            ) : (
            <FileTableComponent
              items={tableItems}
              selectedFileId={externalSelectedFileId || null}
              onSelectFile={(fileId) => {
                const file = files.find(f => f.id === fileId);
                if (file) onFileSelect(file);
              }}
              onSelectFolder={setSelectedFolderId}
              onDeleteFile={(fileId) => {
                deleteFileMutation.mutate(fileId);
                toast.success('File deleted');
              }}
              folders={folders}
            />
            )}
          </div>

          {/* Upload Progress */}
          {uploadingFiles.length > 0 && (
            <div className="border-t bg-muted/30 px-4 py-2 space-y-2 flex-shrink-0">
              {uploadingFiles.map(uf => (
                <div key={uf.id} className="flex items-center gap-2">
                  <div className="flex-shrink-0">
                    {uf.status === 'uploading' && <Loader2 className="h-4 w-4 text-primary animate-spin" />}
                    {uf.status === 'complete' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    {uf.status === 'error' && <AlertCircle className="h-4 w-4 text-destructive" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium truncate">{uf.filename}</span>
                      <span className="text-xs text-muted-foreground">{uf.progress}%</span>
                    </div>
                    <Progress value={uf.progress} className="h-1 mt-1" />
                    {uf.error && <p className="text-xs text-destructive mt-1">{uf.error}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
};

// ============================================
// FOLDER TREE ITEM
// ============================================
interface FolderTreeItemProps {
  folder: Folder;
  folders: Folder[];
  selectedFolderId: string | null;
  onSelectFolder: (id: string) => void;
  expandedFolders: Set<string>;
  onToggleExpanded: (id: string) => void;
  depth: number;
}

const FolderTreeItem = ({
  folder,
  folders,
  selectedFolderId,
  onSelectFolder,
  expandedFolders,
  onToggleExpanded,
  depth,
}: FolderTreeItemProps) => {
  const children = folders.filter(f => f.parent_folder_id === folder.id && !f.deleted_at);
  const hasChildren = children.length > 0;

  return (
    <>
      <button
        onClick={() => {
          onSelectFolder(folder.id);
          if (hasChildren) onToggleExpanded(folder.id);
        }}
        className={`w-full flex items-center gap-1 px-3 py-2 text-sm hover:bg-accent/50 transition-colors ${
          selectedFolderId === folder.id ? 'bg-primary/10 text-primary font-medium' : 'text-foreground'
        }`}
        style={{ paddingLeft: `${depth * 12 + 12}px` }}
      >
        {hasChildren ? (
          <ChevronRightIcon
            className={`h-4 w-4 flex-shrink-0 transition-transform ${
              expandedFolders.has(folder.id) ? 'rotate-90' : ''
            }`}
          />
        ) : (
          <div className="w-4" />
        )}
        <FolderIcon className="h-4 w-4 flex-shrink-0" />
        <span className="truncate">{folder.name}</span>
      </button>
      {hasChildren && expandedFolders.has(folder.id) && (
        <>
          {children.map(child => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              folders={folders}
              selectedFolderId={selectedFolderId}
              onSelectFolder={onSelectFolder}
              expandedFolders={expandedFolders}
              onToggleExpanded={onToggleExpanded}
              depth={depth + 1}
            />
          ))}
        </>
      )}
    </>
  );
};

// ============================================
// FILE TABLE
// ============================================
interface FileTableComponentProps {
  items: TableItem[];
  selectedFileId: string | null;
  onSelectFile: (id: string) => void;
  onSelectFolder: (id: string) => void;
  onDeleteFile: (id: string) => void;
  folders: Folder[];
}

const FileTableComponent = ({
  items,
  selectedFileId,
  onSelectFile,
  onSelectFolder,
  onDeleteFile,
}: FileTableComponentProps) => {
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFileType = (mimetype?: string) => {
    if (!mimetype) return 'File';
    if (mimetype === 'application/pdf') return 'PDF';
    if (mimetype.includes('word')) return 'DOCX';
    if (mimetype.includes('sheet')) return 'XLSX';
    if (mimetype.includes('image/jpeg')) return 'JPG';
    if (mimetype.includes('image/png')) return 'PNG';
    return mimetype.split('/')[1]?.toUpperCase() || 'File';
  };

  const getIcon = (item: TableItem) => {
    if (item.type === 'folder') return <FolderIcon className="h-4 w-4 text-primary" />;
    if (!item.mimetype) return <File className="h-4 w-4" />;
    if (item.mimetype.includes('pdf')) return <FileText className="h-4 w-4 text-red-600" />;
    if (item.mimetype.includes('image')) return <ImageIcon className="h-4 w-4 text-primary" />;
    return <File className="h-4 w-4" />;
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Table header */}
      <div className="sticky top-0 grid grid-cols-12 gap-4 px-4 py-3 bg-muted/50 border-b text-xs font-semibold text-muted-foreground uppercase">
        <div className="col-span-6">Name</div>
        <div className="col-span-2">Size</div>
        <div className="col-span-2">Modified</div>
        <div className="col-span-1">Type</div>
        <div className="col-span-1" />
      </div>

      {/* Table rows */}
      <div className="divide-y flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No files or folders in this directory
          </div>
        ) : (
          items.map(item => (
            <div
              key={item.id}
              onClick={() => (item.type === 'file' ? onSelectFile(item.id) : onSelectFolder(item.id))}
              className={`grid grid-cols-12 gap-4 px-4 py-3 hover:bg-accent/50 cursor-pointer transition-colors ${
                selectedFileId === item.id && item.type === 'file' ? 'bg-primary/10' : ''
              }`}
            >
              <div className="col-span-6 flex items-center gap-2 truncate">
                {getIcon(item)}
                <span className="text-sm text-foreground truncate font-medium">{item.name}</span>
              </div>
              <div className="col-span-2 text-sm text-muted-foreground">{formatFileSize(item.filesize)}</div>
              <div className="col-span-2 text-sm text-muted-foreground">{formatDate(item.modifiedDate)}</div>
              <div className="col-span-1 text-sm text-muted-foreground">
                {item.type === 'folder' ? '—' : getFileType(item.mimetype)}
              </div>
              <div className="col-span-1 flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {item.type === 'file' && <DropdownMenuItem>Download</DropdownMenuItem>}
                    {item.type === 'file' && <DropdownMenuItem>Share</DropdownMenuItem>}
                    <DropdownMenuItem>Move</DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => onDeleteFile(item.id)}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer - file info */}
      {items.length > 0 && (
        <div className="px-4 py-2 bg-muted/50 border-t text-xs text-muted-foreground">
          {items.filter(i => i.type === 'file').length} files •{' '}
          {formatFileSize(
            items.filter(i => i.type === 'file').reduce((sum, f) => sum + (f.filesize || 0), 0)
          )}{' '}
          total
        </div>
      )}
    </div>
  );
};

export default FileExplorer;

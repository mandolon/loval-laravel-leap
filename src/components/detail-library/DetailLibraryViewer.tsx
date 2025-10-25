import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  useDetailLibraryCategories, 
  useDetailLibraryFiles, 
  useUpdateDetailFile,
  useUpdateDetailFileColor,
  useDeleteDetailFile,
} from '@/lib/api/hooks/useDetailLibrary';
import SimplePDFViewer from './SimplePDFViewer';
import SimpleImageViewer from './SimpleImageViewer';
import CardEditModal from './CardEditModal';
import { 
  Search, 
  ChevronRight, 
  FileText, 
  Image as ImageIcon, 
  MoreHorizontal,
  Trash,
  Download,
  Folder,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DetailLibraryFile, DetailColorTag } from '@/lib/api/types';

interface DetailLibraryViewerProps {
  workspaceId: string;
}

// Helper functions
const baseTitleFromName = (filename: string) => {
  return filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
};

const firstNameOnly = (name: string) => {
  return name.split(' ')[0];
};

const footerMeta = (file: DetailLibraryFile) => {
  const date = new Date(file.updatedAt);
  const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const author = file.authorName ? firstNameOnly(file.authorName) : 'Unknown';
  return `${formatted} by ${author}`;
};

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const colorMap: Record<DetailColorTag, string> = {
  slate: 'bg-slate-100 dark:bg-slate-900',
  green: 'bg-lime-100 dark:bg-lime-950',
  amber: 'bg-amber-100 dark:bg-amber-950',
  violet: 'bg-violet-100 dark:bg-violet-950',
  pink: 'bg-pink-100 dark:bg-pink-950',
  cyan: 'bg-cyan-100 dark:bg-cyan-950',
};

const swatchBg: Record<DetailColorTag, string> = {
  slate: 'bg-slate-300',
  green: 'bg-lime-300',
  amber: 'bg-amber-300',
  violet: 'bg-violet-300',
  pink: 'bg-pink-300',
  cyan: 'bg-cyan-300',
};

export default function DetailLibraryViewer({ workspaceId }: DetailLibraryViewerProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [editModalState, setEditModalState] = useState<{
    open: boolean;
    file?: any;
    categoryId?: string;
  }>({ open: false });

  const [tempTitle, setTempTitle] = useState('');
  const [tempDescription, setTempDescription] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Fetch data
  const { data: categories = [] } = useDetailLibraryCategories(workspaceId);
  const { data: files = [] } = useDetailLibraryFiles(workspaceId, selectedCategoryId || undefined);

  const updateFileMutation = useUpdateDetailFile();
  const updateColorMutation = useUpdateDetailFileColor();
  const deleteFileMutation = useDeleteDetailFile();

  // Auto-select first category
  useEffect(() => {
    if (!selectedCategoryId && categories.length > 0) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  // Reset selection when category changes
  useEffect(() => {
    setSelectedFileId(null);
  }, [selectedCategoryId]);

  // Update temp values when selected file changes
  useEffect(() => {
    const file = files.find((f) => f.id === selectedFileId);
    if (file) {
      setTempTitle(file.title);
      setTempDescription(file.description || '');
    } else {
      setTempTitle('');
      setTempDescription('');
    }
  }, [selectedFileId, files]);

  // Fetch signed URL for preview
  useEffect(() => {
    const file = files.find((f) => f.id === selectedFileId);
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const fetchUrl = async () => {
      const { data } = await supabase.storage
        .from('detail-library')
        .createSignedUrl(file.storagePath, 3600);
      setPreviewUrl(data?.signedUrl || null);
    };

    fetchUrl();
  }, [selectedFileId, files]);

  const selectedFile = files.find((f) => f.id === selectedFileId);
  const activeCategory = categories.find((c) => c.id === selectedCategoryId);

  const filteredFiles = files.filter((file) =>
    file.title.toLowerCase().includes(query.toLowerCase())
  );

  const handleFileClick = (fileId: string) => {
    setSelectedFileId(fileId);
  };

  const handleSaveMeta = async (fileId: string, updates: { title?: string; description?: string }) => {
    try {
      await updateFileMutation.mutateAsync({ fileId, ...updates });
    } catch (error) {
      console.error('Error updating file:', error);
    }
  };

  const handleColorChange = async (fileId: string, colorTag: DetailColorTag) => {
    try {
      await updateColorMutation.mutateAsync({ fileId, colorTag });
    } catch (error) {
      console.error('Error updating color:', error);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Delete this file?')) return;
    try {
      await deleteFileMutation.mutateAsync({ fileId });
      if (selectedFileId === fileId) {
        setSelectedFileId(null);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  return (
    <div className="w-full mx-auto max-w-7xl p-4 md:p-6">
      {/* Breadcrumbs + Search */}
      <div className="mb-4 md:mb-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center text-sm text-muted-foreground gap-1">
            <span className="font-medium">Detail Library</span>
            {activeCategory && (
              <>
                <ChevronRight className="h-4 w-4 opacity-60" />
                <span>{activeCategory.name}</span>
              </>
            )}
          </div>
          <div role="search" className="relative w-48 sm:w-56 md:w-64 h-8">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 opacity-70" />
            <label htmlFor="lib-search" className="sr-only">Search</label>
            <input
              id="lib-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search details..."
              className="h-8 w-full rounded-xl border border-black/10 bg-white/60 pl-7 pr-3 text-xs outline-none ring-0 placeholder:opacity-60 focus:bg-white focus:shadow-sm dark:bg-neutral-900/60 dark:focus:bg-neutral-900"
            />
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-3 mb-6">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategoryId(category.id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm transition-all",
              selectedCategoryId === category.id
                ? "border-black/10 bg-white shadow-sm dark:bg-neutral-900"
                : "border-black/10 bg-neutral-50 hover:bg-white dark:bg-neutral-800/50 dark:hover:bg-neutral-800"
            )}
          >
            <Folder className="h-4 w-4 opacity-70" />
            <span>{category.name}</span>
          </button>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* LEFT: File Cards */}
        <div className={cn("col-span-12", selectedFileId ? "lg:col-span-5" : "lg:col-span-12")}>
          {filteredFiles.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No files in this category</p>
              <button
                onClick={() => setEditModalState({ open: true, categoryId: selectedCategoryId || undefined })}
                className="mt-4 text-sm text-primary hover:underline"
              >
                Upload your first file
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleFileClick(file.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleFileClick(file.id);
                    }
                  }}
                  className={cn(
                    "group relative h-full flex flex-col text-left rounded-3xl p-3 md:p-4 transition-shadow border border-black/5 shadow-sm hover:shadow-md cursor-pointer",
                    colorMap[file.colorTag],
                    selectedFileId === file.id && "ring-2 ring-primary ring-offset-2"
                  )}
                >
                  {/* 3-dot menu */}
                  <div className="absolute top-2 right-2 transition opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                    <button
                      aria-label="Card menu"
                      className="p-1.5 rounded-md border bg-white/80 backdrop-blur hover:bg-white shadow-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditModalState({ open: true, file, categoryId: selectedCategoryId || undefined });
                      }}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Badge */}
                  <div className="flex items-center gap-2 text-xs opacity-80 min-h-[20px]">
                    {file.mimetype === 'application/pdf' ? (
                      <FileText className="h-4 w-4" />
                    ) : (
                      <ImageIcon className="h-4 w-4" />
                    )}
                    <span>{file.mimetype === 'application/pdf' ? 'Assembly' : 'Detail'}</span>
                  </div>

                  {/* Title - split into 2 lines */}
                  <div className="mt-auto leading-[1.1] min-h-[3.5rem] md:min-h-[4rem] flex flex-col justify-end">
                    <h3 className="text-xl md:text-2xl font-semibold tracking-tight text-neutral-800 dark:text-neutral-200">
                      {file.title.split(' ').slice(0, 2).join(' ')}
                    </h3>
                    <p className="text-xl md:text-2xl font-semibold tracking-tight text-neutral-800 dark:text-neutral-200 min-h-[1.75rem] md:min-h-[2rem]">
                      {file.title.split(' ').slice(2).join(' ')}
                    </p>
                  </div>

                  {/* Footer */}
                  <div className="mt-2 flex items-center justify-between text-xs opacity-80">
                    <span>{footerMeta(file)}</span>
                    <span className="opacity-80">{formatBytes(file.filesize)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Preview Panel */}
        <div className={cn("col-span-12 lg:col-span-7 space-y-3", !selectedFileId && "hidden")}>
          {selectedFile && (
            <>
              {/* Viewer */}
              <div className="rounded-2xl border border-black/10 bg-white/60 overflow-hidden backdrop-blur-sm dark:bg-neutral-900/60">
                {previewUrl && selectedFile.mimetype === 'application/pdf' ? (
                  <SimplePDFViewer file={{ url: previewUrl, name: selectedFile.filename }} />
                ) : previewUrl ? (
                  <SimpleImageViewer file={{ url: previewUrl, name: selectedFile.filename }} />
                ) : (
                  <div className="h-96 flex items-center justify-center text-muted-foreground">
                    Loading preview...
                  </div>
                )}
              </div>

              {/* File Properties */}
              <div className="rounded-2xl border border-black/10 bg-white/60 p-4 backdrop-blur-sm dark:bg-neutral-900/60">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-medium text-muted-foreground">File Properties</h4>
                </div>
                <div className="grid grid-cols-1 md:[grid-template-columns:1.5fr_1fr] gap-6 md:gap-8">
                  {/* Left column */}
                  <dl className="grid grid-cols-3 gap-y-3 text-sm">
                    <dt className="opacity-60">Name</dt>
                    <dd className="col-span-2">
                      <textarea
                        value={tempTitle}
                        onChange={(e) => setTempTitle(e.target.value)}
                        onBlur={() => {
                          if (tempTitle.trim() !== selectedFile.title) {
                            handleSaveMeta(selectedFile.id, { title: tempTitle.trim() });
                          }
                        }}
                        rows={1}
                        className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm font-medium focus:bg-white focus:shadow-sm bg-white/70 dark:bg-neutral-900/60 resize-none overflow-hidden"
                      />
                    </dd>

                    <dt className="opacity-60">Description</dt>
                    <dd className="col-span-2">
                      <textarea
                        value={tempDescription}
                        onChange={(e) => setTempDescription(e.target.value)}
                        onBlur={() => {
                          if (tempDescription.trim() !== (selectedFile.description || '')) {
                            handleSaveMeta(selectedFile.id, { description: tempDescription.trim() });
                          }
                        }}
                        rows={4}
                        className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:bg-white focus:shadow-sm bg-white/70 dark:bg-neutral-900/60"
                      />
                    </dd>
                  </dl>

                  {/* Right column */}
                  <dl className="grid grid-cols-3 gap-y-3 text-sm">
                    <dt className="opacity-60">Type</dt>
                    <dd className="col-span-2">{selectedFile.mimetype === 'application/pdf' ? 'PDF' : 'IMAGE'}</dd>

                    <dt className="opacity-60">Size</dt>
                    <dd className="col-span-2">{formatBytes(selectedFile.filesize)}</dd>

                    <dt className="opacity-60">Updated</dt>
                    <dd className="col-span-2">
                      {new Date(selectedFile.updatedAt).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </dd>

                    <dt className="opacity-60">Author</dt>
                    <dd className="col-span-2">{selectedFile.authorName || '—'}</dd>

                    <dt className="opacity-60">Color</dt>
                    <dd className="col-span-2">
                      <div className="flex gap-2">
                        {(Object.keys(swatchBg) as DetailColorTag[]).map((color) => (
                          <button
                            key={color}
                            onClick={() => handleColorChange(selectedFile.id, color)}
                            className={cn(
                              "w-6 h-6 rounded-full transition-all",
                              swatchBg[color],
                              selectedFile.colorTag === color && "ring-2 ring-offset-2 ring-foreground"
                            )}
                            aria-label={`Set color to ${color}`}
                          />
                        ))}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    if (previewUrl) {
                      const link = document.createElement('a');
                      link.href = previewUrl;
                      link.download = selectedFile.filename;
                      link.click();
                    }
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => handleDeleteFile(selectedFile.id)}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash className="h-4 w-4" />
                  <span>Delete</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <CardEditModal
        open={editModalState.open}
        onOpenChange={(open) => setEditModalState({ open })}
        file={editModalState.file}
        workspaceId={workspaceId}
        categoryId={editModalState.categoryId || selectedCategoryId || ''}
      />
    </div>
  );
}

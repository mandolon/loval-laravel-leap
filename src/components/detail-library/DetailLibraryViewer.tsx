import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, ChevronLeft, Download, Upload, Search, Folder } from 'lucide-react';
import { FolderT, FileItem, DetailItem, generateDetailList, filterByQuery, clsx, swatchBg, formatBytes, baseTitleFromName } from '@/lib/detail-library-utils';
import CardButton from './CardButton';
import DetailRowButton from './DetailRowButton';
import CardEditModal from './CardEditModal';
import SimpleImageViewer from './SimpleImageViewer';
import CreateCardDialog from './CreateCardDialog';
import { 
  useDetailLibraryCategories,
  useDetailLibraryFiles,
  useDetailLibraryItems,
  useCreateDetailCard,
  useUploadDetailItem,
  useUpdateDetailFile,
  useUpdateDetailFileColor,
} from '@/lib/api/hooks/useDetailLibrary';
import { DetailColorTag } from '@/lib/api/types';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface DetailLibraryViewerProps {}

// For global search we add folder context to files
type FlatFile = FileItem & { folderId: string; folderTitle: string };

const DetailLibraryViewer: React.FC<DetailLibraryViewerProps> = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [editModal, setEditModal] = useState<{ open: boolean; file: FileItem | null; folderId: string | null }>({ open: false, file: null, folderId: null });
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [inlineTitle, setInlineTitle] = useState("");
  const [inlineDesc, setInlineDesc] = useState("");
  const [createCardOpen, setCreateCardOpen] = useState(false);

  // Query hooks
  const { data: categories = [], isLoading: categoriesLoading } = useDetailLibraryCategories();
  const [activeFolderId, setActiveFolderId] = useState<string>('');
  
  useEffect(() => {
    if (categories.length > 0 && !activeFolderId) {
      setActiveFolderId(categories[0].id);
    }
  }, [categories, activeFolderId]);

  const { data: dbFiles = [], isLoading: filesLoading } = useDetailLibraryFiles(
    activeFolderId === 'all' ? undefined : activeFolderId,
    undefined
  );
  const { data: dbItems = [] } = useDetailLibraryItems(selectedId || undefined);

  // Mutation hooks
  const createCardMutation = useCreateDetailCard(activeFolderId);
  const uploadItemMutation = useUploadDetailItem(selectedId || undefined);
  const updateFileMutation = useUpdateDetailFile();
  const updateColorMutation = useUpdateDetailFileColor();

  // Transform categories to FolderT structure
  const folders = useMemo(() => 
    categories.map(cat => ({
      id: cat.id,
      title: cat.name,
      files: dbFiles
        .filter(f => f.categoryId === cat.id)
        .map(f => ({
          id: f.id,
          title: f.title,
          type: f.mimetype.startsWith('image/') ? 'image' as const : 'pdf' as const,
          updated: formatDistanceToNow(new Date(f.updatedAt || f.createdAt), { addSuffix: true }),
          size: formatBytes(f.filesize),
          author: f.authorName || 'Unknown',
          description: f.description || '',
          color: f.colorTag as FileItem['color'],
        }))
    })),
    [categories, dbFiles]
  );

  const activeFolder = useMemo(
    () => folders.find((f) => f.id === activeFolderId) || folders[0],
    [folders, activeFolderId]
  );

  // Flatten all files across folders for global search
  const allFiles: FlatFile[] = useMemo(
    () =>
      folders.flatMap((f) =>
        f.files.map((fl) => ({ ...fl, folderId: f.id, folderTitle: f.title }))
      ),
    [folders]
  );

  // Identify the selected file inside the current active folder
  const selectedFile = useMemo(
    () => activeFolder.files.find((f) => f.id === selectedId) || null,
    [activeFolder, selectedId]
  );

  // Sync inline editors with the currently selected file
  useEffect(() => {
    setInlineTitle(selectedFile?.title ?? "");
    setInlineDesc(selectedFile?.description ?? "");
  }, [selectedFile]);

  // Build per-file details (local) and global details (all files) for search
  const detailList = useMemo(() => {
    if (!selectedFile) return [];
    const generated = generateDetailList(selectedFile);
    const custom: DetailItem[] = dbItems.map(item => ({
      id: item.id,
      title: item.title,
      type: item.mimetype.startsWith('image/') ? 'image' : 'pdf',
      updated: formatDistanceToNow(new Date(item.updatedAt || item.createdAt), { addSuffix: true }),
      size: formatBytes(item.filesize),
      author: selectedFile.author,
    }));
    return [...generated, ...custom];
  }, [selectedFile, dbItems]);
  const allDetails: (DetailItem & { baseId: string; folderId: string })[] = useMemo(
    () =>
      allFiles.flatMap((fl) => {
        const generated = generateDetailList(fl).map((d) => ({ ...d, baseId: fl.id, folderId: fl.folderId }));
        return [...generated];
      }),
    [allFiles]
  );

  // Derive selected detail by ID from the local list (after switching files it will match)
  const selectedDetail = useMemo(
    () => detailList.find((d) => d.id === selectedDetailId) || null,
    [detailList, selectedDetailId]
  );

  const previewTarget = selectedDetail || selectedFile;

  async function handleUploadToFolder(folderId: string, fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    
    if (!selectedFile) {
      toast.error('Please select a card first');
      return;
    }

    try {
      const filesArray = Array.from(fileList);
      for (const file of filesArray) {
        await uploadItemMutation.mutateAsync({
          parentFileId: selectedFile.id,
          file,
          title: baseTitleFromName(file.name),
        });
      }
    } catch (error) {
      console.error('Upload failed:', error);
    }
  }

  async function handleSaveMeta(fileId: string, patch: Partial<Pick<FileItem, "title" | "color" | "type" | "description">>) {
    try {
      if (patch.title !== undefined || patch.description !== undefined) {
        await updateFileMutation.mutateAsync({
          fileId,
          title: patch.title,
          description: patch.description,
        });
      }
      
      if (patch.color) {
        await updateColorMutation.mutateAsync({ 
          fileId, 
          colorTag: patch.color as DetailColorTag
        });
      }
    } catch (error) {
      console.error('Update failed:', error);
    }
  }

  async function handleCreateCard(title: string, colorTag: DetailColorTag, description: string) {
    try {
      await createCardMutation.mutateAsync({
        title,
        colorTag,
        description,
        authorName: 'You',
      });
    } catch (error) {
      console.error('Create failed:', error);
    }
  }

  // Global-filtered details only (query applies to lists, not cards)
  const filteredDetails = useMemo(
    () => filterByQuery(allDetails, query) as (DetailItem & { baseId: string; folderId: string })[],
    [allDetails, query]
  );

  const visibleDetails = useMemo(
    () => (query ? filteredDetails : detailList).filter((d) => !dismissedIds.has(d.id)),
    [query, filteredDetails, detailList, dismissedIds]
  );

  // Card grid shows current folder
  const filesToShow: (FileItem | FlatFile)[] = activeFolder.files;

  const placeholder = "Search details...";

  if (categoriesLoading || filesLoading) {
    return (
      <div className="w-full p-4 md:p-6 min-h-full flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="w-full p-4 md:p-6 min-h-full">
      {/* Header + Breadcrumbs */}
      <div className="mb-4 md:mb-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center text-sm text-muted-foreground gap-1">
            <span className="font-medium">Detail Library</span>
            <ChevronRight className="h-4 w-4 opacity-60" />
            <span>{activeFolder.title}</span>
            {selectedFile && (
              <>
                <ChevronRight className="h-4 w-4 opacity-60" />
                <span>{selectedFile.title}</span>
              </>
            )}
          </div>
          {/* Inline, compact search on the same row (top-right aligned) */}
          <div role="search" className="relative w-48 sm:w-56 md:w-64 h-8">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 opacity-70" />
            <label htmlFor="lib-search" className="sr-only">Search</label>
            <input
              id="lib-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="h-8 w-full rounded-xl border border-black/10 bg-white/60 pl-7 pr-3 text-xs outline-none ring-0 placeholder:opacity-60 focus:bg-white focus:shadow-sm dark:bg-neutral-900/60 dark:focus:bg-neutral-900"
            />
          </div>
        </div>
      </div>

      {/* Folder Switcher */}
      <div className="flex flex-wrap gap-3 mb-6">
        {folders.map((folder) => (
          <button
            key={folder.id}
            onClick={() => {
              setActiveFolderId(folder.id);
              setSelectedId(null);
              setSelectedDetailId(null);
            }}
            className={clsx(
              "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm transition-all",
              activeFolderId === folder.id
                ? "border-black/10 bg-white shadow-sm dark:bg-neutral-900"
                : "border-black/10 bg-neutral-50 hover:bg-white dark:bg-neutral-800/50 dark:hover:bg-neutral-800"
            )}
          >
            <Folder className="h-4 w-4 opacity-70" />
            <span>{folder.title}</span>
          </button>
        ))}
        <button
          onClick={() => setCreateCardOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-dashed border-black/20 px-4 py-2 text-sm hover:border-black/30 hover:bg-white dark:hover:bg-neutral-800"
        >
          <Folder className="h-4 w-4 opacity-70" />
          <span>Add Card</span>
        </button>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-12 gap-6">
        {/* LEFT: Cards Grid */}
        <div className={clsx("col-span-12", selectedFile ? "lg:col-span-5" : "lg:col-span-12")}>          
          {!selectedFile ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filesToShow.map((file) => (
                <CardButton
                  key={file.id}
                  file={file}
                  parentFolderId={activeFolderId}
                  onClick={() => {
                    setSelectedId(file.id);
                    setSelectedDetailId(null);
                  }}
                  onOpenEdit={(f, folderId) => setEditModal({ open: true, file: f, folderId })}
                  folderCount={activeFolder.files.length}
                />
              ))}
              {filesToShow.length === 0 && (
                <div className="col-span-full text-sm text-muted-foreground p-4 border border-dashed rounded-xl">
                  No results.
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between h-10">
                <button
                  onClick={() => {
                    setSelectedId(null);
                    setSelectedDetailId(null);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Back</span>
                    </button>
                <div className="text-sm text-muted-foreground">{visibleDetails.length} items</div>
                  </div>

              <div className="space-y-2">
                {visibleDetails.map((d) => (
                  <DetailRowButton
                    key={d.id}
                    detail={d}
                    active={d.id === selectedDetailId}
                    onClick={() => {
                      const g: any = d as any;
                      if (g.baseId) setSelectedId(g.baseId);
                      setSelectedDetailId(d.id);
                    }}
                    onDelete={() => setDismissedIds((prev) => { const s = new Set(prev); s.add(d.id); return s; })}
                  />
                ))}
                {visibleDetails.length === 0 && (
                  <div className="text-sm text-muted-foreground p-3 border border-dashed rounded-xl">
                    No details match.
                  </div>
                )}
                </div>
            </div>
          )}
        </div>

        {/* RIGHT: Preview Panel */}
        <div className={clsx("col-span-12 lg:col-span-7 space-y-3", !selectedFile && "hidden")}>          
          <div className="flex items-center justify-between h-10">
            <div className="flex items-center gap-2">
              <input
                ref={uploadInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleUploadToFolder(activeFolderId, e.target.files)}
              />
              <button
                disabled={!selectedFile}
                onClick={() => uploadInputRef.current?.click()}
                className={clsx(
                  "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm",
                  selectedFile
                    ? "border-black/10 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    : "border-black/10 opacity-50"
                )}
              >
                <Upload className="h-4 w-4" />
                <span>Upload</span>
              </button>
            </div>
            <button
              disabled={!previewTarget}
              className={clsx(
                "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm",
                previewTarget
                  ? "border-black/10 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  : "border-black/10 opacity-50"
              )}
            >
              <Download className="h-4 w-4" />
              <span>Download</span>
            </button>
          </div>

          {/* Preview box */}
          <div className="rounded-2xl border border-black/10 bg-neutral-50 dark:bg-neutral-900 aspect-[4/3] w-full flex items-center justify-center overflow-hidden">
            {previewTarget ? (
              <SimpleImageViewer file={previewTarget} className="w-full h-full" />
            ) : (
              <div className="text-sm text-muted-foreground">
                {selectedFile ? "Select a detail to preview" : "Select a card to preview"}
              </div>
            )}
          </div>

              {/* File Properties */}
              <div className="rounded-2xl border border-black/10 bg-white/60 p-4 backdrop-blur-sm dark:bg-neutral-900/60">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-medium text-muted-foreground">File Properties</h4>
              <div />
                </div>
                <div className="grid grid-cols-1 md:[grid-template-columns:1.5fr_1fr] gap-6 md:gap-8">
                  {/* Left column */}
                  <dl className="grid grid-cols-3 gap-y-3 text-sm">
                    <dt className="opacity-60">Name</dt>
                    <dd className="col-span-2">
                  {selectedFile ? (
                      <textarea
                      aria-label="Edit title"
                      value={inlineTitle}
                      onChange={(e) => setInlineTitle(e.target.value)}
                      onBlur={() => selectedFile && handleSaveMeta(selectedFile.id, { title: inlineTitle.trim() || selectedFile.title })}
                        rows={1}
                        className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm font-medium focus:bg-white focus:shadow-sm bg-white/70 dark:bg-neutral-900/60 resize-none overflow-hidden"
                      />
                  ) : ("—")}
                    </dd>

                    <dt className="opacity-60">Description</dt>
                    <dd className="col-span-2">
                  {selectedFile ? (
                      <textarea
                      aria-label="Edit description"
                      value={inlineDesc}
                      onChange={(e) => setInlineDesc(e.target.value)}
                      onBlur={() => selectedFile && handleSaveMeta(selectedFile.id, { description: inlineDesc.trim() })}
                        rows={4}
                        className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:bg-white focus:shadow-sm bg-white/70 dark:bg-neutral-900/60"
                      />
                  ) : ("—")}
                    </dd>
                  </dl>

                  {/* Right column */}
                  <dl className="grid grid-cols-3 gap-y-3 text-sm">
                    <dt className="opacity-60">Type</dt>
                <dd className="col-span-2">
                  {previewTarget ? previewTarget.type.toUpperCase() : "—"}
                </dd>

                    <dt className="opacity-60">Size</dt>
                <dd className="col-span-2">
                  {previewTarget ? previewTarget.size : "—"}
                </dd>

                    <dt className="opacity-60">Updated</dt>
                    <dd className="col-span-2">
                  {previewTarget ? previewTarget.updated : "—"}
                    </dd>

                    <dt className="opacity-60">Author</dt>
                <dd className="col-span-2">
                  {previewTarget ? previewTarget.author : "—"}
                </dd>

                    <dt className="opacity-60">Color</dt>
                    <dd className="col-span-2">
                  {previewTarget && 'color' in previewTarget ? (
                    <span className={clsx(
                      "inline-flex items-center gap-2 rounded-md border px-2 py-0.5 text-xs text-black/70 dark:text-white/80 border-black/10",
                      swatchBg[(previewTarget as any).color as keyof typeof swatchBg] || "bg-neutral-200"
                    )}>
                      <span className="h-2 w-2 rounded-full bg-current" />
                      <span className="capitalize">{(previewTarget as any).color}</span>
                    </span>
                  ) : (
                    "—"
                  )}
                    </dd>
                  </dl>
                </div>
              </div>
        </div>
      </div>

      {/* Modal Mount */}
      <CardEditModal
        open={editModal.open}
        file={editModal.file}
        folderId={editModal.folderId}
        onClose={() => setEditModal({ open: false, file: null, folderId: null })}
        onSave={handleSaveMeta}
        onUpload={handleUploadToFolder}
      />

      <CreateCardDialog
        open={createCardOpen}
        categoryId={activeFolderId}
        onClose={() => setCreateCardOpen(false)}
        onCreate={handleCreateCard}
      />
    </div>
  );
};

export default DetailLibraryViewer;
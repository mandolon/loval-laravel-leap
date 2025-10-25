import React, { useEffect, useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { FileItem, COLOR_KEYS, swatchBg, clsx } from '@/lib/detail-library-utils';

interface CardEditModalProps {
  open: boolean;
  file: FileItem | null;
  folderId: string | null;
  onClose: () => void;
  onSave: (fileId: string, patch: Partial<Pick<FileItem, "title" | "color" | "type" | "description">>) => void;
  onUpload: (folderId: string, files: FileList | null) => void;
}

const CardEditModal: React.FC<CardEditModalProps> = ({
  open,
  file,
  folderId,
  onClose,
  onSave,
  onUpload,
}) => {
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [color, setColor] = useState<FileItem["color"]>("slate");
  const [type, setType] = useState<FileItem["type"]>("pdf");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (file) {
      setTitle(file.title);
      setColor(file.color);
      setType(file.type);
      setDescription(file.description ?? "");
    }
  }, [file, open]);

  if (!open || !file || !folderId) return null;

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const files = e.dataTransfer.files;
    onUpload(folderId, files);
  }

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border bg-white p-4 shadow-xl dark:bg-neutral-900">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium">Edit Card</div>
            <button className="p-1 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-800" onClick={onClose} aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Title */}
          <label className="block text-xs opacity-70 mb-1">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full mb-3 rounded-lg border border-black/10 px-3 py-2 text-sm focus:bg-white focus:shadow-sm bg-white/70 dark:bg-neutral-900/60"
          />

          {/* Description */}
          <label className="block text-xs opacity-70 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full mb-3 rounded-lg border border-black/10 px-3 py-2 text-sm focus:bg-white focus:shadow-sm bg-white/70 dark:bg-neutral-900/60"
          />

          {/* Badge/Type */}
          <label className="block text-xs opacity-70 mb-1">Badge</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as FileItem["type"])}
            className="w-full mb-3 rounded-lg border border-black/10 px-3 py-2 text-sm bg-white/70 dark:bg-neutral-900/60"
          >
            <option value="pdf">Assembly (PDF)</option>
            <option value="image">Detail (Image)</option>
          </select>

          {/* Color */}
          <div className="mb-3">
            <div className="text-xs opacity-70 mb-1">Color</div>
            <div className="grid grid-cols-6 gap-2">
              {COLOR_KEYS.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={c}
                  className={clsx("h-7 w-7 rounded-md border", swatchBg[c], c === color && "ring-2 ring-black/30")}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          {/* Upload */}
          <div
            className="mb-4 rounded-lg border border-dashed border-black/15 p-3 text-xs text-muted-foreground"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <input
              ref={hiddenInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => onUpload(folderId, e.target.files)}
            />
            <div className="flex items-center justify-between gap-3">
              <div>
                Drop files here to upload to this folder.
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs hover:bg-neutral-50 dark:hover:bg-neutral-800"
                onClick={() => hiddenInputRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5" />
                Select files
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-md border px-3 py-1.5 text-sm bg-black text-white border-black hover:bg-black/90 dark:bg-white dark:text-black dark:border-white/80"
              onClick={() => {
                onSave(file.id, { title: title.trim() || file.title, color, type, description: description.trim() });
                onClose();
              }}
            >
              Save changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardEditModal;
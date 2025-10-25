import { useState } from 'react';
import { useUploadDetailFile, useUpdateDetailFile } from '@/lib/api/hooks/useDetailLibrary';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CardEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: any;
  workspaceId: string;
  categoryId: string;
}

const swatchBg = {
  slate: "bg-slate-300",
  green: "bg-lime-300",
  amber: "bg-amber-300",
  violet: "bg-violet-300",
  pink: "bg-pink-300",
  cyan: "bg-cyan-300",
};

export default function CardEditModal({
  open,
  onOpenChange,
  file,
  workspaceId,
  categoryId,
}: CardEditModalProps) {
  const [title, setTitle] = useState(file?.title || '');
  const [description, setDescription] = useState(file?.description || '');
  const [authorName, setAuthorName] = useState(file?.authorName || '');
  const [colorTag, setColorTag] = useState(file?.colorTag || 'slate');
  const [uploading, setUploading] = useState(false);

  const uploadMutation = useUploadDetailFile(workspaceId, categoryId);
  const updateMutation = useUpdateDetailFile();

  const handleSave = async () => {
    if (!file) return;

    try {
      await updateMutation.mutateAsync({
        fileId: file.id,
        title: title.trim(),
        description: description.trim(),
        authorName: authorName.trim(),
      });
      
      toast.success('Details updated successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating file:', error);
      toast.error('Failed to update details');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const fileArray = Array.from(files);
      await uploadMutation.mutateAsync({
        files: fileArray,
        title: title.trim() || fileArray[0].name,
        description: description.trim(),
        authorName: authorName.trim(),
        colorTag: colorTag as any,
      });
      
      toast.success(`${files.length} file(s) uploaded successfully`);
      onOpenChange(false);
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{file ? 'Edit Details' : 'Upload Files'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter title..."
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description..."
              rows={3}
            />
          </div>

          {/* Author Name */}
          <div>
            <Label htmlFor="author">Author Name</Label>
            <Input
              id="author"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Enter author name..."
            />
          </div>

          {/* Color Swatches */}
          <div>
            <Label>Color Tag</Label>
            <div className="flex gap-2 mt-2">
              {Object.keys(swatchBg).map((color) => (
                <button
                  key={color}
                  className={cn(
                    "w-10 h-10 rounded-full transition-all",
                    swatchBg[color as keyof typeof swatchBg],
                    colorTag === color && "ring-2 ring-offset-2 ring-foreground"
                  )}
                  onClick={() => setColorTag(color)}
                />
              ))}
            </div>
          </div>

          {/* File Upload (only for new files) */}
          {!file && (
            <div>
              <Label>Upload Files</Label>
              <div className="mt-2 border-2 border-dashed border-border rounded-lg p-6 text-center">
                <input
                  type="file"
                  id="file-upload"
                  multiple
                  accept="application/pdf,image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PDF or images (multiple files supported)
                  </p>
                </label>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {file && (
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

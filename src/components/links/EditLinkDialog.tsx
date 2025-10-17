import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateLink } from '@/lib/api/hooks/useLinks';
import { UpdateLinkInputSchema } from '@/lib/api/schemas';
import type { Link } from '@/lib/api/types';
import { z } from 'zod';

interface EditLinkDialogProps {
  link: Link | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditLinkDialog = ({ link, open, onOpenChange }: EditLinkDialogProps) => {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<{ title?: string; url?: string; description?: string }>({});

  const updateLinkMutation = useUpdateLink();

  useEffect(() => {
    if (link) {
      setTitle(link.title);
      setUrl(link.url);
      setDescription(link.description || '');
    }
  }, [link]);

  const validateForm = (): boolean => {
    try {
      UpdateLinkInputSchema.parse({
        title: title.trim(),
        url: url.trim(),
        description: description.trim() || undefined,
      });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors: { title?: string; url?: string; description?: string } = {};
        error.errors.forEach((err) => {
          const field = err.path[0] as 'title' | 'url' | 'description';
          formattedErrors[field] = err.message;
        });
        setErrors(formattedErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!link || !validateForm()) {
      return;
    }

    const trimmedTitle = title.trim();
    const trimmedUrl = url.trim();
    const trimmedDescription = description.trim();

    updateLinkMutation.mutate(
      {
        id: link.id,
        input: {
          title: trimmedTitle,
          url: trimmedUrl,
          description: trimmedDescription || undefined,
        },
      },
      {
        onSuccess: () => {
          setErrors({});
          onOpenChange(false);
        },
      }
    );
  };

  const handleCancel = () => {
    if (link) {
      setTitle(link.title);
      setUrl(link.url);
      setDescription(link.description || '');
    }
    setErrors({});
    onOpenChange(false);
  };

  if (!link) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Link</DialogTitle>
          <DialogDescription>
            Update the link information
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Design Reference"
                maxLength={255}
                className={errors.title ? 'border-destructive' : ''}
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-url">
                URL <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                maxLength={2048}
                className={errors.url ? 'border-destructive' : ''}
              />
              {errors.url && (
                <p className="text-sm text-destructive">{errors.url}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description..."
                maxLength={500}
                rows={3}
                className={errors.description ? 'border-destructive' : ''}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {description.length}/500 characters
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={updateLinkMutation.isPending}
            >
              {updateLinkMutation.isPending ? 'Updating...' : 'Update Link'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

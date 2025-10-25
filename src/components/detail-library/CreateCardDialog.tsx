import React, { useState } from 'react';
import { X } from 'lucide-react';
import { DetailColorTag } from '@/lib/api/types';
import { swatchBg, clsx } from '@/lib/detail-library-utils';

interface CreateCardDialogProps {
  open: boolean;
  categoryId: string;
  onClose: () => void;
  onCreate: (title: string, colorTag: DetailColorTag, description: string) => Promise<void>;
}

const COLOR_OPTIONS: DetailColorTag[] = ['slate', 'green', 'amber', 'violet', 'pink', 'cyan'];

const CreateCardDialog: React.FC<CreateCardDialogProps> = ({ open, categoryId, onClose, onCreate }) => {
  const [title, setTitle] = useState('');
  const [colorTag, setColorTag] = useState<DetailColorTag>('slate');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  if (!open) return null;

  async function handleCreate() {
    if (!title.trim()) return;
    setCreating(true);
    try {
      await onCreate(title.trim(), colorTag, description.trim());
      setTitle('');
      setColorTag('slate');
      setDescription('');
      onClose();
    } catch (error) {
      console.error('Create failed:', error);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-6 shadow-xl dark:bg-neutral-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Create New Card</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter card title"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-black/20 focus:outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Color Tag</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  onClick={() => setColorTag(color)}
                  className={clsx(
                    'rounded-lg border px-3 py-1.5 text-xs capitalize transition-all',
                    swatchBg[color as keyof typeof swatchBg] || 'bg-neutral-200',
                    colorTag === color ? 'border-black/20 shadow-sm' : 'border-black/10 opacity-60 hover:opacity-100'
                  )}
                >
                  {color}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description"
              rows={3}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-black/20 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={creating}
            className="flex-1 rounded-lg border border-black/10 px-4 py-2 text-sm hover:bg-neutral-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!title.trim() || creating}
            className="flex-1 rounded-lg bg-black px-4 py-2 text-sm text-white hover:bg-black/90 disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Card'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateCardDialog;

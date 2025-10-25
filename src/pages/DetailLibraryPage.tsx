import React, { useState } from 'react';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { useDetailLibraryCategories } from '@/lib/api/hooks';
import DetailLibraryPreviewPane from '@/components/detail-library/DetailLibraryPreviewPane';
import { Loader2 } from 'lucide-react';

const DetailLibraryPage = () => {
  const { activeWorkspaceId } = useWorkspaces();
  const { data: categories, isLoading } = useDetailLibraryCategories(activeWorkspaceId || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  if (!activeWorkspaceId) {
    return (
      <div className="h-full w-full flex items-center justify-center text-muted-foreground">
        No workspace selected
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full w-full text-[12px] overflow-hidden pb-6 pr-1">
      <div className="min-h-0 min-w-0 grid grid-rows-[auto_1fr] overflow-hidden h-full">
        {/* Header */}
        <div className="h-9 px-3 border-b border-slate-200 dark:border-[#1d2230] flex items-center bg-white dark:bg-[#0E1118]">
          <span className="text-[12px] font-medium">Detail Library</span>
        </div>
        
        {/* Folder Tabs */}
        <div className="border-b border-slate-200 dark:border-[#1d2230] bg-white dark:bg-[#0E1118] p-2">
          <div className="flex gap-2">
            {categories?.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                  selectedCategoryId === cat.id
                    ? 'bg-white dark:bg-[#1d2230] shadow-sm font-medium'
                    : 'hover:bg-slate-100 dark:hover:bg-[#1d2230]'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          <div className="text-center text-muted-foreground">
            <p className="mb-2">Detail Library implementation in progress</p>
            <p className="text-xs">Database schema and API hooks are ready. UI components coming next.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailLibraryPage;

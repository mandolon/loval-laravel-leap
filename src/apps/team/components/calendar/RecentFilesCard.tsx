import React, { useMemo, useState } from 'react';
import { FileItem } from './FileItem';
import { RecentFileItem } from '../../types';
import { RecentFilesProjectFilter } from './RecentFilesProjectFilter';

interface RecentFilesCardProps {
  recentFiles: RecentFileItem[];
  isLoading: boolean;
  containerRef?: React.Ref<HTMLDivElement>;
}

export const RecentFilesCard: React.FC<RecentFilesCardProps> = ({ recentFiles, isLoading, containerRef }) => {
  const [projectFilter, setProjectFilter] = useState<string>('all');

  const projectOptions = useMemo(() => {
    const projects = new Set<string>();
    recentFiles.forEach((file) => {
      if (file.project) projects.add(file.project);
    });
    return Array.from(projects).sort();
  }, [recentFiles]);

  const filteredRecentFiles = useMemo(() => {
    if (projectFilter === 'all') return recentFiles;
    return recentFiles.filter((file) => file.project === projectFilter);
  }, [recentFiles, projectFilter]);

  return (
    <div
      ref={containerRef}
      className='flex-1 rounded-xl border border-neutral-200 bg-white/60 flex flex-col min-w-0 min-h-0 max-h-[400px] lg:max-h-[calc(100vh-14rem)] lg:h-full overflow-hidden'
    >
      <div className='flex items-center justify-between px-3 md:px-4 pt-3 md:pt-4 pb-3 border-b border-neutral-100'>
        <h3 className='text-xs md:text-[13px] font-semibold text-[#202020]'>
          Recent Files
        </h3>
        <RecentFilesProjectFilter
          value={projectFilter}
          options={projectOptions}
          onChange={setProjectFilter}
        />
      </div>

      {/* Table Header - Hidden on mobile */}
      <div className='hidden md:flex items-center gap-4 px-3 md:px-4 pt-2 pb-2 border-b border-neutral-200 shadow-[0_8px_18px_-16px_rgba(0,0,0,0.55)]'>
        <div className='flex-[2] min-w-0'>
          <div className='text-xs text-[#202020] font-normal text-left'>
            File name
          </div>
        </div>
        <div className='flex items-center gap-4 md:shrink-0'>
          <div className='w-32 shrink-0'>
            <div className='text-xs text-[#202020] font-normal text-left'>
              Project
            </div>
          </div>
          <div className='w-24 shrink-0'>
            <div className='text-xs text-[#202020] font-normal text-left'>
              Modified
            </div>
          </div>
        </div>
      </div>

      {/* Table Body */}
      <div className='flex-1 overflow-y-auto scrollbar-hide'>
        {isLoading ? (
          <div className='flex items-center justify-center py-8'>
            <div className='flex items-center gap-2'>
              <div className='w-4 h-4 border-2 border-[#4c75d1] border-t-transparent rounded-full animate-spin' />
              <p className='text-sm text-[#808080]'>Loading files...</p>
            </div>
          </div>
        ) : filteredRecentFiles.length > 0 ? (
          filteredRecentFiles.map((file, index) => (
            <FileItem key={`${file.id}-${index}`} file={file} />
          ))
        ) : (
          <div className='flex items-center justify-center py-8'>
            <p className='text-sm text-[#808080]'>No recent files</p>
          </div>
        )}
      </div>
    </div>
  );
};

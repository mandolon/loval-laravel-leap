import React from 'react';
import { RecentFileItem } from '../../types/calendar';

interface FileItemProps {
  file: RecentFileItem;
}

export const FileItem: React.FC<FileItemProps> = ({ file }) => (
  <div className='flex flex-col md:flex-row md:items-center gap-2 md:gap-4 py-1.5 px-3 md:px-4 hover:bg-neutral-50 active:bg-neutral-100 transition-colors border-b border-neutral-100 last:border-b-0 touch-manipulation cursor-pointer'>
    {/* Extension Icon + Name */}
    <div className='flex items-center gap-3 flex-[2] min-w-0'>
      <div
        className={`w-5 h-5 md:w-4 md:h-4 rounded-md flex items-center justify-center shrink-0 text-[8px] md:text-[7px] font-bold uppercase ${file.colorClass}`}
      >
        {file.ext}
      </div>
      <div className='text-xs text-[#202020] font-medium md:font-normal truncate'>
        {file.name}
      </div>
    </div>

    {/* Mobile: stacked info, Desktop: columns */}
    <div className='flex md:flex md:items-center gap-2 md:gap-4 text-xs pl-11 md:pl-0 md:shrink-0'>
      {/* Project */}
      <div className='flex-1 md:w-32 md:shrink-0'>
        <div className='text-xs text-[#606060] truncate'>
          <span className='md:hidden font-medium'>Project: </span>{file.project}
        </div>
      </div>

      {/* Author */}
      <div className='flex-1 md:w-24 md:shrink-0 md:ml-4'>
        <div className='text-xs text-[#606060] truncate'>
          <span className='md:hidden font-medium'>By: </span>{file.author}
        </div>
      </div>

      {/* Date */}
      <div className='flex-1 md:w-20 md:shrink-0'>
        <div className='text-xs text-[#808080] truncate'>
          {file.date}
        </div>
      </div>
    </div>
  </div>
);

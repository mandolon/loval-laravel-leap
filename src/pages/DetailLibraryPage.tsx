import React from 'react';
import { DESIGN_TOKENS as T } from "@/lib/design-tokens";

const DetailLibraryPage = () => {
  return (
    <div className="h-full w-full text-[12px] overflow-hidden pb-6 pr-1">
      <div className={`${T.panel} ${T.radius} min-h-0 min-w-0 grid grid-rows-[auto_1fr] overflow-hidden h-full`}>
        {/* Header */}
        <div className="h-9 px-3 border-b border-slate-200 dark:border-[#1d2230] flex items-center bg-white dark:bg-[#0E1118]">
          <span className="text-[12px] font-medium">Detail Library</span>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-slate-700 dark:text-neutral-300 mb-4">
                Detail Library
              </h1>
              <p className="text-slate-500 dark:text-neutral-400">
                This page is coming soon...
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailLibraryPage;

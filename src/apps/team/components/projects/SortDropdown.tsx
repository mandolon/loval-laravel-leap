import React, { useState } from 'react';
import { SortOption } from './types';

interface SortDropdownProps {
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
}

export const SortDropdown: React.FC<SortDropdownProps> = ({ sortBy, onSortChange }) => {
  const [sortOpen, setSortOpen] = useState(false);

  const sortLabel =
    sortBy === 'priority' ? 'Priority' : sortBy === 'status' ? 'Status' : 'Start Date';

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <span className="text-[10px] sm:text-xs text-neutral-600">Sort</span>

      {/* Sort dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setSortOpen(!sortOpen)}
          className="
            inline-flex items-center gap-1 sm:gap-1.5
            px-2 sm:px-3 py-1 sm:py-1.5 rounded-md
            text-[10px] sm:text-xs text-neutral-700
            border border-neutral-200 bg-white
            hover:bg-neutral-50
            transition-colors
          "
        >
          <span>{sortLabel}</span>
          <svg width="8" height="5" viewBox="0 0 8 5" fill="currentColor" className="opacity-50">
            <path d="M0 0L4 5L8 0H0Z" />
          </svg>
        </button>

        {sortOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
            <div className="absolute right-0 top-full mt-1 z-20 w-32 sm:w-40 rounded-lg border border-neutral-200 bg-white shadow-lg overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  onSortChange('priority');
                  setSortOpen(false);
                }}
                className={`
                  w-full text-left px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs
                  hover:bg-neutral-50 transition-colors
                  ${
                    sortBy === 'priority'
                      ? 'text-neutral-900 font-medium bg-neutral-50'
                      : 'text-neutral-600'
                  }
                `}
              >
                Priority
              </button>
              <button
                type="button"
                onClick={() => {
                  onSortChange('status');
                  setSortOpen(false);
                }}
                className={`
                  w-full text-left px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs
                  hover:bg-neutral-50 transition-colors
                  ${
                    sortBy === 'status'
                      ? 'text-neutral-900 font-medium bg-neutral-50'
                      : 'text-neutral-600'
                  }
                `}
              >
                Status
              </button>
              <button
                type="button"
                onClick={() => {
                  onSortChange('started');
                  setSortOpen(false);
                }}
                className={`
                  w-full text-left px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs
                  hover:bg-neutral-50 transition-colors
                  ${
                    sortBy === 'started'
                      ? 'text-neutral-900 font-medium bg-neutral-50'
                      : 'text-neutral-600'
                  }
                `}
              >
                Start Date
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

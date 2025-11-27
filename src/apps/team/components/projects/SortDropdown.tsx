import React, { useEffect, useRef, useState } from 'react';
import { SortOption } from './types';

interface SortDropdownProps {
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
}

export const SortDropdown: React.FC<SortDropdownProps> = ({ sortBy, onSortChange }) => {
  const [sortOpen, setSortOpen] = useState(false);
  const [menuWidth, setMenuWidth] = useState<number | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const sortLabel =
    sortBy === 'priority' ? 'Priority' : sortBy === 'status' ? 'Status' : 'Start Date';

  useEffect(() => {
    if (sortOpen && buttonRef.current) {
      setMenuWidth(buttonRef.current.offsetWidth);
    }
  }, [sortOpen]);

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setSortOpen(!sortOpen)}
        className="
          h-7 rounded-md border border-neutral-200 bg-white pl-2 pr-8 text-[11px] text-[#202020] shadow-sm
          hover:bg-neutral-50
          focus:outline-none focus:ring-2 focus:ring-[#4c75d1]/30
          transition-colors cursor-pointer
          inline-flex items-center
        "
        style={{
          paddingRight: '2rem',
        }}
      >
        <span>{sortLabel}</span>
      </button>
      <div className='absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none'>
        <svg
          width='12'
          height='12'
          viewBox='0 0 12 12'
          fill='none'
          xmlns='http://www.w3.org/2000/svg'
          className='text-neutral-400'
        >
          <path
            d='M3 4.5L6 7.5L9 4.5'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
          />
        </svg>
      </div>

      {sortOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
          <div
            className="absolute right-0 top-full mt-1 z-20 rounded-lg border border-neutral-200 bg-white shadow-lg overflow-hidden"
            style={{ width: menuWidth ?? undefined }}
          >
            <button
              type="button"
              onClick={() => {
                onSortChange('priority');
                setSortOpen(false);
              }}
              className={`
                w-full text-left px-2 sm:px-3 py-1.5 sm:py-2 text-[11px]
                hover:bg-neutral-50 transition-colors
                ${
                  sortBy === 'priority'
                    ? 'text-[#202020] font-medium bg-neutral-50'
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
                w-full text-left px-2 sm:px-3 py-1.5 sm:py-2 text-[11px]
                hover:bg-neutral-50 transition-colors
                ${
                  sortBy === 'status'
                    ? 'text-[#202020] font-medium bg-neutral-50'
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
                w-full text-left px-2 sm:px-3 py-1.5 sm:py-2 text-[11px]
                hover:bg-neutral-50 transition-colors
                ${
                  sortBy === 'started'
                    ? 'text-[#202020] font-medium bg-neutral-50'
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
  );
};

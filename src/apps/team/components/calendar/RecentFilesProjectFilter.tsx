import React, { useEffect, useRef } from 'react';

interface RecentFilesProjectFilterProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

export const RecentFilesProjectFilter: React.FC<RecentFilesProjectFilterProps> = ({
  value,
  options,
  onChange,
}) => {
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    console.log('📋 Recent Files Filter:', {
      value,
      optionsCount: options.length,
      options,
      selectElement: selectRef.current,
      selectStyles: selectRef.current ? window.getComputedStyle(selectRef.current) : null,
    });
  }, [value, options]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    console.log('🔄 Filter Change:', {
      oldValue: value,
      newValue: e.target.value,
      options,
    });
    onChange(e.target.value);
  };

  const handleClick = (e: React.MouseEvent<HTMLSelectElement>) => {
    console.log('🖱️ Select Clicked:', {
      value,
      options,
      target: e.target,
      currentTarget: e.currentTarget,
      boundingRect: (e.currentTarget as HTMLSelectElement).getBoundingClientRect(),
    });
  };

  return (
    <div className='relative inline-block'>
      <select
        ref={selectRef}
        value={value}
        onChange={handleChange}
        onClick={handleClick}
        className='h-7 rounded-md border border-neutral-200 bg-white pl-2 pr-8 text-[11px] text-[#202020] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#4c75d1]/30 appearance-none cursor-pointer'
        style={{
          paddingRight: '2rem',
        }}
      >
        <option value='all'>All Projects</option>
        {options.map((project) => (
          <option key={project} value={project}>
            {project}
          </option>
        ))}
      </select>
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
    </div>
  );
};

import React from 'react';

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
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className='h-7 rounded-md border border-neutral-200 bg-white px-2 text-[11px] text-[#202020] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#4c75d1]/30'
    >
      <option value='all'>All Projects</option>
      {options.map((project) => (
        <option key={project} value={project}>
          {project}
        </option>
      ))}
    </select>
  );
};

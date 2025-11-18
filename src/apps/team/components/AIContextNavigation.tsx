import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, Scale, Activity } from 'lucide-react';
import { colors, componentText } from './ProjectPanelTheme';

export function AIContextNavigation() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSection = searchParams.get('aiSection') || 'details';

  const handleSectionChange = (sectionId: string) => {
    setSearchParams(prev => {
      const params = new URLSearchParams(prev);
      params.set('aiSection', sectionId);
      return params;
    });
  };

  const menuItems = [
    { id: 'details', label: 'Project Details', icon: FileText },
    { id: 'regulatory', label: 'Regulatory', icon: Scale },
    { id: 'status', label: 'Current Status', icon: Activity }
  ];

  return (
    <div className="h-full w-full overflow-y-auto no-scrollbar text-[11px] bg-white flex flex-col">
      <div className="flex-1 pt-1.5 pb-2 text-[11px] overflow-auto">
        <div className="px-2.5">
          {/* Section Header */}
          <div className={`flex items-center gap-1 py-[2px] px-1 select-none bg-${colors.bg.section} rounded-lg mb-1`}>
            <span className={componentText.sectionHeader.className}>AI CONTEXT</span>
          </div>
          <div className="mt-1 flex flex-col gap-1">
            {menuItems.map((item) => {
              const active = activeSection === item.id;
              const IconComp = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSectionChange(item.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[13px] ${
                    active ? "bg-[#F5F5F5] text-slate-900" : "hover:bg-[#F9FAFB] text-slate-900"
                  }`}
                >
                  <IconComp className="h-4 w-4 text-slate-600" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

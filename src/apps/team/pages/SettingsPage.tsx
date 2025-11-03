import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { ContentSideMenu } from '../components/settings/ContentSideMenu';
import { SETTINGS_CONSTANTS } from '../lib/settings-constants';

export default function SettingsPage() {
  const location = useLocation();
  
  return (
    <div 
      className="h-full overflow-hidden flex flex-col" 
      style={SETTINGS_CONSTANTS.CSS_VARS}
      data-testid="content-frame"
      data-active-page="settings"
    >
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-slate-200/70 rounded-t-xl">
        <div className="h-10 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-6 w-6 rounded-md border border-slate-200 bg-white grid place-items-center shadow-sm">
              <Settings className="h-4 w-4 text-[var(--muted)]" />
            </div>
            <span 
              data-testid="page-title" 
              className="truncate text-[var(--text)] text-[15px] font-medium"
            >
              Settings
            </span>
          </div>
        </div>
      </div>

      {/* Two-panel layout: ContentSideMenu + Outlet */}
      <div className="flex-1 min-h-0 overflow-hidden flex">
        <ContentSideMenu />
        <div className="flex-1 min-w-0 overflow-auto text-[var(--muted)]">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

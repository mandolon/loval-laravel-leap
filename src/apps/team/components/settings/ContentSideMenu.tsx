import { memo, useCallback } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { User, LayoutGrid, Users, Repeat, Trash2, LogOut, Settings, Download } from 'lucide-react';
import { useRoleAwareNavigation } from '@/hooks/useRoleAwareNavigation';

const menuGroups = [
  {
    id: 'profile',
    title: 'ACCOUNT',
    items: [
      { id: 'profile', icon: User, label: 'My Profile', route: 'profile' },
      { id: 'workspaces', icon: LayoutGrid, label: 'Workspaces', route: 'workspaces' }
    ]
  },
  {
    id: 'workspace',
    title: 'WORKSPACE',
    items: [
      { id: 'workspace-settings', icon: Settings, label: 'Settings', route: 'workspace-settings' },
      { id: 'members', icon: Users, label: 'Members', route: 'members' },
      { id: 'imports', icon: Repeat, label: 'Imports / Exports', route: 'imports' },
      { id: 'trash', icon: Trash2, label: 'Trash', route: 'trash' }
    ]
  }
] as const;

export const ContentSideMenu = memo(function ContentSideMenu() {
  const navigate = useNavigate();
  const location = useLocation();
  const { workspaceId } = useParams();
  const { navigateToWorkspace } = useRoleAwareNavigation();

  const handleNavigation = useCallback((route: string) => {
    navigateToWorkspace(`/settings/${route}`);
  }, [navigateToWorkspace]);

  const isActive = (route: string) => {
    return location.pathname.includes(`/settings/${route}`);
  };

  return (
    <aside 
      data-testid="content-side-menu" 
      className="w-[240px] shrink-0 border-r border-slate-200 bg-white/80 backdrop-blur-sm"
    >
      <div className="pt-3 pb-2 text-[11px]">
        {menuGroups.map(group => (
          <div key={group.id} className="mb-3">
            <div 
              className="px-3 py-1 text-[var(--text)] tracking-wide" 
              data-group-title={group.id}
            >
              {group.title}
            </div>
            <div className="px-2">
              {group.items.map(item => {
                const Icon = item.icon;
                const active = isActive(item.route);
                
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.route)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[13px] mb-0.5 ${
                      active 
                        ? 'bg-[#E7F0FF] text-[var(--text)]' 
                        : 'hover:bg-slate-100 text-[var(--text)]'
                    }`}
                    aria-current={active ? 'page' : undefined}
                    data-menu-item={item.id}
                  >
                    <Icon className="h-4 w-4 text-[var(--muted)]" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
            {group.id === 'profile' && <div className="my-2 h-px bg-slate-200" />}
          </div>
        ))}
      </div>
      
      {/* Download and Log out buttons at bottom */}
      <div className="mt-auto p-2 border-t border-slate-200 space-y-1">
        <a 
          href="/rehome.exe"
          download="rehome.exe"
          className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-[13px] hover:bg-blue-50 text-blue-600 hover:text-blue-700 transition-colors"
          data-menu-item="download"
        >
          <Download className="h-4 w-4" />
          <span>Download rehome for Windows</span>
        </a>
        
        <button 
          className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-[13px] hover:bg-slate-100 text-[var(--text)]"
          data-menu-item="logout"
        >
          <LogOut className="h-4 w-4 text-[var(--muted)]" />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
});

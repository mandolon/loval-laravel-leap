import { Home, FolderKanban, CheckSquare, Settings, Plus, ChevronRight, Building2 } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Separator } from "@/components/ui/separator";

export function NewAppSidebar() {
  const [activeTab, setActiveTab] = useState<'home' | 'workspace' | 'tasks' | 'settings'>('workspace');

  const navIcons = [
    { id: 'home' as const, icon: Home, label: 'Home', path: '/' },
    { id: 'workspace' as const, icon: FolderKanban, label: 'Workspace', path: '/projects' },
    { id: 'tasks' as const, icon: CheckSquare, label: 'Tasks', path: '/tasks' },
    { id: 'settings' as const, icon: Settings, label: 'Settings', path: '/team' },
  ];

  const statusFilters = [
    { label: 'In Progress', active: true },
    { label: 'Pending', active: false },
    { label: 'Completed', active: false },
    { label: 'Archived', active: false },
  ];

  return (
    <aside className="w-[200px] bg-card border-r border-border flex flex-col h-screen">
      {/* Navigation Icons */}
      <div className="p-3 flex items-center justify-around border-b border-border">
        {navIcons.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            onClick={() => setActiveTab(item.id)}
          >
            <Button
              variant="ghost"
              size="icon"
              className={`h-9 w-9 ${activeTab === item.id ? 'bg-accent text-accent-foreground' : ''}`}
            >
              <item.icon className="h-4 w-4" />
            </Button>
          </NavLink>
        ))}
      </div>

      {/* Projects Section */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Projects
            </span>
            <Button variant="ghost" size="icon" className="h-5 w-5">
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          
          <div className="text-xs text-destructive mb-2">Error loading projects</div>
          <Button variant="link" className="h-auto p-0 text-xs text-primary">
            Retry
          </Button>
        </div>

        <Separator />

        {/* Status Filters */}
        <div className="p-3 space-y-1">
          {statusFilters.map((filter) => (
            <button
              key={filter.label}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                filter.active
                  ? 'bg-accent/50 text-foreground'
                  : 'text-muted-foreground hover:bg-accent/30'
              }`}
            >
              <ChevronRight className="h-3 w-3" />
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Workspace Footer */}
      <div className="p-3 border-t border-border">
        <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent/30 text-sm">
          <Building2 className="h-4 w-4" />
          <span>Workspace 1</span>
        </button>
      </div>
    </aside>
  );
}

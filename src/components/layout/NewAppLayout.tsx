import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { LayoutProvider, useLayout } from "@/contexts/LayoutContext";
import type { PageType } from "@/types/layout.types";

interface NewAppLayoutProps {
  children: React.ReactNode;
}

function LayoutContent({ children }: NewAppLayoutProps) {
  const [workspaceKey, setWorkspaceKey] = useState(0);
  const location = useLocation();
  const { sidebarCollapsed } = useLayout();

  const handleWorkspaceChange = () => {
    // Force re-render of children when workspace changes
    setWorkspaceKey(prev => prev + 1);
  };

  // Determine current page from route
  const getCurrentPage = (): PageType => {
    const path = location.pathname;
    if (path.includes('/projects')) return 'projects';
    if (path.includes('/tasks')) return 'taskboard';
    if (path.includes('/ai')) return 'ai';
    if (path.endsWith('/')) return 'home';
    // Check if we're at workspace root
    if (path.match(/\/workspace\/[^/]+$/)) return 'home';
    return 'home';
  };

  return (
    <div className="h-screen flex flex-row bg-background w-full">
      <Sidebar currentPage={getCurrentPage()} collapsed={sidebarCollapsed} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main key={workspaceKey} className="flex-1 min-h-0 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export function NewAppLayout({ children }: NewAppLayoutProps) {
  return (
    <LayoutProvider>
      <LayoutContent>{children}</LayoutContent>
    </LayoutProvider>
  );
}

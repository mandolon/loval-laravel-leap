import { NewAppHeader } from "./NewAppHeader";
import { NewAppSidebar } from "./NewAppSidebar";
import { useState } from "react";

interface NewAppLayoutProps {
  children: React.ReactNode;
}

export function NewAppLayout({ children }: NewAppLayoutProps) {
  const [workspaceKey, setWorkspaceKey] = useState(0);

  const handleWorkspaceChange = () => {
    // Force re-render of children when workspace changes
    setWorkspaceKey(prev => prev + 1);
  };

  return (
    <div className="h-screen flex bg-background w-full">
      <NewAppSidebar onWorkspaceChange={handleWorkspaceChange} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <NewAppHeader />
        <main key={workspaceKey} className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { LayoutProvider } from "@/contexts/LayoutContext";

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
    <LayoutProvider>
      <div className="h-screen flex flex-row bg-background w-full">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main key={workspaceKey} className="flex-1 min-h-0 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </LayoutProvider>
  );
}

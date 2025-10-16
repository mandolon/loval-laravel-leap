import { NewAppHeader } from "./NewAppHeader";
import { NewAppSidebar } from "./NewAppSidebar";

interface NewAppLayoutProps {
  children: React.ReactNode;
}

export function NewAppLayout({ children }: NewAppLayoutProps) {
  return (
    <div className="h-screen flex flex-col bg-background">
      <NewAppHeader />
      <div className="flex flex-1 overflow-hidden">
        <NewAppSidebar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

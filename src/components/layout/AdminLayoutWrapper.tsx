import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { NewAppLayout } from "./NewAppLayout";
import TeamApp from "@/apps/team/TeamApp";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { LayoutDashboard } from "lucide-react";

interface AdminLayoutWrapperProps {
  children: React.ReactNode;
}

export function AdminLayoutWrapper({ children }: AdminLayoutWrapperProps) {
  const { workspaceId } = useParams<{ workspaceId: string }>();

  // View mode state - defaults to team view (priority to team dashboard)
  const [viewMode, setViewMode] = useState<"admin" | "team">(() => {
    try {
      const saved = localStorage.getItem("adminDashboardViewMode");
      return (saved === "admin" || saved === "team") ? saved : "team";
    } catch (error) {
      console.warn("Failed to read view mode from localStorage:", error);
      return "team"; // Default to team view on error
    }
  });

  // Persist view mode preference
  useEffect(() => {
    try {
      localStorage.setItem("adminDashboardViewMode", viewMode);
    } catch (error) {
      console.warn("Failed to save view mode to localStorage:", error);
    }
  }, [viewMode]);

  // If team view is selected, render the complete team app
  if (viewMode === "team") {
    return <TeamApp />;
  }

  // Otherwise render admin layout with toggle in header
  return (
    <NewAppLayout>
      {/* Floating toggle button for switching views */}
      <div className="absolute top-2 right-4 z-50 flex items-center gap-2 bg-white dark:bg-[#0E1118] px-3 py-1.5 rounded-md shadow-sm border border-slate-200 dark:border-[#1d2230]">
        <Label
          htmlFor="view-mode-toggle"
          className="text-[11px] text-slate-600 dark:text-neutral-400 cursor-pointer"
        >
          Admin View
        </Label>
        <Switch
          id="view-mode-toggle"
          checked={viewMode === "team"}
          onCheckedChange={(checked) => setViewMode(checked ? "team" : "admin")}
          className="scale-75"
        />
        <Label
          htmlFor="view-mode-toggle"
          className="text-[11px] text-slate-600 dark:text-neutral-400 cursor-pointer font-medium"
        >
          Team View
        </Label>
        <LayoutDashboard className="h-3.5 w-3.5 text-slate-500 dark:text-neutral-400 ml-1" />
      </div>
      {children}
    </NewAppLayout>
  );
}

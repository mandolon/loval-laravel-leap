import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { NewAppLayout } from "./NewAppLayout";
import { TeamDashboardLayout } from "@/apps/team/components/TeamDashboardCore";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { LayoutDashboard } from "lucide-react";

interface AdminLayoutWrapperProps {
  children: React.ReactNode;
}

// Reusable toggle component
function ViewToggle({
  viewMode,
  onToggle
}: {
  viewMode: "admin" | "team";
  onToggle: (mode: "admin" | "team") => void;
}) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex items-center gap-2 bg-white dark:bg-[#0E1118] px-3 py-1.5 rounded-md shadow-lg border border-slate-200 dark:border-[#1d2230]">
      <Label
        htmlFor="view-mode-toggle"
        className="text-[11px] text-slate-600 dark:text-neutral-400 cursor-pointer select-none"
        onClick={() => onToggle("admin")}
      >
        Admin View
      </Label>
      <Switch
        id="view-mode-toggle"
        checked={viewMode === "team"}
        onCheckedChange={(checked) => onToggle(checked ? "team" : "admin")}
        className="scale-75"
      />
      <Label
        htmlFor="view-mode-toggle"
        className="text-[11px] text-slate-600 dark:text-neutral-400 cursor-pointer font-medium select-none"
        onClick={() => onToggle("team")}
      >
        Team View
      </Label>
      <LayoutDashboard className="h-3.5 w-3.5 text-slate-500 dark:text-neutral-400 ml-1" />
    </div>
  );
}

export function AdminLayoutWrapper({ children }: AdminLayoutWrapperProps) {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

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

  // Handle view mode toggle
  const handleToggle = (mode: "admin" | "team") => {
    setViewMode(mode);

    // When switching views, ensure we're at the home page to avoid route mismatches
    if (mode === "team" && workspaceId) {
      // Stay on admin route - TeamDashboardLayout will handle the navigation internally
      // Don't navigate away from current admin URL
    }
  };

  // If team view is selected, render the team dashboard layout
  // but keep the admin children to avoid routing conflicts
  if (viewMode === "team") {
    return (
      <>
        <ViewToggle viewMode={viewMode} onToggle={handleToggle} />
        <TeamDashboardLayout>
          {/* Render team dashboard content - it has its own internal routing */}
          <div className="hidden">{children}</div>
        </TeamDashboardLayout>
      </>
    );
  }

  // Otherwise render admin layout with toggle
  return (
    <>
      <ViewToggle viewMode={viewMode} onToggle={handleToggle} />
      <NewAppLayout>
        {children}
      </NewAppLayout>
    </>
  );
}

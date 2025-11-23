import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { useRoleAwareNavigation } from "@/hooks/useRoleAwareNavigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderKanban, CheckSquare, Users, TrendingUp, ArrowRight, LayoutDashboard } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSubhead } from "@/components/layout/PageSubhead";
import NoWorkspacePage from "./NoWorkspacePage";
import { DESIGN_TOKENS as T } from "@/lib/design-tokens";
import { HomeView } from "@/apps/team/components/TeamDashboardCore";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const HomePage = () => {
  const navigate = useNavigate();
  const { navigateToWorkspace, role } = useRoleAwareNavigation();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { workspaces, currentWorkspace, currentWorkspaceId, loading } = useWorkspaces();

  // View mode state - defaults to team view (priority to team dashboard)
  const [viewMode, setViewMode] = useState<"admin" | "team">(() => {
    const saved = localStorage.getItem("adminDashboardViewMode");
    return (saved === "admin" || saved === "team") ? saved : "team";
  });

  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    teamMembers: 0,
  });

  // Redirect to current workspace if no workspace in URL
  useEffect(() => {
    if (!loading && !workspaceId && currentWorkspaceId && role) {
      navigate(`/${role}/workspace/${currentWorkspaceId}`, { replace: true });
    }
  }, [workspaceId, currentWorkspaceId, loading, navigate, role]);

  // Persist view mode preference
  useEffect(() => {
    localStorage.setItem("adminDashboardViewMode", viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (workspaceId) {
      loadStats();
    }
  }, [workspaceId]);

  // Show no workspace page if there are no workspaces (after hooks)
  if (!loading && workspaces.length === 0) {
    return <NoWorkspacePage />;
  }

  const loadStats = async () => {
    if (!workspaceId) return;

    try {
      // Get projects count
      const { count: projectsCount } = await supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .is("deleted_at", null);

      const { count: activeProjectsCount } = await supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("status", "active")
        .is("deleted_at", null);

      // Get tasks count for workspace projects
      const { data: projects } = await supabase
        .from("projects")
        .select("id")
        .eq("workspace_id", workspaceId)
        .is("deleted_at", null);

      const projectIds = projects?.map(p => p.id) || [];

      let tasksCount = 0;
      let completedTasksCount = 0;
      
      if (projectIds.length > 0) {
        const { count: totalTasks } = await supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .in("project_id", projectIds)
          .is("deleted_at", null);

        const { count: completedTasks } = await supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .in("project_id", projectIds)
          .eq("status", "done_completed")
          .is("deleted_at", null);

        tasksCount = totalTasks || 0;
        completedTasksCount = completedTasks || 0;
      }

      // Get team members count
      const { count: teamCount } = await supabase
        .from("workspace_members")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .is("deleted_at", null);

      setStats({
        totalProjects: projectsCount || 0,
        activeProjects: activeProjectsCount || 0,
        totalTasks: tasksCount,
        completedTasks: completedTasksCount,
        teamMembers: teamCount || 0,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Active Projects",
      value: stats.activeProjects,
      total: stats.totalProjects,
      icon: FolderKanban,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Tasks",
      value: stats.completedTasks,
      total: stats.totalTasks,
      icon: CheckSquare,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Team Members",
      value: stats.teamMembers,
      total: null,
      icon: Users,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Completion Rate",
      value: stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0,
      total: null,
      icon: TrendingUp,
      color: "text-warning",
      bgColor: "bg-warning/10",
      suffix: "%",
    },
  ];

  const quickActions = [
    {
      title: "View All Projects",
      description: "Browse and manage your projects",
      icon: FolderKanban,
      action: () => navigateToWorkspace("/projects"),
    },
    {
      title: "Task Board",
      description: "Track and update task progress",
      icon: CheckSquare,
      action: () => navigateToWorkspace("/tasks"),
    },
    {
      title: "Team Management",
      description: "View and manage team members",
      icon: Users,
      action: () => navigateToWorkspace("/team"),
    },
  ];

  return (
    <div className="h-full w-full text-[12px] overflow-hidden pb-6 pr-1">
      <div className={`${T.panel} ${T.radius} min-h-0 min-w-0 grid grid-rows-[auto_1fr] overflow-hidden h-full`}>
      {/* Header */}
      <div className="h-9 px-3 border-b border-slate-200 dark:border-[#1d2230] flex items-center justify-between bg-white dark:bg-[#0E1118]">
        <span className="text-slate-700 dark:text-neutral-200 font-medium">Dashboard</span>

        {/* View Toggle */}
        <div className="flex items-center gap-2">
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
      </div>

      {/* Content */}
      {viewMode === "team" ? (
        // Team Dashboard View
        <div className="flex-1 overflow-hidden">
          <HomeView />
        </div>
      ) : (
        // Admin Dashboard View
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat) => (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-base font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold">
                    {stat.value}{stat.suffix || ''}
                    {stat.total !== null && (
                      <span className="text-base text-muted-foreground ml-1">
                        / {stat.total}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {quickActions.map((action) => (
                <Card
                  key={action.title}
                  className="hover:shadow-lg transition-all duration-300 cursor-pointer group"
                  onClick={action.action}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <action.icon className="h-6 w-6 text-primary" />
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                    <CardTitle className="text-lg">{action.title}</CardTitle>
                    <CardDescription>{action.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>

          {/* Get Started */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Get Started</h2>
            <Card>
              <CardContent className="pt-4">
                {currentWorkspace ? (
                  <div className="space-y-4">
                    <p className="text-base text-muted-foreground">
                      Start managing your construction projects efficiently in <strong>{currentWorkspace.name}</strong>.
                      View projects, track tasks, and collaborate with your team all in one place.
                    </p>
                    <div className="flex gap-3">
                      <Button onClick={() => navigateToWorkspace("/projects")}>
                        View Projects
                      </Button>
                      <Button variant="outline" onClick={() => navigateToWorkspace("/tasks")}>
                        View Tasks
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-base text-muted-foreground">
                      Please select a workspace from the sidebar to start managing your projects.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default HomePage;

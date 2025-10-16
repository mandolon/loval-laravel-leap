import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderKanban, CheckSquare, Users, TrendingUp, ArrowRight } from "lucide-react";

const HomePage = () => {
  const navigate = useNavigate();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { currentWorkspace, currentWorkspaceId, loading } = useWorkspaces();
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    teamMembers: 0,
  });

  // Redirect to current workspace if no workspace in URL
  useEffect(() => {
    if (!loading && !workspaceId && currentWorkspaceId) {
      navigate(`/workspace/${currentWorkspaceId}`, { replace: true });
    }
  }, [workspaceId, currentWorkspaceId, loading, navigate]);

  useEffect(() => {
    if (workspaceId) {
      loadStats();
    }
  }, [workspaceId]);

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
      action: () => navigate(`/workspace/${currentWorkspaceId}/projects`),
    },
    {
      title: "Task Board",
      description: "Track and update task progress",
      icon: CheckSquare,
      action: () => navigate(`/workspace/${currentWorkspaceId}/tasks`),
    },
    {
      title: "Team Management",
      description: "View and manage team members",
      icon: Users,
      action: () => navigate(`/workspace/${currentWorkspaceId}/team`),
    },
  ];

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground text-lg">
          {currentWorkspace 
            ? `Welcome back! Here's an overview of ${currentWorkspace.name}.`
            : "Welcome back! Select a workspace to get started."
          }
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {stat.value}{stat.suffix || ''}
                {stat.total !== null && (
                  <span className="text-lg text-muted-foreground ml-1">
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
        <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                <CardTitle className="text-xl">{action.title}</CardTitle>
                <CardDescription>{action.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      {/* Get Started */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Get Started</h2>
        <Card>
          <CardContent className="pt-6">
            {currentWorkspace ? (
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Start managing your construction projects efficiently in <strong>{currentWorkspace.name}</strong>. 
                  View projects, track tasks, and collaborate with your team all in one place.
                </p>
                <div className="flex gap-3">
                  <Button onClick={() => navigate(`/workspace/${currentWorkspaceId}/projects`)}>
                    View Projects
                  </Button>
                  <Button variant="outline" onClick={() => navigate(`/workspace/${currentWorkspaceId}/tasks`)}>
                    View Tasks
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Please select a workspace from the sidebar to start managing your projects.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HomePage;

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderKanban, CheckSquare, Users, TrendingUp, ArrowRight } from "lucide-react";

const HomePage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    teamMembers: 0,
  });

  useEffect(() => {
    const projects = api.projects.list();
    const tasks = api.tasks.list();
    const users = api.users.list();

    setStats({
      totalProjects: projects.length,
      activeProjects: projects.filter(p => p.status === 'active').length,
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status === 'done').length,
      teamMembers: users.length,
    });
  }, []);

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
      action: () => navigate("/projects"),
    },
    {
      title: "Task Board",
      description: "Track and update task progress",
      icon: CheckSquare,
      action: () => navigate("/tasks"),
    },
    {
      title: "Team Management",
      description: "View and manage team members",
      icon: Users,
      action: () => navigate("/team"),
    },
  ];

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground text-lg">
          Welcome back! Here's an overview of your projects.
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

      {/* Recent Activity */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Get Started</h2>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Start managing your construction projects efficiently. View projects, track tasks, 
                and collaborate with your team all in one place.
              </p>
              <div className="flex gap-3">
                <Button onClick={() => navigate("/projects")}>
                  View Projects
                </Button>
                <Button variant="outline" onClick={() => navigate("/tasks")}>
                  View Tasks
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HomePage;

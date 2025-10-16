import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api/client";
import type { Project } from "@/lib/api/types";
import { ProjectCard } from "@/components/ProjectCard";
import { CreateProjectDialog } from "@/components/CreateProjectDialog";
import { useToast } from "@/hooks/use-toast";
import { FolderKanban } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    setProjects(api.projects.list());
  }, []);

  const handleCreateProject = (input: Parameters<typeof api.projects.create>[0]) => {
    const newProject = api.projects.create(input);
    setProjects([...projects, newProject]);
    toast({
      title: "Project created",
      description: `${newProject.name} has been created successfully`,
    });
  };

  const handleDeleteProject = (id: string) => {
    api.projects.delete(id);
    setProjects(projects.filter(p => p.id !== id));
    toast({
      title: "Project deleted",
      description: "The project and all its tasks have been removed",
    });
  };

  const getTaskCount = (projectId: string) => {
    return api.tasks.list(projectId).length;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <FolderKanban className="h-10 w-10 text-primary" />
            <h1 className="text-5xl font-bold">Projects</h1>
          </div>
          <p className="text-muted-foreground text-xl mb-6">
            Manage your projects and tasks with ease
          </p>
          <CreateProjectDialog onCreateProject={handleCreateProject} />
        </div>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
              <FolderKanban className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-semibold mb-2">No projects yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first project to get started
            </p>
            <CreateProjectDialog onCreateProject={handleCreateProject} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                taskCount={getTaskCount(project.id)}
                onDelete={handleDeleteProject}
                onClick={() => navigate(`/project/${project.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api/client";
import type { Project } from "@/lib/api/types";
import { ProjectCard } from "@/components/ProjectCard";
import { CreateProjectDialog } from "@/components/CreateProjectDialog";
import { useToast } from "@/hooks/use-toast";
import { FolderKanban } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ProjectsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [phaseFilter, setPhaseFilter] = useState<string>("all");

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

  const getProjectTeam = (teamIds: string[]) => {
    return teamIds.map(id => api.users.get(id)).filter(Boolean) as any[];
  };

  const getProjectClient = (clientId: string) => {
    return api.clients.get(clientId);
  };

  // Filter projects
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;
    const matchesPhase = phaseFilter === "all" || project.phase === phaseFilter;
    
    return matchesSearch && matchesStatus && matchesPhase;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Projects</h1>
          <p className="text-muted-foreground text-lg">
            Manage your construction projects
          </p>
        </div>
        <CreateProjectDialog onCreateProject={handleCreateProject} />
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <Input
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={phaseFilter} onValueChange={setPhaseFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Phase" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Phases</SelectItem>
            <SelectItem value="design">Design</SelectItem>
            <SelectItem value="permit">Permit</SelectItem>
            <SelectItem value="build">Build</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-16">
          <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
            <FolderKanban className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-2xl font-semibold mb-2">
            {projects.length === 0 ? "No projects yet" : "No matching projects"}
          </h3>
          <p className="text-muted-foreground mb-6">
            {projects.length === 0 
              ? "Create your first project to get started"
              : "Try adjusting your filters"
            }
          </p>
          {projects.length === 0 && (
            <CreateProjectDialog onCreateProject={handleCreateProject} />
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              client={getProjectClient(project.clientId)}
              team={getProjectTeam(project.teamIds)}
              taskCount={getTaskCount(project.id)}
              onDelete={handleDeleteProject}
              onClick={() => navigate(`/project/${project.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectsPage;

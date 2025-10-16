import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api/client";
import type { Project } from "@/lib/api/types";
import { ProjectCard } from "@/components/ProjectCard";
import { CreateProjectDialog } from "@/components/CreateProjectDialog";
import { useToast } from "@/hooks/use-toast";
import { FolderKanban } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ProjectsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [searchParams] = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [phaseFilter, setPhaseFilter] = useState<string>("all");
  
  // Get status filter from URL or default to 'all'
  const statusFilter = searchParams.get('status') || 'all';
  const currentWorkspaceId = workspaceId || api.workspaces.getCurrentWorkspaceId();

  useEffect(() => {
    loadProjects();
  }, [currentWorkspaceId]);

  useEffect(() => {
    // Redirect to workspace route if not already there
    if (!workspaceId && currentWorkspaceId) {
      navigate(`/workspace/${currentWorkspaceId}/projects`, { replace: true });
    }
  }, [workspaceId, currentWorkspaceId, navigate]);

  const loadProjects = () => {
    if (currentWorkspaceId) {
      const workspaceProjects = api.projects.list(currentWorkspaceId);
      setProjects(workspaceProjects);
    } else {
      setProjects([]);
      toast({
        title: "No workspace selected",
        description: "Please select a workspace to view projects",
        variant: "destructive",
      });
    }
  };

  const handleCreateProject = (input: Parameters<typeof api.projects.create>[0]) => {
    if (!currentWorkspaceId) {
      toast({
        title: "No workspace selected",
        description: "Please select a workspace first",
        variant: "destructive",
      });
      return;
    }

    const projectInput = {
      ...input,
      workspaceId: currentWorkspaceId,
    };

    const newProject = api.projects.create(projectInput);
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

  // Show workspace name in empty state
  const currentWorkspace = currentWorkspaceId ? api.workspaces.get(currentWorkspaceId) : null;

  return (
    <div className="h-full bg-background">
      {/* Page Header */}
      <div className="border-b border-border bg-card">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-semibold mb-4">Projects</h1>
          
          {/* Filters */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <span className="text-sm text-muted-foreground">Filter by:</span>
              <Select value={phaseFilter} onValueChange={setPhaseFilter}>
                <SelectTrigger className="w-[120px] h-8 text-sm border-border">
                  <SelectValue placeholder="Phase" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">Phase</SelectItem>
                  <SelectItem value="design">Design</SelectItem>
                  <SelectItem value="permit">Permit</SelectItem>
                  <SelectItem value="build">Build</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              
              <Select 
                value={statusFilter} 
                onValueChange={(value) => {
                  if (currentWorkspaceId) {
                    navigate(`/workspace/${currentWorkspaceId}/projects?status=${value}`);
                  }
                }}
              >
                <SelectTrigger className="w-[120px] h-8 text-sm border-border">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="sm" className="h-8 text-sm">
                Team Member
              </Button>
            </div>
            
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="2" y="2" width="5" height="5" rx="1"/>
                  <rect x="9" y="2" width="5" height="5" rx="1"/>
                  <rect x="2" y="9" width="5" height="5" rx="1"/>
                  <rect x="9" y="9" width="5" height="5" rx="1"/>
                </svg>
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="2" y="2" width="12" height="2" rx="1"/>
                  <rect x="2" y="7" width="12" height="2" rx="1"/>
                  <rect x="2" y="12" width="12" height="2" rx="1"/>
                </svg>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6">
        {!currentWorkspaceId ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg mb-2">No workspace selected</p>
            <p className="text-sm text-muted-foreground">
              Please select a workspace from the sidebar to view projects
            </p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">
              {projects.length === 0 
                ? `No projects in ${currentWorkspace?.name}. Click the "+" button in the sidebar to create one.`
                : "No projects match your filters. Try adjusting your search or filters."
              }
            </p>
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
                onClick={() => navigate(`/workspace/${currentWorkspaceId}/project/${project.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectsPage;

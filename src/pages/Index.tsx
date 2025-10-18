import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { Project } from "@/lib/api/types";
import { ProjectCard } from "@/components/ProjectCard";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProjects, useDeleteProject, useHardDeleteProject } from "@/lib/api/hooks/useProjects";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSubhead } from "@/components/layout/PageSubhead";

const ProjectsPage = () => {
  const navigate = useNavigate();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [phaseFilter, setPhaseFilter] = useState<string>("all");
  
  // Get status filter from URL or default to 'all'
  const statusFilter = searchParams.get('status') || 'all';
  
  const { data: projects = [], isLoading } = useProjects(workspaceId || '');
  const deleteProjectMutation = useDeleteProject(workspaceId || '');
  const hardDeleteProjectMutation = useHardDeleteProject(workspaceId || '');

  const handleDeleteProject = (id: string) => {
    deleteProjectMutation.mutate(id);
  };

  const handleHardDeleteProject = (id: string) => {
    hardDeleteProjectMutation.mutate(id);
  };

  useEffect(() => {
    if (!workspaceId) {
      const storedWorkspaceId = localStorage.getItem("current_workspace_id");
      if (storedWorkspaceId) {
        navigate(`/workspace/${storedWorkspaceId}/projects`, { replace: true });
      }
    }
  }, [workspaceId, navigate]);
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (project.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;
    const matchesPhase = phaseFilter === "all" || project.phase === phaseFilter;
    
    return matchesSearch && matchesStatus && matchesPhase;
  });

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      {/* Page Header */}
      <div>
        <PageHeader title="Projects" />
        <PageSubhead description="Manage all your projects in one place" />
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <span className="text-sm text-muted-foreground">Filter by:</span>
          <Select value={phaseFilter} onValueChange={setPhaseFilter}>
            <SelectTrigger className="w-[120px] h-8 text-sm border-border">
              <SelectValue placeholder="Phase" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">All Phases</SelectItem>
              <SelectItem value="Pre-Design">Pre-Design</SelectItem>
              <SelectItem value="Design">Design</SelectItem>
              <SelectItem value="Permit">Permit</SelectItem>
              <SelectItem value="Build">Build</SelectItem>
            </SelectContent>
          </Select>
          
          <Select 
            value={statusFilter} 
            onValueChange={(value) => {
              if (workspaceId) {
                navigate(`/workspace/${workspaceId}/projects?status=${value}`);
              }
            }}
          >
            <SelectTrigger className="w-[120px] h-8 text-sm border-border">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="active">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
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

      {/* Content Area */}
      {!workspaceId ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground text-lg mb-2">No workspace selected</p>
          <p className="text-sm text-muted-foreground">
            Please select a workspace from the sidebar to view projects
          </p>
        </div>
      ) : isLoading ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground">Loading projects...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground">
            {projects.length === 0 
              ? "No projects yet. Click the '+' button in the sidebar to create one."
              : "No projects match your filters. Try adjusting your search or filters."
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => navigate(`/workspace/${workspaceId}/project/${project.id}`)}
              onDelete={handleDeleteProject}
              onHardDelete={handleHardDeleteProject}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectsPage;

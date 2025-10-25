import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { Project } from "@/lib/api/types";
import { ProjectCard } from "@/components/ProjectCard";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProjects, useDeleteProject, useHardDeleteProject } from "@/lib/api/hooks/useProjects";
import { PageHeader } from "@/components/layout/PageHeader";
import { CreateProjectDialog } from "@/components/CreateProjectDialog";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { DESIGN_TOKENS as T } from "@/lib/design-tokens";

const ProjectsPage = () => {
  const navigate = useNavigate();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { toast } = useToast();
  const { user } = useUser();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [phaseFilter, setPhaseFilter] = useState<string>("all");
  
  // Get status filter from URL or default to 'all'
  const statusFilter = searchParams.get('status') || 'all';
  
  const { data: projects = [], isLoading, refetch } = useProjects(workspaceId || '');
  const deleteProjectMutation = useDeleteProject(workspaceId || '');
  const hardDeleteProjectMutation = useHardDeleteProject(workspaceId || '');

  const handleDeleteProject = (id: string) => {
    deleteProjectMutation.mutate(id);
  };

  const handleHardDeleteProject = (id: string) => {
    hardDeleteProjectMutation.mutate(id);
  };

  const handleCreateProject = async (input: any) => {
    if (!workspaceId || !user?.id) {
      toast({
        title: "No workspace selected",
        description: "Please select a workspace first",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: newProject, error } = await supabase
        .from("projects")
        .insert({
          workspace_id: workspaceId,
          name: input.name,
          description: input.description || null,
          status: input.status || "active",
          phase: input.phase || "Pre-Design",
          address: input.address || {},
          primary_client_first_name: input.primaryClient?.firstName || null,
          primary_client_last_name: input.primaryClient?.lastName || null,
          primary_client_email: input.primaryClient?.email || null,
          primary_client_phone: input.primaryClient?.phone || null,
          secondary_client_first_name: input.secondaryClient?.firstName || null,
          secondary_client_last_name: input.secondaryClient?.lastName || null,
          secondary_client_email: input.secondaryClient?.email || null,
          secondary_client_phone: input.secondaryClient?.phone || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      await refetch();
      toast({
        title: "Project created",
        description: `${newProject.name} has been created successfully`,
      });
    } catch (error) {
      console.error("Error creating project:", error);
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive",
      });
    }
  };

  // Realtime subscription for projects
  useEffect(() => {
    if (!workspaceId) return;

    const channel = supabase
      .channel('projects-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
          filter: `workspace_id=eq.${workspaceId}`
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, refetch]);

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
    <div className="h-full w-full text-[12px] overflow-hidden pb-6 pr-1">
      <div className={`${T.panel} ${T.radius} min-h-0 min-w-0 grid grid-rows-[auto_1fr] overflow-hidden h-full`}>
      {/* Header */}
      <div className="h-9 px-3 border-b border-slate-200 dark:border-[#1d2230] flex items-center bg-white dark:bg-[#0E1118]">
        <span className="text-[12px] font-medium">Projects</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
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
          </div>
        </div>

        {/* Projects Grid */}
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
                ? "No projects yet. Click the '+' button above to create one."
                : "No projects match your filters. Try adjusting your search or filters."
              }
            </p>
          </div>
        ) : (
          <div className="grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
            {filteredProjects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => navigate(`/workspace/${workspaceId}/project/${project.id}`)}
                onDelete={statusFilter !== 'archived' ? handleDeleteProject : undefined}
                onHardDelete={statusFilter === 'archived' ? handleHardDeleteProject : undefined}
              />
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default ProjectsPage;

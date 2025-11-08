/**
 * NavContent Component
 * Dynamic content area based on active tab
 */

import { NavLink, useNavigate, useParams, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useRoleAwareNavigation } from '@/hooks/useRoleAwareNavigation'
import { Plus, Folder, CheckSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CreateProjectModal } from '@/components/CreateProjectModal'
import { CreateTaskDialog } from '@/components/CreateTaskDialog'
import { supabase } from '@/integrations/supabase/client'
import { AIChatThreadsList } from '@/components/chat/AIChatThreadsList'
import { useProjects } from '@/lib/api/hooks/useProjects'
import { useToast } from '@/hooks/use-toast'
import { useUser } from '@/contexts/UserContext'
import type { NavContentProps } from '@/types/layout.types'
import { DESIGN_TOKENS as T } from '@/lib/design-tokens'

export function NavContent({
  activeTab,
  collapsed,
  activeTaskTab,
  onTaskTabChange,
  onProjectClick,
  currentProjectId,
  activeWorkspace,
  activeStatus = 'inProgress'
}: NavContentProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { navigateToWorkspace } = useRoleAwareNavigation()
  const { toast } = useToast()
  const { user } = useUser()
  const { workspaceId, id: projectId } = useParams<{ workspaceId: string; id: string }>()
  const currentWorkspaceId = workspaceId
  const { data: projects = [] } = useProjects(currentWorkspaceId || '', user?.id, user?.is_admin)

  const getNavPath = (basePath: string) => {
    if (!currentWorkspaceId) return basePath
    return basePath === '/' ? `/workspace/${currentWorkspaceId}` : `/workspace/${currentWorkspaceId}${basePath}`
  }

  const homeLinks = [
    { label: 'Home', path: getNavPath('') },
    { label: 'Users', path: getNavPath('/team') },
    { label: 'Invoices', path: getNavPath('/invoices') },
    { label: 'Work Records', path: getNavPath('/work-records') },
    { label: 'Sandbox', path: getNavPath('/sandbox') },
  ]

  if (collapsed) return null

  // Home Tab Content
  if (activeTab === 'home') {
    return (
      <div className="p-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Home
          </span>
        </div>
        
        <ScrollArea className="max-h-[300px]">
          <div className="space-y-1">
            {homeLinks.map((link) => (
              <NavLink
                key={link.label}
                to={link.path}
                className={({ isActive }) => `
                  group flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors
                  ${isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/30'}
                `}
              >
                <span className="truncate">{link.label}</span>
              </NavLink>
            ))}
          </div>
        </ScrollArea>
      </div>
    )
  }

  // Workspace Tab Content
  if (activeTab === 'workspace') {
    const statusMap = {
      inProgress: 'active',
      paused: 'pending',
      completed: 'completed',
      archived: 'archived'
    }
    const filteredProjects = projects.filter(project => project.status === statusMap[activeStatus])

    const handleCreateProject = async (input: any) => {
      if (!currentWorkspaceId || !user?.id) {
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
            workspace_id: currentWorkspaceId,
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

    return (
      <div className="p-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Projects
          </span>
          <CreateProjectModal onCreateProject={handleCreateProject} workspaceId={currentWorkspaceId || ''}>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-5 w-5"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </CreateProjectModal>
        </div>
        
        <ScrollArea className="max-h-[300px]">
          <div className="space-y-1">
            {filteredProjects.length === 0 ? (
              <div className="text-xs text-muted-foreground py-2">
                No {activeStatus} projects
              </div>
            ) : (
              filteredProjects.slice(0, 5).map((project) => {
                const isActive = projectId === project.id
                return (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => {
                      navigateToWorkspace(`/project/${project.id}`)
                      onProjectClick?.(project.id)
                    }}
                    className={`group flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors w-full text-left ${
                      isActive 
                        ? 'bg-accent text-accent-foreground' 
                        : 'text-muted-foreground hover:bg-accent/30'
                    }`}
                  >
                    <Folder className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{project.name}</span>
                  </button>
                )
              })
            )}
          </div>
        </ScrollArea>
      </div>
    )
  }

  // TaskBoard Tab Content
  if (activeTab === 'taskboard') {
    const handleCreateTask = (input: any) => {
      // Task creation is handled by the CreateTaskDialog mutation
      toast({
        title: "Task created",
        description: "Task has been created successfully",
      });
    };

    return (
      <div className="p-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Tasks
          </span>
          {projects.length > 0 && (
            <CreateTaskDialog 
              projects={projects} 
              onCreateTask={handleCreateTask}
            >
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </CreateTaskDialog>
          )}
        </div>
        
        <ScrollArea className="max-h-[300px]">
          <div className="space-y-1">
            <NavLink
              to={getNavPath('/tasks')}
              className={({ isActive }) => `
                group flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors
                ${isActive && !location.search ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/30'}
              `}
            >
              <CheckSquare className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">All Tasks</span>
            </NavLink>
            <NavLink
              to={getNavPath('/tasks?view=my-tasks')}
              className={({ isActive }) => `
                group flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors
                ${location.search.includes('my-tasks') ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/30'}
              `}
            >
              <CheckSquare className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">My Tasks</span>
            </NavLink>
            <NavLink
              to={getNavPath('/tasks?view=completed')}
              className={({ isActive }) => `
                group flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors
                ${location.search.includes('completed') ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/30'}
              `}
            >
              <CheckSquare className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">Completed</span>
            </NavLink>
          </div>
        </ScrollArea>
      </div>
    )
  }

  // AI Tab Content
  if (activeTab === 'ai') {
    return <AIChatThreadsList workspaceId={currentWorkspaceId || ''} />
  }

  return null
}

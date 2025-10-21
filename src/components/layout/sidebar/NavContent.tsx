/**
 * NavContent Component
 * Dynamic content area based on active tab
 */

import { NavLink, useNavigate, useParams, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Plus, Folder, CheckSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { supabase } from '@/integrations/supabase/client'
import { AIChatThreadsList } from '@/components/chat/AIChatThreadsList'
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
  const { workspaceId, id: projectId } = useParams<{ workspaceId: string; id: string }>()
  const [projects, setProjects] = useState<any[]>([])

  const currentWorkspaceId = workspaceId

  useEffect(() => {
    if (currentWorkspaceId) {
      loadProjects()
    }
  }, [currentWorkspaceId, location.pathname])

  // Realtime subscription
  useEffect(() => {
    if (!currentWorkspaceId) return

    const channel = supabase
      .channel('sidebar-projects-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
          filter: `workspace_id=eq.${currentWorkspaceId}`
        },
        () => {
          loadProjects()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentWorkspaceId])

  const loadProjects = async () => {
    if (!currentWorkspaceId) return

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('workspace_id', currentWorkspaceId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      setProjects(data || [])
    } catch (error) {
      console.error('Error loading projects:', error)
    }
  }

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

    return (
      <div className="p-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Projects
          </span>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-5 w-5"
            onClick={() => navigate(getNavPath('/projects'))}
          >
            <Plus className="h-3 w-3" />
          </Button>
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
                      navigate(`/workspace/${currentWorkspaceId}/project/${project.id}`)
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
    return (
      <div className="p-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Tasks
          </span>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-5 w-5"
            onClick={() => navigate(getNavPath('/tasks'))}
          >
            <Plus className="h-3 w-3" />
          </Button>
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

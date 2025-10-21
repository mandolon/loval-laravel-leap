/**
 * NavContent Component
 * Dynamic content area based on active tab
 */

import { NavLink, useNavigate, useParams, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
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
      <div className="flex flex-col items-start justify-start px-3 pb-3 space-y-2">
        {homeLinks.map((link) => (
          <NavLink
            key={link.label}
            to={link.path}
            className={({ isActive }) => `
              px-2.5 py-1 ${T.radius} w-full text-left transition-colors
              ${isActive ? 'bg-accent text-accent-foreground font-medium' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'} ${T.focus}
            `}
          >
            {link.label}
          </NavLink>
        ))}
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
      <div className="flex flex-col items-start justify-start px-3 py-2 space-y-2">
        <div className="w-full space-y-2 max-h-[200px] overflow-y-auto">
          {filteredProjects.length === 0 ? (
            <div className={`${T.text} text-muted-foreground py-1 px-2.5`}>
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
                  className={`px-2.5 py-1 ${T.radius} w-full text-left transition-colors ${
                    isActive 
                      ? 'bg-accent text-accent-foreground font-medium' 
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                  } ${T.focus}`}
                  aria-current={isActive ? 'true' : undefined}
                >
                  <span className="truncate">{project.name}</span>
                </button>
              )
            })
          )}
        </div>
      </div>
    )
  }

  // TaskBoard Tab Content
  if (activeTab === 'taskboard') {
    return (
      <div className="flex flex-col items-start justify-start px-3 pb-3 space-y-2">
        <NavLink
          to={getNavPath('/tasks')}
          className={({ isActive }) => `
            px-2.5 py-1 ${T.radius} w-full text-left transition-colors
            ${isActive && !location.search ? 'bg-accent text-accent-foreground font-medium' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'} ${T.focus}
          `}
        >
          <span>All Tasks</span>
        </NavLink>
        <NavLink
          to={getNavPath('/tasks?view=my-tasks')}
          className={({ isActive }) => `
            px-2.5 py-1 ${T.radius} w-full text-left transition-colors
            ${location.search.includes('my-tasks') ? 'bg-accent text-accent-foreground font-medium' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'} ${T.focus}
          `}
        >
          <span>My Tasks</span>
        </NavLink>
        <NavLink
          to={getNavPath('/tasks?view=completed')}
          className={({ isActive }) => `
            px-2.5 py-1 ${T.radius} w-full text-left transition-colors
            ${location.search.includes('completed') ? 'bg-accent text-accent-foreground font-medium' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'} ${T.focus}
          `}
        >
          <span>Completed</span>
        </NavLink>
      </div>
    )
  }

  // AI Tab Content
  if (activeTab === 'ai') {
    return <AIChatThreadsList workspaceId={currentWorkspaceId || ''} />
  }

  return null
}

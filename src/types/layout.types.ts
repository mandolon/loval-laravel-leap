/**
 * Layout Type Definitions
 * Type definitions for sidebar, navigation, and layout components
 */

export type PageType = 'home' | 'projects' | 'taskboard' | 'completed' | 'ai'

export type SidebarTab = 'home' | 'workspace' | 'taskboard' | 'ai'

export type TaskTab = 'all' | 'my-tasks' | 'completed'

export interface Workspace {
  id: string
  name: string
  description?: string
  icon?: string
  created_at?: string
  updated_at?: string
}

export interface NavIconsProps {
  collapsed: boolean
  activeTab: SidebarTab
  onTabChange: (tab: SidebarTab) => void
}

export interface SidebarHeaderProps {
  collapsed: boolean
  currentWorkspace?: Workspace
  workspaces: Workspace[]
  onWorkspaceChange?: (workspaceId: string) => void
}

export interface NavContentProps {
  activeTab: SidebarTab
  collapsed: boolean
  activeTaskTab?: TaskTab
  onTaskTabChange?: (tab: TaskTab) => void
  onProjectClick?: (projectId: string) => void
  currentProjectId?: string | null
  activeWorkspace?: string
  activeStatus?: 'inProgress' | 'paused' | 'completed' | 'archived'
}

export interface ProjectFiltersProps {
  activeStatus: 'inProgress' | 'paused' | 'completed' | 'archived'
  onStatusChange: (status: 'inProgress' | 'paused' | 'completed' | 'archived') => void
}

export interface SidebarFooterProps {
  collapsed: boolean
  currentWorkspace?: Workspace
  workspaces: Workspace[]
  onWorkspaceChange?: (workspaceId: string) => void
  onCreateWorkspace?: (workspace: Workspace) => void
}

/**
 * Sidebar Component
 * Main navigation sidebar with collapsible functionality
 */

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { SidebarHeader, NavIcons, NavContent, ProjectFilters, SidebarFooter } from './sidebar'
import { useLayout } from '@/contexts/LayoutContext'
import { useNavigate, useParams } from 'react-router-dom'
import type { PageType, TaskTab, SidebarTab, ProjectStatus } from '@/types/layout.types'

interface SidebarProps {
  className?: string
  onPageChange?: (page: PageType) => void
  currentPage?: PageType
  onTaskTabChange?: (tab: TaskTab) => void
  activeTaskTab?: TaskTab
  onProjectClick?: (projectId: string) => void
  currentProjectId?: string | null
}

export function Sidebar({
  className,
  onPageChange,
  currentPage = 'taskboard',
  onTaskTabChange,
  activeTaskTab,
  onProjectClick,
  currentProjectId
}: SidebarProps) {
  const { workspaces, activeWorkspace, setActiveWorkspace, addWorkspace } = useLayout()
  const navigate = useNavigate()
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const [activeStatus, setActiveStatus] = useState<ProjectStatus>('inProgress')
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Map currentPage to activeTab (projects -> workspace, completed -> taskboard)
  const getActiveTab = (): SidebarTab => {
    if (currentPage === 'projects') return 'workspace'
    if (currentPage === 'completed') return 'taskboard'
    return currentPage as SidebarTab
  }

  const activeTab = getActiveTab()

  const handleTabChange = (tab: SidebarTab) => {
    // Map sidebar tab back to page type for navigation
    const pageMap: Record<SidebarTab, PageType> = {
      home: 'home',
      workspace: 'projects',
      taskboard: 'taskboard',
      ai: 'ai'
    }
    
    const newPage = pageMap[tab]
    onPageChange?.(newPage)

    // Navigate to the new page
    const currentWorkspaceId = workspaceId
    if (currentWorkspaceId) {
      const pathMap: Record<SidebarTab, string> = {
        home: `/workspace/${currentWorkspaceId}`,
        workspace: `/workspace/${currentWorkspaceId}/projects`,
        taskboard: `/workspace/${currentWorkspaceId}/tasks`,
        ai: `/workspace/${currentWorkspaceId}/ai`
      }
      navigate(pathMap[tab])
    }
  }

  const handleWorkspaceChange = (workspaceId: string) => {
    const workspace = workspaces.find(w => w.id === workspaceId)
    if (workspace) {
      setActiveWorkspace(workspace.name)
    }
  }

  const currentWorkspace = workspaces.find(w => w.name === activeWorkspace)

  return (
    <aside className={cn(
      isCollapsed ? 'w-16' : 'w-[200px]',
      'bg-card flex flex-col h-screen transition-all duration-300 border-r border-border flex-shrink-0',
      className
    )}>
      {/* Sidebar Header with Avatar */}
      <SidebarHeader 
        collapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />

      {/* Navigation Icons */}
      <div className="border-b border-border">
        <NavIcons
          collapsed={isCollapsed}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      </div>

      {/* Main Content Area */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto min-h-0">
          <NavContent
            activeTab={activeTab}
            collapsed={isCollapsed}
            activeTaskTab={activeTaskTab}
            onTaskTabChange={onTaskTabChange}
            onProjectClick={onProjectClick}
            currentProjectId={currentProjectId}
            activeWorkspace={activeWorkspace}
            activeStatus={activeStatus}
          />
        </div>
      )}

      {/* Project Status Filters - Only show in workspace tab */}
      {!isCollapsed && activeTab === 'workspace' && (
        <ProjectFilters
          activeStatus={activeStatus}
          onStatusChange={setActiveStatus}
        />
      )}

      {/* Footer with Workspace Selector */}
      <SidebarFooter
        collapsed={isCollapsed}
        currentWorkspace={currentWorkspace}
        workspaces={workspaces}
        onWorkspaceChange={handleWorkspaceChange}
        onCreateWorkspace={(workspace) => {
          addWorkspace(workspace)
          setActiveWorkspace(workspace.name)
        }}
      />
    </aside>
  )
}

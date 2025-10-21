/**
 * Sidebar Component
 * Main navigation sidebar with collapsible functionality
 */

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronLeft, Menu } from 'lucide-react'
import { NavIcons } from './sidebar/NavIcons'
import { NavContent } from './sidebar/NavContent'
import { ProjectFilters } from './sidebar/ProjectFilters'
import { SidebarFooter } from './sidebar/SidebarFooter'
import { useLayout } from '@/contexts/LayoutContext'
import { useNavigate, useParams } from 'react-router-dom'
import type { PageType, TaskTab, SidebarTab } from '@/types/layout.types'
import { UTILITY_CLASSES } from '@/lib/design-tokens'
import { useUser } from '@/contexts/UserContext'

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
  const { user } = useUser()
  const navigate = useNavigate()
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const [activeStatus, setActiveStatus] = useState<'inProgress' | 'paused' | 'completed' | 'archived'>('inProgress')
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
      'bg-white dark:bg-[#0E1118] flex flex-col h-full transition-all duration-300 border-r border-slate-200 dark:border-[#1a2030]/60',
      className
    )}>
      {/* User Profile Section */}
      <div className="py-2 px-3 border-b border-slate-200 dark:border-[#1a2030]/40 flex-shrink-0 bg-white dark:bg-[#0E1118]">
        {isCollapsed ? (
          <div className="flex justify-center">
            <button
              className={UTILITY_CLASSES.buttonIcon}
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            {user && (
              <div className="flex items-center gap-2 flex-1 min-w-0 pl-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium truncate text-slate-700 dark:text-neutral-300">
                    {user.name}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-neutral-500 truncate">
                    {user.is_admin ? 'Admin' : user.email}
                  </p>
                </div>
              </div>
            )}
            <button
              className={`${UTILITY_CLASSES.buttonIcon} flex-shrink-0`}
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Navigation Icons */}
      <div className={`px-2 py-3 border-b border-slate-200 dark:border-[#1a2030]/40 flex-shrink-0 ${isCollapsed ? 'flex flex-col items-center space-y-2' : ''}`}>
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

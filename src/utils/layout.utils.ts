/**
 * Layout Utility Functions
 * Helper functions and data for navigation and layout
 */

import { Home, FolderKanban, CheckSquare, Bot, BarChart, Users, FileText, Settings } from 'lucide-react'
import type { SidebarTab, ProjectStatus } from '@/types/layout.types'

export const navIconItems = [
  { tab: 'home' as SidebarTab, icon: Home, label: 'Home' },
  { tab: 'workspace' as SidebarTab, icon: FolderKanban, label: 'Workspace' },
  { tab: 'taskboard' as SidebarTab, icon: CheckSquare, label: 'TaskBoard' },
  { tab: 'ai' as SidebarTab, icon: Bot, label: 'AI' },
]

export const projectStatusLabels: Record<ProjectStatus, string> = {
  inProgress: 'In Progress',
  paused: 'Paused',
  completed: 'Completed',
  archived: 'Archived'
}

export const navigationItems = [
  { label: 'Dashboard', icon: Home, active: false },
  { label: 'Projects', icon: FolderKanban, active: false },
  { label: 'Tasks', icon: CheckSquare, active: false },
  { label: 'Team', icon: Users, active: false },
  { label: 'Reports', icon: BarChart, active: false },
  { label: 'Documents', icon: FileText, active: false },
  { label: 'Settings', icon: Settings, active: false },
]

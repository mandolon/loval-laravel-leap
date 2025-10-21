/**
 * Layout Utility Functions
 * Helper functions and data for navigation and layout
 */

import { Home, FolderKanban, CheckSquare, Bot } from 'lucide-react'
import type { SidebarTab } from '@/types/layout.types'

export const navIconItems = [
  { tab: 'home' as SidebarTab, icon: Home, label: 'Home' },
  { tab: 'workspace' as SidebarTab, icon: FolderKanban, label: 'Workspace' },
  { tab: 'taskboard' as SidebarTab, icon: CheckSquare, label: 'TaskBoard' },
  { tab: 'ai' as SidebarTab, icon: Bot, label: 'AI' },
]

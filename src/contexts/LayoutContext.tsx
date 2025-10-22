/**
 * Layout Context
 * Manages theme, workspaces, and layout state
 */

import { createContext, useContext, ReactNode, useState } from 'react'
import { useTheme } from 'next-themes'
import { useWorkspaces } from '@/hooks/useWorkspaces'
import type { Workspace } from '@/types/layout.types'

interface LayoutContextType {
  // Theme
  theme: string | undefined
  setTheme: (theme: string) => void
  toggleTheme: () => void
  
  // Workspaces
  workspaces: Workspace[]
  activeWorkspace: string
  setActiveWorkspace: (name: string) => void
  addWorkspace: (workspace: Workspace) => void
  
  // Sidebar
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined)

export function LayoutProvider({ children }: { children: ReactNode }) {
  const { theme, setTheme } = useTheme()
  const { workspaces, currentWorkspace, switchWorkspace, createWorkspace } = useWorkspaces()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const formattedWorkspaces: Workspace[] = workspaces.map(w => ({
    id: w.id,
    name: w.name,
    description: w.description || undefined,
  }))

  const activeWorkspace = currentWorkspace?.name || ''

  const setActiveWorkspace = async (name: string) => {
    const workspace = workspaces.find(w => w.name === name)
    if (workspace) {
      await switchWorkspace(workspace.id)
    }
  }

  const addWorkspace = async (workspace: Workspace) => {
    await createWorkspace({ name: workspace.name, description: workspace.description || '' })
  }

  return (
    <LayoutContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        workspaces: formattedWorkspaces,
        activeWorkspace,
        setActiveWorkspace,
        addWorkspace,
        sidebarCollapsed,
        setSidebarCollapsed,
      }}
    >
      {children}
    </LayoutContext.Provider>
  )
}

export function useLayout() {
  const context = useContext(LayoutContext)
  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider')
  }
  return context
}

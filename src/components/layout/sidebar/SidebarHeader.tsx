/**
 * Sidebar Header Component
 * User name and collapse button at top of sidebar
 */

import { ChevronLeft, Menu } from 'lucide-react'
import { useUser } from '@/contexts/UserContext'
import { cn } from '@/lib/utils'

interface SidebarHeaderProps {
  collapsed: boolean
  onToggleCollapse: () => void
}

export function SidebarHeader({ collapsed, onToggleCollapse }: SidebarHeaderProps) {
  const { user } = useUser()

  if (collapsed) {
    return (
      <div className="py-2 px-3 flex justify-center">
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded hover:bg-accent transition-colors"
          title="Expand sidebar"
        >
          <Menu className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-3">
        {user && (
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {user.name}
          </span>
        )}
        <button
          onClick={onToggleCollapse}
          className="h-5 w-5 flex items-center justify-center rounded hover:bg-accent transition-colors flex-shrink-0"
          title="Collapse sidebar"
        >
          <ChevronLeft className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}

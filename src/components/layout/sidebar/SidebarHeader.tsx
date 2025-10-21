/**
 * Sidebar Header Component
 * User avatar, name, and collapse button at top of sidebar
 */

import { ChevronLeft, Menu } from 'lucide-react'
import { UserAvatar } from '@/components/UserAvatar'
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
      <div className="py-2 px-3 border-b border-border flex justify-center">
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
    <div className="py-2 px-3 border-b border-border">
      <div className="flex items-center gap-2">
        {user && (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <UserAvatar user={user} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium truncate text-foreground">
                {user.name}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {user.is_admin ? 'Admin' : user.email}
              </p>
            </div>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className={cn(
            "p-2 rounded hover:bg-accent transition-colors flex-shrink-0"
          )}
          title="Collapse sidebar"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

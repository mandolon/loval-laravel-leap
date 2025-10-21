/**
 * SidebarFooter Component
 * Workspace selector and user avatar at bottom of sidebar
 */

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Sun, Moon, Trash2 } from 'lucide-react'
import { useUser } from '@/contexts/UserContext'
import { useTheme } from 'next-themes'
import { useNavigate } from 'react-router-dom'
import { WorkspaceSwitcher } from '@/components/WorkspaceSwitcher'
import type { SidebarFooterProps } from '@/types/layout.types'
import { DESIGN_TOKENS as T } from '@/lib/design-tokens'

export function SidebarFooter({
  collapsed,
  currentWorkspace,
  workspaces,
  onWorkspaceChange,
  onCreateWorkspace
}: SidebarFooterProps) {
  const { user, signOut } = useUser()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()

  if (!user) return null

  if (collapsed) {
    return null
  }

  return (
    <div className="px-4 py-3 bg-card flex-shrink-0 mt-auto">
      <WorkspaceSwitcher />
    </div>
  )
}

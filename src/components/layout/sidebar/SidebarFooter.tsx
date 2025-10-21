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
    return (
      <div className="px-3 py-3 flex items-center justify-between border-t border-slate-200 dark:border-[#1a2030]/40 bg-white dark:bg-[#0E1118] text-slate-500 dark:text-neutral-400 flex-shrink-0 mt-auto">
        <div className="flex justify-center w-full">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={`h-7 w-7 rounded-full p-0 ${T.focus}`}>
                <Avatar className="h-7 w-7">
                  <AvatarFallback 
                    className="text-white text-[10px] font-semibold"
                    style={{ background: user.avatar_url || 'linear-gradient(135deg, hsl(280, 70%, 60%) 0%, hsl(320, 80%, 65%) 100%)' }}
                  >
                    {user.initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-[#0E1118] border-slate-200 dark:border-[#1d2230]">
              <DropdownMenuItem 
                onClick={() => navigate('/profile')}
                className="text-slate-700 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-[#141C28] hover:text-[#00639b] dark:hover:text-blue-300 focus:bg-slate-50 dark:focus:bg-[#141C28] focus:text-[#00639b] dark:focus:text-blue-300"
              >
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => currentWorkspace && navigate(`/workspace/${currentWorkspace.id}/trash`)}
                className="text-slate-700 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-[#141C28] hover:text-[#00639b] dark:hover:text-blue-300 focus:bg-slate-50 dark:focus:bg-[#141C28] focus:text-[#00639b] dark:focus:text-blue-300"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Trash
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="text-slate-700 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-[#141C28] hover:text-[#00639b] dark:hover:text-blue-300 focus:bg-slate-50 dark:focus:bg-[#141C28] focus:text-[#00639b] dark:focus:text-blue-300"
              >
                {theme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={signOut}
                className="text-slate-700 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-[#141C28] hover:text-[#00639b] dark:hover:text-blue-300 focus:bg-slate-50 dark:focus:bg-[#141C28] focus:text-[#00639b] dark:focus:text-blue-300"
              >
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 py-3 flex items-center justify-between border-t border-slate-200 dark:border-[#1a2030]/40 bg-white dark:bg-[#0E1118] flex-shrink-0 mt-auto">
      <WorkspaceSwitcher />
    </div>
  )
}

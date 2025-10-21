/**
 * UserMenu Component
 * User avatar dropdown with profile, trash, settings, and sign out
 */

import { Trash2, Sun, Moon, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useUser } from '@/contexts/UserContext'
import { useNavigate } from 'react-router-dom'
import { useWorkspaces } from '@/hooks/useWorkspaces'
import { useTheme } from 'next-themes'

interface UserMenuProps {
  onNavigateProfile?: () => void
  onNavigateTrash?: () => void
  onLogout?: () => void
}

export function UserMenu({ onNavigateProfile, onNavigateTrash, onLogout }: UserMenuProps) {
  const { user, signOut } = useUser()
  const navigate = useNavigate()
  const { currentWorkspaceId } = useWorkspaces()
  const { theme, setTheme } = useTheme()

  if (!user) return null

  const handleProfileClick = () => {
    if (onNavigateProfile) {
      onNavigateProfile()
    } else {
      navigate('/profile')
    }
  }

  const handleTrashClick = () => {
    if (onNavigateTrash) {
      onNavigateTrash()
    } else if (currentWorkspaceId) {
      navigate(`/workspace/${currentWorkspaceId}/trash`)
    }
  }

  const handleSignOut = async () => {
    if (onLogout) {
      onLogout()
    } else {
      await signOut()
    }
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="h-8 w-8 rounded-full p-0"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback 
              className="text-white text-xs font-semibold"
              style={{ background: user.avatar_url || 'linear-gradient(135deg, hsl(280, 70%, 60%) 0%, hsl(320, 80%, 65%) 100%)' }}
            >
              {user.initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleProfileClick}>
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleTrashClick}>
          <Trash2 className="mr-2 h-4 w-4" />
          Trash
        </DropdownMenuItem>
        <DropdownMenuItem>Settings</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={toggleTheme}>
          {theme === 'dark' ? (
            <>
              <Sun className="mr-2 h-4 w-4" />
              Light Mode
            </>
          ) : (
            <>
              <Moon className="mr-2 h-4 w-4" />
              Dark Mode
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

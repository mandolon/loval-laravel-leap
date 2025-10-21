/**
 * Header Component
 * Top navigation bar with search, theme toggle, and user menu
 */

import { SearchBar } from './header/SearchBar'
import { UserMenu } from './header/UserMenu'
import { useUser } from '@/contexts/UserContext'

interface HeaderProps {
  onNavigateProfile?: () => void
  onNavigateTrash?: () => void
  onLogout?: () => void
}

export function Header({ onNavigateProfile, onNavigateTrash, onLogout }: HeaderProps) {
  const { user } = useUser()

  const handleSearch = (query: string) => {
    // TODO: Implement global search functionality
  }

  return (
    <header className="h-[60px] bg-card flex items-center px-4 gap-4 flex-shrink-0">
      {/* Left: User Name */}
      <div className="flex items-center gap-3 min-w-0">
        {user && (
          <span className="text-[14px] font-medium text-foreground truncate">
            {user.name}
          </span>
        )}
      </div>

      {/* Center: Compact Search Bar */}
      <div className="flex-1 flex justify-center">
        <div className="w-64">
          <SearchBar onSearch={handleSearch} />
        </div>
      </div>

      {/* Right: Avatar Menu */}
      <div className="flex items-center gap-2">
        <UserMenu
          onNavigateProfile={onNavigateProfile}
          onNavigateTrash={onNavigateTrash}
          onLogout={onLogout}
        />
      </div>
    </header>
  )
}

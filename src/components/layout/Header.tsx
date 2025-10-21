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
    <header className="h-[44px] bg-card flex items-center justify-between px-4 py-1 gap-4 flex-shrink-0">
      {/* Left spacer */}
      <div className="w-8"></div>

      {/* Center: Compact Search Bar */}
      <div className="flex justify-center">
        <div className="w-48">
          <SearchBar onSearch={handleSearch} />
        </div>
      </div>

      {/* Right: Avatar Menu */}
      <UserMenu
        onNavigateProfile={onNavigateProfile}
        onNavigateTrash={onNavigateTrash}
        onLogout={onLogout}
      />
    </header>
  )
}

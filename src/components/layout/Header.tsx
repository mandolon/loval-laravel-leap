/**
 * Header Component
 * Top navigation bar with search, theme toggle, and user menu
 */

import { SearchBar } from './header/SearchBar'
import { UserMenu } from './header/UserMenu'

interface HeaderProps {
  onNavigateProfile?: () => void
  onNavigateTrash?: () => void
  onLogout?: () => void
}

export function Header({ onNavigateProfile, onNavigateTrash, onLogout }: HeaderProps) {
  const handleSearch = (query: string) => {
    // TODO: Implement global search functionality
  }

  return (
    <header className="h-[60px] bg-card flex items-center px-4 gap-4 flex-shrink-0">
      {/* Centered Search Bar */}
      <div className="flex-1 flex justify-center max-w-md">
        <SearchBar onSearch={handleSearch} />
      </div>

      {/* Right Side Actions */}
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

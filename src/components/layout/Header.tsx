/**
 * Header Component
 * Top navigation bar with search, theme toggle, and user menu
 */

import { SearchBar } from './header/SearchBar'
import { ThemeToggle } from './header/ThemeToggle'
import { UserMenu } from './header/UserMenu'
import { useLayout } from '@/contexts/LayoutContext'

interface HeaderProps {
  onNavigateProfile?: () => void
  onNavigateTrash?: () => void
  onLogout?: () => void
}

export function Header({ onNavigateProfile, onNavigateTrash, onLogout }: HeaderProps) {
  const { theme, toggleTheme } = useLayout()

  const handleSearch = (query: string) => {
    // TODO: Implement global search functionality
  }

  return (
    <header className="h-[60px] border-b border-border bg-card flex items-center px-4 gap-4 flex-shrink-0">
      {/* Centered Search Bar */}
      <div className="flex-1 flex justify-center">
        <SearchBar onSearch={handleSearch} />
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-2">
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
        <UserMenu
          onNavigateProfile={onNavigateProfile}
          onNavigateTrash={onNavigateTrash}
          onLogout={onLogout}
        />
      </div>
    </header>
  )
}

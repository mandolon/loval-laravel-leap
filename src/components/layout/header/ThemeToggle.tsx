/**
 * ThemeToggle Component
 * Toggles between light and dark mode
 */

import { Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ThemeToggleProps {
  theme: string | undefined
  onToggle: () => void
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={onToggle}
    >
      {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </Button>
  )
}

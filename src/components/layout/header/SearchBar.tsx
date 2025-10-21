/**
 * SearchBar Component
 * Global search input (placeholder for future implementation)
 */

import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface SearchBarProps {
  onSearch?: (query: string) => void
}

export function SearchBar({ onSearch }: SearchBarProps) {
  return (
    <div className="relative max-w-2xl w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search for people, projects, files, tasks, notes..."
        className="pl-10 bg-background border-border"
        readOnly
      />
    </div>
  )
}

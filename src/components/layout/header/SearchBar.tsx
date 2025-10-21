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
    <div className="relative w-full">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
      <Input
        placeholder="Search..."
        className="pl-8 pr-3 py-1 h-8 text-sm bg-background border-border"
        readOnly
      />
    </div>
  )
}

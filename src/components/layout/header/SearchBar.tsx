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
      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
      <Input
        placeholder="Search..."
        className="pl-7 pr-2 py-0.5 h-6 text-[12px] bg-background border-border w-full"
        readOnly
      />
    </div>
  )
}

/**
 * ProjectFilters Component
 * Status filter buttons for projects
 */

import type { ProjectFiltersProps } from '@/types/layout.types'
import { DESIGN_TOKENS as T } from '@/lib/design-tokens'
import { useNavigate } from 'react-router-dom'
import { useWorkspaces } from '@/hooks/useWorkspaces'

export function ProjectFilters({ activeStatus, onStatusChange }: ProjectFiltersProps) {
  const navigate = useNavigate()
  const { currentWorkspaceId } = useWorkspaces()

  const statusFilters = [
    { label: 'In Progress', value: 'inProgress' as const },
    { label: 'Pending', value: 'paused' as const },
    { label: 'Completed', value: 'completed' as const },
    { label: 'Archived', value: 'archived' as const },
  ]

  const handleStatusFilterClick = (filter: typeof statusFilters[0]) => {
    onStatusChange(filter.value)
    if (currentWorkspaceId) {
      const statusMap = {
        inProgress: 'active',
        paused: 'pending',
        completed: 'completed',
        archived: 'archived'
      }
      navigate(`/workspace/${currentWorkspaceId}/projects?status=${statusMap[filter.value]}`)
    }
  }

  return (
    <div className="flex-shrink-0">
      <div className="flex flex-col items-start justify-start px-3 py-2 space-y-2">
        {statusFilters.map((filter) => (
          <button
            key={filter.label}
            type="button"
            onClick={() => handleStatusFilterClick(filter)}
            className={`px-2.5 py-1 ${T.radius} w-full text-left transition-colors ${
              activeStatus === filter.value
                ? 'bg-accent text-accent-foreground font-medium'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
            } ${T.focus}`}
            aria-current={activeStatus === filter.value ? 'true' : undefined}
          >
            {filter.label}
          </button>
        ))}
      </div>
    </div>
  )
}

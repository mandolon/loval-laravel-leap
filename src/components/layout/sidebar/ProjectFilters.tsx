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
    <div className={`border-t border-slate-200 dark:border-[#1a2030]/40 flex-shrink-0`}>
      <div className="flex flex-col items-start justify-start px-3 py-2 space-y-2">
        {statusFilters.map((filter) => (
          <button
            key={filter.label}
            type="button"
            onClick={() => handleStatusFilterClick(filter)}
            className={`px-2.5 py-1 ${T.radius} w-full text-left transition-colors ${
              activeStatus === filter.value
                ? 'bg-slate-100 dark:bg-[#141C28] text-[#00639b] dark:text-blue-300 font-medium'
                : 'text-slate-500 dark:text-neutral-400 hover:bg-slate-50 dark:hover:bg-[#141C28] hover:text-slate-700 dark:hover:text-blue-300'
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

import { Button } from '@/components/ui/button'
import { RefreshCw, BarChart3, UserCheck, FileCode } from 'lucide-react'

interface QuickActionsProps {
  chatOpened: boolean
  onActionClick: (description: string) => void
}

interface QuickAction {
  icon: typeof RefreshCw
  label: string
  description: string
}

const quickActions: QuickAction[] = [
  {
    icon: RefreshCw,
    label: 'Workspace Updates',
    description: 'Summarize recent updates across all workspace projects.',
  },
  {
    icon: BarChart3,
    label: 'Project Status',
    description: 'Show the current status of this project.',
  },
  {
    icon: UserCheck,
    label: 'Assign Tasks',
    description: 'Assign tasks to team members based on their workload and expertise.',
  },
  {
    icon: FileCode,
    label: 'Code Analysis',
    description: 'Check the latest building codes for this condition:',
  },
]

export function QuickActions({ chatOpened, onActionClick }: QuickActionsProps) {
  return (
    <div
      className={`flex flex-wrap gap-2 justify-center max-w-2xl mx-auto mt-1 transition-all duration-700 ease-out ${
        chatOpened
          ? 'opacity-0 scale-95 h-0 overflow-hidden pointer-events-none'
          : 'opacity-100 scale-100'
      }`}
    >
      {quickActions.map((action, index) => (
        <Button
          key={index}
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium transition-colors"
          onClick={() => onActionClick(action.description)}
        >
          <action.icon className="w-3.5 h-3.5" />
          <span>{action.label}</span>
        </Button>
      ))}
    </div>
  )
}

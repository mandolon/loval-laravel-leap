import { Sparkles } from 'lucide-react'

interface ChatHeaderProps {
  chatOpened: boolean
}

export function ChatHeader({ chatOpened }: ChatHeaderProps) {
  return (
    <div
      className={`text-center max-w-3xl transition-all duration-700 ease-out ${
        chatOpened
          ? 'opacity-0 scale-95 pointer-events-none h-0 overflow-hidden'
          : 'opacity-100 scale-100 mb-2'
      }`}
    >
      <div className="flex items-center justify-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-blue-600" />
        <h1 className="text-2xl font-semibold leading-tight tracking-normal text-foreground">
          How can I help you today?
        </h1>
      </div>
    </div>
  )
}

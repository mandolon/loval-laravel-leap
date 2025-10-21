interface ChatFooterProps {
  chatOpened: boolean
}

export function ChatFooter({ chatOpened }: ChatFooterProps) {
  return (
    <div
      className={`text-center transition-all duration-700 ease-out ${
        chatOpened
          ? 'opacity-0 scale-95 h-0 overflow-hidden pointer-events-none mt-0'
          : 'opacity-100 scale-100 mt-7'
      }`}
    >
      <p className="text-[10px] text-muted-foreground">
        AI can make mistakes. Please verify important information.
      </p>
    </div>
  )
}

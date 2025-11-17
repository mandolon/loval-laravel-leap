interface ChatFooterProps {
  chatOpened: boolean
}

export function ChatFooter({ chatOpened }: ChatFooterProps) {
  return (
    <div
      className={`text-center transition-all duration-700 ease-out ${
        chatOpened
          ? 'opacity-0 scale-95 h-0 overflow-hidden pointer-events-none mt-0'
          : 'opacity-100 scale-100 mt-4'
      }`}
    >
      <p className="text-[11px] text-muted-foreground">
        MyHome AI Assistant only supports project management inside this workspace.
      </p>
    </div>
  )
}

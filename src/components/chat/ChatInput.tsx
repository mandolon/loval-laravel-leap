import { useState, useRef, useEffect } from 'react'
import { Send, X } from 'lucide-react'
import type { ChatMessageData } from './ChatMessage'

interface ChatInputProps {
  onSendMessage: (content: string, replyToId?: string) => void
  replyingTo?: ChatMessageData | null
  onCancelReply?: () => void
  disabled?: boolean
}

export const ChatInput = ({ onSendMessage, replyingTo, onCancelReply, disabled }: ChatInputProps) => {
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (replyingTo) {
      textareaRef.current?.focus()
    }
  }, [replyingTo])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (message.trim()) {
      onSendMessage(message.trim(), replyingTo?.id)
      setMessage('')
      if (onCancelReply) {
        onCancelReply()
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {replyingTo && (
        <div className="mb-2 flex items-center justify-between bg-slate-50 dark:bg-[#141C28] px-2 py-1 rounded-[6px]">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-500 dark:text-neutral-400">Replying to</span>
            <span className="text-[10px] font-medium text-slate-700 dark:text-neutral-300">{replyingTo.user?.name}</span>
          </div>
          <button
            type="button"
            className="h-5 w-5 grid place-items-center text-slate-500 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-[#0E1118] rounded-[6px]"
            onClick={onCancelReply}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          rows={1}
          disabled={disabled}
          className="h-8 px-2 py-1 bg-white dark:bg-[#0E1118] border border-slate-200 dark:border-[#283046]/60 rounded-[6px] text-[12px] text-slate-700 dark:text-neutral-200 placeholder:text-slate-400 dark:placeholder:text-neutral-500 resize-none focus:outline-none focus:ring-1 focus:ring-[#9ecafc] dark:focus:ring-[#3b82f6]/40"
        />
        <button 
          type="submit" 
          disabled={!message.trim() || disabled}
          className="h-8 px-3 bg-white dark:bg-[#0E1118] border border-slate-200 dark:border-[#283046]/60 rounded-[6px] text-[12px] text-slate-700 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-[#141C28] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-[#9ecafc] dark:focus:ring-[#3b82f6]/40 flex items-center justify-center"
        >
          <Send className="h-3 w-3" />
        </button>
      </div>
    </form>
  )
}

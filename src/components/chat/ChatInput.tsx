import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
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
    <form onSubmit={handleSubmit} className="space-y-2">
      {replyingTo && (
        <div className="flex items-center justify-between bg-muted/50 px-3 py-2 rounded-md text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Replying to</span>
            <span className="font-medium">{replyingTo.user?.name}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={onCancelReply}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
      
      <div className="flex gap-2">
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Shift+Enter for new line)"
          className="min-h-[60px] max-h-[120px] resize-none"
          disabled={disabled}
        />
        <Button 
          type="submit" 
          size="icon" 
          disabled={!message.trim() || disabled}
          className="flex-shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </form>
  )
}

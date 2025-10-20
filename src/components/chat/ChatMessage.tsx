import { useState } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { MoreVertical, Trash2, Reply } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'

export interface ChatMessageData {
  id: string
  shortId: string
  projectId: string
  userId: string
  content: string
  referencedFiles: string[]
  referencedTasks: string[]
  replyToMessageId?: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
  deletedBy?: string
  user?: {
    id: string
    name: string
    avatarUrl?: string
  }
}

interface ChatMessageProps {
  message: ChatMessageData
  onDelete: (id: string) => void
  onReply?: (message: ChatMessageData) => void
  isReply?: boolean
}

export const ChatMessage = ({ message, onDelete, onReply, isReply = false }: ChatMessageProps) => {
  const [showActions, setShowActions] = useState(false)

  if (!message.user) return null

  return (
    <div 
      className={`flex gap-2 group ${isReply ? 'ml-8 mt-2' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <Avatar className="h-7 w-7 flex-shrink-0">
        <AvatarFallback 
          className="text-white text-[10px] font-semibold"
          style={{ background: message.user.avatarUrl || 'linear-gradient(135deg, hsl(280, 70%, 60%) 0%, hsl(320, 80%, 65%) 100%)' }}
        >
          {message.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-baseline gap-2">
          <span className="font-medium text-[12px] text-slate-700 dark:text-neutral-200">{message.user.name}</span>
          <span className="text-[10px] text-slate-400 dark:text-neutral-500">
            {format(new Date(message.createdAt), 'MMM d, h:mm a')}
          </span>
        </div>

        <div className="bg-slate-50 dark:bg-[#141C28] border border-slate-200 dark:border-[#1a2030]/60 p-2 rounded-[6px] max-w-[85%]">
          <p className="text-[12px] text-slate-700 dark:text-neutral-300 whitespace-pre-wrap break-words">{message.content}</p>
          
          {message.referencedTasks.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {message.referencedTasks.map(taskId => (
                <Badge key={taskId} variant="secondary" className="text-xs">
                  Task: {taskId.slice(0, 8)}
                </Badge>
              ))}
            </div>
          )}
          
          {message.referencedFiles.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {message.referencedFiles.map(fileId => (
                <Badge key={fileId} variant="outline" className="text-xs">
                  File: {fileId.slice(0, 8)}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {showActions && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onReply && !isReply && (
              <button 
                type="button"
                className="px-2 py-0.5 text-[10px] text-slate-500 dark:text-neutral-400 hover:bg-slate-50 dark:hover:bg-[#141C28] rounded-[6px] flex items-center gap-1"
                onClick={() => onReply(message)}
              >
                <Reply className="h-3 w-3" />
                Reply
              </button>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  type="button"
                  className="h-6 w-6 grid place-items-center text-slate-500 dark:text-neutral-400 hover:bg-slate-50 dark:hover:bg-[#141C28] rounded-[6px]"
                >
                  <MoreVertical className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => onDelete(message.id)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  )
}

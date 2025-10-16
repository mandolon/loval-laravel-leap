import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
      className={`flex gap-3 group ${isReply ? 'ml-12 mt-2' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarFallback 
          className="text-white text-xs"
          style={{ background: message.user.avatarUrl || 'linear-gradient(135deg, hsl(280, 70%, 60%) 0%, hsl(320, 80%, 65%) 100%)' }}
        >
          {message.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-baseline gap-2">
          <span className="font-medium text-sm">{message.user.name}</span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(message.createdAt), 'MMM d, h:mm a')}
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">{message.shortId}</span>
        </div>

        <Card className="p-3 bg-muted/30">
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          
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
        </Card>

        {showActions && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onReply && !isReply && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs"
                onClick={() => onReply(message)}
              >
                <Reply className="h-3 w-3 mr-1" />
                Reply
              </Button>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <MoreVertical className="h-3 w-3" />
                </Button>
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

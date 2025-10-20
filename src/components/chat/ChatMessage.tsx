import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Trash2, Reply, CornerDownRight } from 'lucide-react'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
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
  replies?: ChatMessageData[]
  replyCount?: number
}

interface ChatMessageProps {
  message: ChatMessageData
  onDelete: (id: string) => void
  onReply?: (message: ChatMessageData) => void
  isReply?: boolean
  showAvatar?: boolean
}

export const ChatMessage = ({ message, onDelete, onReply, isReply = false, showAvatar = true }: ChatMessageProps) => {
  if (!message.user) return null

  return (
    <div className="flex flex-col">
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className={`flex gap-2 group ${isReply ? 'ml-8 mt-1' : ''}`}>
            {showAvatar && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Avatar className="h-7 w-7 flex-shrink-0 cursor-pointer">
                      <AvatarFallback 
                        className="text-white text-[10px] font-semibold"
                        style={{ background: message.user.avatarUrl || 'linear-gradient(135deg, hsl(280, 70%, 60%) 0%, hsl(320, 80%, 65%) 100%)' }}
                      >
                        {message.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-[11px]">
                    <div className="font-medium">{message.user.name}</div>
                    <div className="text-muted-foreground">{format(new Date(message.createdAt), 'MMM d, h:mm a')}</div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {isReply && !showAvatar && (
              <div className="h-7 w-7 flex-shrink-0 flex items-center justify-center">
                <CornerDownRight className="h-3 w-3 text-slate-400 dark:text-neutral-600" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              {isReply && (
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="text-[10px] font-medium text-slate-600 dark:text-neutral-400">{message.user.name}</span>
                  <span className="text-[9px] text-slate-400 dark:text-neutral-500">
                    {format(new Date(message.createdAt), 'h:mm a')}
                  </span>
                </div>
              )}

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

              {!isReply && message.replyCount && message.replyCount > 0 && (
                <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-500 dark:text-neutral-500">
                  <CornerDownRight className="h-3 w-3" />
                  <span>{message.replyCount} {message.replyCount === 1 ? 'reply' : 'replies'}</span>
                </div>
              )}
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-40">
          {onReply && !isReply && (
            <ContextMenuItem onClick={() => onReply(message)}>
              <Reply className="mr-2 h-4 w-4" />
              Reply
            </ContextMenuItem>
          )}
          <ContextMenuItem 
            onClick={() => onDelete(message.id)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* Render replies */}
      {!isReply && message.replies && message.replies.length > 0 && (
        <div className="mt-1 space-y-1">
          {message.replies.map(reply => (
            <ChatMessage 
              key={reply.id}
              message={reply}
              onDelete={onDelete}
              isReply={true}
              showAvatar={false}
            />
          ))}
        </div>
      )}
    </div>
  )
}

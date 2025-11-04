import { useState } from 'react'
import { Trash2, Reply, Pencil, Check, X, Copy } from 'lucide-react'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { UTILITY_CLASSES } from '@/lib/design-tokens'
import type { WorkspaceChatMessageWithUser } from '@/lib/api/hooks/useWorkspaceChat'

interface WorkspaceChatMessageProps {
  message: WorkspaceChatMessageWithUser
  onDelete: (id: string) => void
  onReply?: (messageId: string, userName: string) => void
  onEdit?: (id: string, content: string) => void
  onCopy?: (content: string) => void
  currentUserId?: string
}

export const WorkspaceChatMessage = ({ 
  message, 
  onDelete, 
  onReply, 
  onEdit,
  onCopy, 
  currentUserId 
}: WorkspaceChatMessageProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const [isHovered, setIsHovered] = useState(false)
  
  if (!message.user) return null

  const isOwnMessage = currentUserId === message.userId
  
  const handleSaveEdit = () => {
    if (onEdit && editContent.trim() !== message.content) {
      onEdit(message.id, editContent.trim())
    }
    setIsEditing(false)
  }
  
  const handleCancelEdit = () => {
    setEditContent(message.content)
    setIsEditing(false)
  }

  const handleCopy = () => {
    if (onCopy) {
      onCopy(message.content)
    }
  }

  return (
    <div className="flex flex-col">
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div 
            className="group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-[11px] font-medium text-slate-600 dark:text-neutral-400">
                {message.user.name}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-neutral-500">
                {format(new Date(message.createdAt), 'MMM d, h:mm a')}
              </span>
            </div>

            <div 
              className={`${UTILITY_CLASSES.chatBubble} transition-colors ${
                isOwnMessage && isHovered && !isEditing
                  ? 'border-slate-300 dark:border-[#283046] cursor-pointer'
                  : ''
              }`}
              onClick={() => isOwnMessage && !isEditing && setIsEditing(true)}
            >
              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className={`w-full min-h-[60px] ${UTILITY_CLASSES.inputBase} resize-none`}
                    autoFocus
                  />
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      className="h-6 px-2 flex items-center gap-1 text-[11px] bg-slate-700 dark:bg-[#3b82f6] text-white rounded-[4px] hover:bg-slate-800 dark:hover:bg-[#2563eb]"
                    >
                      <Check className="h-3 w-3" />
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="h-6 px-2 flex items-center gap-1 text-[11px] border border-slate-200 dark:border-[#283046]/60 text-slate-600 dark:text-neutral-400 rounded-[4px] hover:bg-slate-100 dark:hover:bg-[#1a2030]"
                    >
                      <X className="h-3 w-3" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-[12px] text-slate-700 dark:text-neutral-300 whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                  
                  {message.referencedTasks && message.referencedTasks.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {message.referencedTasks.map(taskId => (
                        <Badge key={taskId} variant="secondary" className="text-xs">
                          Task: {taskId.slice(0, 8)}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  {message.referencedFiles && message.referencedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {message.referencedFiles.map(fileId => (
                        <Badge key={fileId} variant="outline" className="text-xs">
                          File: {fileId.slice(0, 8)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-40">
          {onReply && (
            <ContextMenuItem onClick={() => onReply(message.id, message.user?.name || 'User')}>
              <Reply className="mr-2 h-4 w-4" />
              Reply
            </ContextMenuItem>
          )}
          {isOwnMessage && onEdit && (
            <ContextMenuItem onClick={() => setIsEditing(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </ContextMenuItem>
          )}
          <ContextMenuItem onClick={handleCopy}>
            <Copy className="mr-2 h-4 w-4" />
            Copy
          </ContextMenuItem>
          <ContextMenuItem 
            onClick={() => onDelete(message.id)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  )
}

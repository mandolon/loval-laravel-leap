import { useState } from 'react'
import { Trash2, Reply, CornerDownRight, Pencil, Check, X } from 'lucide-react'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu'
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
  replies?: ChatMessageData[]
  replyCount?: number
}

interface ChatMessageProps {
  message: ChatMessageData
  onDelete: (id: string) => void
  onReply?: (message: ChatMessageData) => void
  onEdit?: (id: string, content: string) => void
  currentUserId?: string
  isReply?: boolean
}

export const ChatMessage = ({ message, onDelete, onReply, onEdit, currentUserId, isReply = false }: ChatMessageProps) => {
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

  return (
    <div className="flex flex-col">
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div 
            className={`group ${isReply ? 'ml-8 mt-1' : ''}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div className="flex items-baseline gap-2 mb-1">
              {isReply && (
                <CornerDownRight className="h-3 w-3 text-slate-400 dark:text-neutral-600 flex-shrink-0" />
              )}
              <span className="text-[11px] font-medium text-slate-600 dark:text-neutral-400">
                {message.user.name}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-neutral-500">
                {format(new Date(message.createdAt), 'MMM d, h:mm a')}
              </span>
              {isOwnMessage && isHovered && !isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="ml-auto px-1.5 py-0.5 text-[10px] text-slate-500 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-[#1a2030] rounded-[4px] opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Edit message"
                >
                  Edit
                </button>
              )}
            </div>

            <div 
              className={`bg-slate-50 dark:bg-[#141C28] border p-2 rounded-[6px] max-w-[85%] transition-colors ${
                isOwnMessage && isHovered && !isEditing
                  ? 'border-slate-300 dark:border-[#283046]'
                  : 'border-slate-200 dark:border-[#1a2030]/60'
              }`}
            >
              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full min-h-[60px] px-2 py-1 text-[12px] bg-white dark:bg-[#0E1118] border border-slate-200 dark:border-[#283046]/60 rounded-[4px] text-slate-700 dark:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-[#9ecafc] dark:focus:ring-[#3b82f6]/40 resize-none"
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
                </>
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
          {isOwnMessage && onEdit && (
            <ContextMenuItem onClick={() => setIsEditing(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
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
              onEdit={onEdit}
              currentUserId={currentUserId}
              onReply={onReply}
              isReply={true}
            />
          ))}
        </div>
      )}
    </div>
  )
}

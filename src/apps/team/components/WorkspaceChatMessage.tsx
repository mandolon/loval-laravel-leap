import { useState, useEffect, useRef } from 'react'
import { Trash2, Reply, Pencil, Check, X, Copy } from 'lucide-react'
import type { WorkspaceChatMessageWithUser } from '@/lib/api/hooks/useWorkspaceChat'
import { TeamAvatar } from '@/components/TeamAvatar'
import { supabase } from "@/integrations/supabase/client"

// Theme Configuration - Exact from TeamChatSlim MessageBlock
const THEME = {
  background: "#fcfcfc",
  card: "#ffffff",
  border: "#e2e8f0",
  text: "#0f172a",
  textSecondary: "#475569",
  accent: "#4C75D1",
  hover: "#f1f5f9",
  highlight: "#f1f5f9",
  avatarBackground: "#000000",
  avatarBorder: "#000000",
  avatarText: "#ffffff",
  fontFamily: "'Segoe UI', 'Roboto', 'Helvetica Neue', -apple-system, BlinkMacSystemFont, Arial, sans-serif",
  borderRadius: "12px",
}

interface WorkspaceChatMessageProps {
  message: WorkspaceChatMessageWithUser
  onDelete: (id: string) => void
  onReply?: (messageId: string, userName: string) => void
  onEdit?: (id: string, content: string) => void
  onCopy?: (content: string) => void
  currentUserId?: string
  isUnread?: boolean
}

export const WorkspaceChatMessage = ({ 
  message, 
  onDelete, 
  onReply, 
  onEdit,
  onCopy, 
  currentUserId,
  isUnread = false
}: WorkspaceChatMessageProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const [isLongPressing, setIsLongPressing] = useState(false)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const touchStart = useRef({ x: 0, y: 0 })
  const [hasPopoverOpen, setHasPopoverOpen] = useState(false)

  // Inject CSS animation for unread highlights
  useEffect(() => {
    const style = document.createElement('style')
    style.id = 'workspace-chat-animations'
    if (!document.getElementById('workspace-chat-animations')) {
      style.textContent = `
        @keyframes unreadHighlight {
          0% {
            background-color: rgba(76, 117, 209, 0.08);
            box-shadow: inset 3px 0 0 0 #4C75D1;
          }
          100% {
            background-color: transparent;
            box-shadow: none;
          }
        }
        .unread-message-highlight {
          animation: unreadHighlight 2.5s ease-out forwards;
        }
      `
      document.head.appendChild(style)
    }
    return () => {
      const existingStyle = document.getElementById('workspace-chat-animations')
      if (existingStyle && document.querySelectorAll('.unread-message-highlight').length === 0) {
        existingStyle.remove()
      }
    }
  }, [])
  
  if (!message.user) return null

  const isOwnMessage = currentUserId === message.userId
  const name = message.user.name || "User"

  useEffect(() => {
    const handlePopoverOpen = (e: any) => {
      if (e.detail.messageId === message.id) {
        setHasPopoverOpen(true)
      }
    }

    const handlePopoverClose = () => {
      setHasPopoverOpen(false)
    }

    window.addEventListener("showMobilePopover", handlePopoverOpen)
    window.addEventListener("closeMobilePopover", handlePopoverClose)

    return () => {
      window.removeEventListener("showMobilePopover", handlePopoverOpen)
      window.removeEventListener("closeMobilePopover", handlePopoverClose)
    }
  }, [message.id])

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isEditing) return
    const touch = e.touches[0]
    touchStart.current = { x: touch.clientX, y: touch.clientY }
    setIsLongPressing(true)

    const touchX = touch.clientX
    const touchY = touch.clientY

    longPressTimer.current = setTimeout(() => {
      if (window.innerWidth < 768) {
        const event = new CustomEvent("showMobilePopover", {
          detail: {
            messageId: message.id,
            isMe: isOwnMessage,
            x: touchX,
            y: touchY,
          },
        })
        window.dispatchEvent(event)
      }
      setIsLongPressing(false)
    }, 500)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    const moveX = Math.abs(touch.clientX - touchStart.current.x)
    const moveY = Math.abs(touch.clientY - touchStart.current.y)

    if (moveX > 10 || moveY > 10) {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }
      setIsLongPressing(false)
    }
  }

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    setIsLongPressing(false)
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    if (isEditing) return
    e.preventDefault()
    if (window.innerWidth >= 768) {
      const event = new CustomEvent("showMobilePopover", {
        detail: {
          messageId: message.id,
          isMe: isOwnMessage,
          x: e.clientX,
          y: e.clientY,
        },
      })
      window.dispatchEvent(event)
    }
  }
  
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

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
  }

  const isHighlighted = isLongPressing || hasPopoverOpen

  // Own message styling - bordered card with left margin
  if (isOwnMessage) {
    return (
      <div className="group pr-7 transition-all duration-200">
        <article
          id={`message-${message.id}`}
          onContextMenu={handleContextMenu}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={`rounded-2xl border p-4 shadow-[0_1px_0_rgba(0,0,0,0.03)] cursor-pointer transition-colors flex items-start gap-3 ${isUnread ? 'unread-message-highlight' : ''}`}
          style={{
            borderColor: THEME.border,
            background: isHighlighted ? THEME.highlight : THEME.card,
            marginLeft: "28px",
          }}
        >
          <div className="min-w-0 flex-1">
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full min-h-[60px] resize-none bg-transparent text-[16px] leading-6 md:leading-7 outline-none p-2 border rounded-lg"
                  style={{ 
                    fontFamily: THEME.fontFamily, 
                    color: THEME.text,
                    borderColor: THEME.border,
                  }}
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    className="px-3 py-1.5 text-sm rounded-lg transition-colors"
                    style={{
                      background: THEME.accent,
                      color: '#ffffff',
                    }}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-3 py-1.5 text-sm rounded-lg border transition-colors"
                    style={{
                      borderColor: THEME.border,
                      color: THEME.textSecondary,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                  <span className="font-semibold text-[15px]" style={{ color: THEME.text }}>
                    {name || "You"}
                  </span>
                  <span className="text-xs opacity-50">{formatTime(message.createdAt)}</span>
                  {message.replyToMessageId && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-md"
                      style={{
                        background: "rgba(76, 117, 209, 0.1)",
                        color: "#4C75D1",
                      }}
                    >
                      Reply
                    </span>
                  )}
                </div>

                {message.content && (
                  <div
                    className="message-content whitespace-pre-wrap text-[16px] leading-6 md:leading-7"
                    style={{ fontFamily: THEME.fontFamily, color: THEME.text }}
                  >
                    {message.content}
                  </div>
                )}
                
                {message.fileDetails && message.fileDetails.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {message.fileDetails.map(file => (
                      <div
                        key={file.id}
                        className="flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700"
                        onClick={() => {
                          const { data } = supabase.storage
                            .from('workspace-files')
                            .getPublicUrl(file.storage_path)
                          window.open(data.publicUrl, '_blank')
                        }}
                      >
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        <span className="max-w-[150px] truncate">{file.filename}</span>
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </article>
      </div>
    )
  }

  // Other user's message - avatar + clean text layout
  return (
    <div className="group pr-7 transition-all duration-200">
      <div
        id={`message-${message.id}`}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="flex items-start gap-3 justify-start cursor-pointer rounded-2xl py-1.5 px-2 -mx-2 transition-colors"
        style={{
          background: isHighlighted ? THEME.highlight : "transparent",
        }}
      >
        <AvatarCircle name={name} user={message.user} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 mb-0.5 flex-wrap">
            <span className="font-medium text-[14px]" style={{ color: THEME.text }}>
              {name}
            </span>
            <span className="text-xs opacity-50">{formatTime(message.createdAt)}</span>
            {message.replyToMessageId && (
              <span
                className="text-xs px-2 py-0.5 rounded-md"
                style={{
                  background: "rgba(76, 117, 209, 0.1)",
                  color: "#4C75D1",
                }}
              >
                Reply
              </span>
            )}
          </div>

          {message.content && (
            <div
              className="message-content whitespace-pre-wrap text-[16px] leading-6 md:leading-7"
              style={{ fontFamily: THEME.fontFamily, color: THEME.text }}
            >
              {message.content}
            </div>
          )}
          
          {message.fileDetails && message.fileDetails.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {message.fileDetails.map(file => (
                <div
                  key={file.id}
                  className="flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700"
                  onClick={() => {
                    const { data } = supabase.storage
                      .from('workspace-files')
                      .getPublicUrl(file.storage_path)
                    window.open(data.publicUrl, '_blank')
                  }}
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <span className="max-w-[150px] truncate">{file.filename}</span>
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AvatarCircle({ name, user }: { name: string; user: { id: string; name: string; avatarUrl?: string | null } | null }) {
  if (!user) return null;
  
  return (
    <TeamAvatar 
      user={{ ...user, avatar_url: user.avatarUrl, name }} 
      size="md" 
      className="opacity-80"
    />
  );
}

import { useState, useEffect, useRef } from 'react'
import { Trash2, Reply, Pencil, Check, X, Copy } from 'lucide-react'
import type { WorkspaceChatMessageWithUser } from '@/lib/api/hooks/useWorkspaceChat'

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
  const [isLongPressing, setIsLongPressing] = useState(false)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const touchStart = useRef({ x: 0, y: 0 })
  const [hasPopoverOpen, setHasPopoverOpen] = useState(false)
  
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
          className="rounded-2xl border p-4 shadow-[0_1px_0_rgba(0,0,0,0.03)] cursor-pointer transition-colors flex items-start gap-3"
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
        className="flex items-start gap-3 justify-start cursor-pointer rounded-2xl p-2 -m-2 transition-colors"
        style={{
          background: isHighlighted ? THEME.highlight : "transparent",
        }}
      >
        <AvatarCircle name={name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 mb-1 flex-wrap">
            <span className="font-semibold text-[15px]" style={{ color: THEME.text }}>
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
        </div>
      </div>
    </div>
  )
}

function AvatarCircle({ name }: { name: string }) {
  const getInitials = (name: string) => {
    const clean = (name || "").trim().replace(/\s+/g, " ")
    if (!clean) return "YY"
    const parts = clean.split(" ")
    const f = parts[0] || ""
    const l = parts.length > 1 ? parts[parts.length - 1] : ""
    const pick = (s: string) => (s.match(/[A-Za-z\p{L}]/u)?.[0] || "").toUpperCase()
    const a = pick(f)
    const b = l ? pick(l) : f.length > 1 ? f[1].toUpperCase() : ""
    const res = (a + b).slice(0, 2) || "YY"
    return res
  }

  const initials = getInitials(name)
  return (
    <div
      title={name}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full border text-[12px] font-semibold opacity-80"
      style={{
        borderColor: THEME.avatarBorder,
        background: THEME.avatarBackground,
        color: THEME.avatarText,
      }}
    >
      {initials}
    </div>
  )
}

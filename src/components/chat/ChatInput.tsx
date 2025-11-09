import { useState, useRef, useEffect } from 'react'
import { Send, X } from 'lucide-react'
import type { ChatMessageData } from './ChatMessage'
import { UTILITY_CLASSES } from '@/lib/design-tokens'
import FileUploadChip, { type UploadStatus } from './FileUploadChip'

interface ChatInputProps {
  onSendMessage: (content: string, replyToId?: string) => void
  replyingTo?: ChatMessageData | null
  onCancelReply?: () => void
  disabled?: boolean
  projectName?: string
}

type UploadItem = {
  id: string
  file: File
  progress: number
  status: UploadStatus
}

export const ChatInput = ({ onSendMessage, replyingTo, onCancelReply, disabled, projectName }: ChatInputProps) => {
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const [dragOver, setDragOver] = useState(false)

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

  const handlePickFiles = () => {
    fileInputRef.current?.click()
  }

  const processFiles = (files: File[]) => {
    if (!files.length) return

    const now = Date.now()
    const newUploads: UploadItem[] = files.map((f, i) => ({
      id: `${now}-${i}-${Math.random().toString(36).slice(2, 8)}`,
      file: f,
      progress: 0,
      status: 'uploading' as UploadStatus,
    }))
    setUploads((prev) => [...prev, ...newUploads])

    // Simulate upload progress; replace with real upload integration
    newUploads.forEach((item) => {
      const totalMs = 1500 + Math.random() * 1500
      const start = Date.now()
      const fileId = item.id
      const tick = () => {
        const elapsed = Date.now() - start
        const p = Math.min(100, Math.round((elapsed / totalMs) * 100))
        setUploads((files) =>
          files.map((f) => (f.id === fileId ? { ...f, progress: p, status: p >= 100 ? 'done' : 'uploading' } : f))
        )
        if (p < 100) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
  }

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    processFiles(files)
    // reset input to allow same file selection again
    e.target.value = ''
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    const dt = e.dataTransfer
    const files = dt?.files ? Array.from(dt.files) : []
    processFiles(files)
  }

  const removeUpload = (id: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== id))
  }

  const hasUploading = uploads.some((f) => f.status === 'uploading')

  return (
    <form onSubmit={handleSubmit}>
      {replyingTo && (
        <div className={`mb-2 flex items-center justify-between ${UTILITY_CLASSES.chatBubble} px-2 py-1 max-w-full`}>
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
      
      <div className="flex flex-col gap-3 rounded-lg border p-3 shadow-sm" style={{ borderColor: 'var(--chat-line, #E7E5E4)', background: 'var(--chat-card, #FFFFFF)' }}>
        {uploads.length > 0 && (
          <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto">
            {uploads.map((u) => (
              <FileUploadChip
                key={u.id}
                id={u.id}
                filename={u.file.name}
                projectName={projectName}
                size={u.file.size}
                status={u.status}
                progress={u.progress}
                onRemove={removeUpload}
              />
            ))}
          </div>
        )}
        
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          placeholder="Reply..."
          rows={1}
          disabled={disabled}
          className="w-full max-h-40 resize-none bg-transparent px-2 text-[15px] leading-[1.5] outline-none"
          style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", Ubuntu, Cantarell, "Helvetica Neue", Arial, "Apple Color Emoji", "Segoe UI Emoji", sans-serif' }}
        />
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFilesSelected}
            />
            <button
              type="button"
              onClick={handlePickFiles}
              disabled={disabled}
              title="Add attachment"
              className="relative grid h-8 w-8 place-items-center rounded-md border transition-colors hover:bg-black/5"
              style={{ borderColor: 'var(--chat-line, #E7E5E4)' }}
              aria-busy={hasUploading}
            >
              {hasUploading ? (
                <div className="spinner" aria-hidden style={{
                  width: '14px',
                  height: '14px',
                  border: '2px solid rgba(0,0,0,.15)',
                  borderTopColor: 'currentColor',
                  borderRadius: '9999px',
                }} />
              ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              )}
            </button>
            {projectName && (
              <button
                type="button"
                className="flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-sm transition-colors hover:bg-black/5"
                style={{ borderColor: 'var(--chat-line, #E7E5E4)' }}
              >
                <span>{projectName}</span>
                <svg className="h-3.5 w-3.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={!message.trim() || disabled}
            className="grid h-8 w-8 place-items-center rounded-md transition-colors disabled:opacity-40"
            style={{
              background: message.trim() ? 'var(--chat-ink, #1C1917)' : '#d4d4d8',
              color: message.trim() ? 'var(--chat-card, #FFFFFF)' : '#a1a1aa',
            }}
            onMouseEnter={(e) => {
              if (message.trim()) (e.currentTarget as HTMLButtonElement).style.background = '#111111'
            }}
            onMouseLeave={(e) => {
              if (message.trim()) (e.currentTarget as HTMLButtonElement).style.background = 'var(--chat-ink, #1C1917)'
            }}
            title="Send"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </button>
        </div>
      </div>
    </form>
  )
}

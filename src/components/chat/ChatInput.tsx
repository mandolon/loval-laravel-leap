import { useState, useRef, useEffect } from 'react'
import { Send, X, Plus } from 'lucide-react'
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
  uploadedBytes: number
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
      uploadedBytes: 0,
      status: 'uploading',
    }))
    setUploads((prev) => [...prev, ...newUploads])

    // Simulate upload progress; replace with real upload integration
    newUploads.forEach((item) => {
      const total = item.file.size || 1
      const step = Math.max(1024 * 50, Math.round(total / 40)) // ~40 ticks
      const interval = setInterval(() => {
        setUploads((prev) => {
          const next = prev.map((u) => {
            if (u.id !== item.id) return u
            const nextBytes = Math.min(total, u.uploadedBytes + step)
            const done = nextBytes >= total
            return { ...u, uploadedBytes: nextBytes, status: done ? 'done' : u.status }
          })
          return next
        })
      }, 120)

      // Stop the interval when finished
      const stopWhenDone = setInterval(() => {
        setUploads((prev) => {
          const me = prev.find((u) => u.id === item.id)
          if (!me) {
            clearInterval(interval)
            clearInterval(stopWhenDone)
            return prev
          }
          if (me.uploadedBytes >= total) {
            clearInterval(interval)
            clearInterval(stopWhenDone)
          }
          return prev
        })
      }, 250)
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

  const cancelUpload = (id: string) => {
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, status: 'canceled' } : u)))
    // Optionally remove after brief delay
    setTimeout(() => setUploads((prev) => prev.filter((u) => u.id !== id)), 300)
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Pending uploads row */}
      {uploads.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2 overflow-x-auto">
          {uploads.map((u) => (
            <FileUploadChip
              key={u.id}
              id={u.id}
              filename={u.file.name}
              projectName={projectName}
              totalBytes={u.file.size}
              uploadedBytes={u.uploadedBytes}
              status={u.status}
              onCancel={cancelUpload}
            />
          ))}
        </div>
      )}
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
      
      <div
        className={`grid grid-cols-[1fr_auto_auto] gap-2 ${dragOver ? 'ring-1 ring-sky-300 dark:ring-sky-700 rounded-[6px] bg-sky-50/40 dark:bg-sky-900/10' : ''}`}
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          rows={1}
          disabled={disabled}
          className={`${UTILITY_CLASSES.inputBase} resize-none`}
        />
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
          className="h-8 w-8 bg-white dark:bg-[#0E1118] border border-slate-200 dark:border-[#283046]/60 rounded-[6px] text-[12px] text-slate-700 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-[#141C28] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-[#9ecafc] dark:focus:ring-[#3b82f6]/40 flex items-center justify-center"
          title="Add files"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
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

import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { MouseEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ChevronDown, Lock, X } from 'lucide-react'
import FileUploadChip, { type UploadStatus } from './FileUploadChip'

interface ChatInputProps {
  message: string
  setMessage: (message: string) => void
  onSubmit: () => void
  isLoading: boolean
  chatOpened: boolean
  selectedProject: string
  setSelectedProject: (project: string) => void
  projectLocked: boolean
  projects: Array<{ id: string; name: string }>
  wrapperClassName?: string
  summaryAction?: ReactNode
  workspaceName?: string
}

type UploadItem = {
  id: string
  file: File
  progress: number
  status: UploadStatus
}

export function NewChatInput({
  message,
  setMessage,
  onSubmit,
  isLoading,
  chatOpened,
  selectedProject,
  setSelectedProject,
  projectLocked,
  projects,
  wrapperClassName,
  summaryAction,
  workspaceName,
}: ChatInputProps) {
  const [projectPopoverOpen, setProjectPopoverOpen] = useState(false)
  const [projectSearch, setProjectSearch] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const [dragOver, setDragOver] = useState(false)

  const allProjects = [
    { id: 'all', name: 'All Projects' },
    ...projects
  ]

  const filteredProjects = allProjects.filter((project) =>
    project.name.toLowerCase().includes(projectSearch.toLowerCase())
  )

  const selectedProjectName = allProjects.find(p => p.id === selectedProject)?.name || 'All Projects'

  useEffect(() => {
    if (projectLocked) {
      setProjectPopoverOpen(false)
    }
  }, [projectLocked])

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const minHeight = 48
    const maxHeight = 150

    textarea.style.height = 'auto'
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight)
    textarea.style.height = `${nextHeight}px`
  }, [message, chatOpened])

  const handleProjectPopoverChange = (open: boolean) => {
    if (projectLocked) return
    setProjectPopoverOpen(open)
  }

  const handleProjectReset = (event: MouseEvent<HTMLElement>) => {
    if (projectLocked) return
    event.stopPropagation()
    setSelectedProject('all')
  }

  const handleProjectSelect = (projectId: string) => {
    if (projectLocked) return
    setSelectedProject(projectId)
    setProjectPopoverOpen(false)
    setProjectSearch('')
  }

  const canClearProject = !projectLocked && selectedProject !== 'all'

  const defaultPadding = chatOpened ? 'px-4 pb-4 pt-3' : 'px-4'
  const containerPadding = wrapperClassName || defaultPadding

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
    <div className={`w-full transition-all duration-700 ease-out ${containerPadding}`}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner { animation: spin .8s linear infinite; }
      `}</style>
      <div className="relative overflow-hidden rounded-2xl ring-1 ring-border bg-background shadow-[0_22px_45px_-28px_rgba(15,23,42,0.35)] backdrop-blur-sm transition-all duration-300 max-w-3xl mx-auto">
        {uploads.length > 0 && (
          <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto px-5 pt-4 pb-2">
            {uploads.map((u) => (
              <FileUploadChip
                key={u.id}
                id={u.id}
                filename={u.file.name}
                projectName={workspaceName}
                size={u.file.size}
                status={u.status}
                progress={u.progress}
                onRemove={removeUpload}
              />
            ))}
          </div>
        )}
        
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={chatOpened ? 'Message AI Assistant...' : 'Message AI Assistant...'}
          rows={1}
          className="border-0 bg-transparent px-5 py-4 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground resize-none rounded-none"
          style={{ minHeight: 48, maxHeight: 150 }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              onSubmit()
            }
          }}
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        />

        {/* Input Controls */}
        <div className="flex items-center justify-between bg-background px-4 py-2.5 text-sm text-foreground transition-colors duration-200 rounded-none">
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
              disabled={isLoading}
              title="Add attachment"
              className="relative grid h-8 w-8 place-items-center rounded-md border transition-colors hover:bg-accent disabled:opacity-50"
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
            <Popover open={projectLocked ? false : projectPopoverOpen} onOpenChange={handleProjectPopoverChange}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={projectLocked}
                  className={`h-6 text-[10px] gap-1 border transition-all duration-300 ease-in-out relative ${
                    selectedProject !== 'all'
                      ? 'text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:pr-8'
                      : 'text-muted-foreground hover:text-foreground border-border'
                  } ${!projectLocked && selectedProject !== 'all' ? 'group' : ''}`}
                  style={{
                    backgroundColor: selectedProject !== 'all' ? '#e5f3ff' : 'transparent',
                  }}
                  title={projectLocked ? 'Project selection is locked for this chat' : undefined}
                >
                  {selectedProjectName}
                  {canClearProject ? (
                    <button
                      type="button"
                      className="opacity-0 group-hover:opacity-100 absolute right-1 top-1/2 -translate-y-1/2 flex h-4 w-4 items-center justify-center text-blue-600 transition-colors duration-300 hover:text-blue-700"
                      onClick={handleProjectReset}
                      aria-label="Clear selected project"
                    >
                      <X className="h-3 w-3" strokeWidth={2} />
                    </button>
                  ) : projectLocked ? (
                    <Lock className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-1" align="start" collisionPadding={8}>
                <div className="flex flex-col gap-0.5">
                  <Input
                    placeholder="Search"
                    value={projectSearch}
                    onChange={(event) => setProjectSearch(event.target.value)}
                    className="mb-1 text-[10px] h-6"
                    onClick={(event) => event.stopPropagation()}
                  />
                  {filteredProjects.map((project) => (
                    <div
                      key={project.id}
                      className={`flex items-center gap-1.5 px-1.5 py-1 hover:bg-accent rounded cursor-pointer ${
                        selectedProject === project.id ? 'bg-accent/50' : ''
                      }`}
                      onClick={() => handleProjectSelect(project.id)}
                    >
                      <span className="text-[10px] text-foreground">{project.name}</span>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center gap-3 text-[10px] font-medium text-muted-foreground">
            {summaryAction && (
              <div className="flex items-center">
                {summaryAction}
              </div>
            )}
            <span>Gemini 2.5 Flash</span>
            <button
              type="button"
              onClick={onSubmit}
              disabled={!message.trim() || isLoading}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground shadow-sm transition-colors duration-200 hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${
                message.trim() ? 'bg-blue-700 text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700' : ''
              }`}
              aria-label="Send message"
            >
              {isLoading ? (
                <div
                  className={`h-3 w-3 animate-spin rounded-full border-2 ${
                    message.trim() ? 'border-white border-t-transparent' : 'border-muted-foreground border-t-transparent'
                  }`}
                />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="h-3.5 w-3.5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0-6.5 6.5M12 5l6.5 6.5" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

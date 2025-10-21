import { useState, useEffect, useRef, useCallback } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import FileExplorer from './FileExplorer'
import PDFViewer from './PDFViewer'
import ImageViewer from './ImageViewer'
import { TabBar } from './TabBar'
import { generateFileId } from '@/lib/utils/uuid'
import { useUploadProjectFiles } from '@/lib/api/hooks/useProjectFiles'
import { useToast } from '@/hooks/use-toast'

const VIEWER_MIN_HEIGHT = 200
const EXPLORER_MIN_HEIGHT = 140
const COMPACT_EXPLORER_HEIGHT = 240
const TALL_EXPLORER_HEIGHT = 320
const RESIZE_HANDLE_HEIGHT = 6

type ViewerMode = 'pdf' | 'image' | null

interface ViewerState {
  pageNumber: number
  scale: number
  rotation: number
  scrollMode: 'centered' | 'continuous'
  fitMode: 'width' | 'height' | 'page'
  numPages: number | null
  pageSize: { width: number; height: number }
  scrollPosition: { left: number; top: number }
}

interface ViewerTab {
  id: string
  file: any | null
  viewerMode: ViewerMode
  viewerState?: ViewerState
}

const SUPPORTED_IMAGE_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'bmp',
  'svg',
  'webp'
])

const getViewerModeForFile = (file: any | null): ViewerMode => {
  if (!file?.name) {
    return null
  }

  const extension = file.name.split('.').pop()?.toLowerCase()

  if (extension === 'pdf') {
    return 'pdf'
  }

  if (extension && SUPPORTED_IMAGE_EXTENSIONS.has(extension)) {
    return 'image'
  }

  return null
}

const createTab = (file: any | null = null): ViewerTab => {
  return {
    id: generateFileId(),
    file,
    viewerMode: getViewerModeForFile(file),
    viewerState: file ? {
      pageNumber: 1,
      scale: 1.0,
      rotation: 0,
      scrollMode: 'centered',
      fitMode: 'height',
      numPages: null,
      pageSize: { width: 0, height: 0 },
      scrollPosition: { left: 0, top: 0 }
    } : undefined
  }
}

interface FilesTabProps {
  projectId: string
  fileToOpen?: any
  onFileOpened?: () => void
}

export function FilesTab({ projectId, fileToOpen, onFileOpened }: FilesTabProps) {
  const { toast } = useToast()
  const uploadFilesMutation = useUploadProjectFiles(projectId)
  
  const initialTabRef = useRef<ViewerTab | null>(null)
  if (!initialTabRef.current) {
    initialTabRef.current = createTab()
  }
  const [tabs, setTabs] = useState<ViewerTab[]>(() => [initialTabRef.current!])
  const [activeTabId, setActiveTabId] = useState<string>(() => initialTabRef.current!.id)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isFillPage, setIsFillPage] = useState(false)
  const [explorerHeightMode, setExplorerHeightMode] = useState<'compact' | 'tall' | 'collapsed' | 'custom'>('compact')
  const [explorerHeight, setExplorerHeight] = useState<number>(COMPACT_EXPLORER_HEIGHT)
  const [isResizingExplorer, setIsResizingExplorer] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const lastExplorerHeightRef = useRef<number>(COMPACT_EXPLORER_HEIGHT)
  const [viewerStatus, setViewerStatus] = useState<any>(null)
  const [activePane, setActivePane] = useState<'viewer' | 'explorer' | null>('viewer')
  const isDark = false // TODO: implement theme detection
  const sidebarCollapsed = false
  const setSidebarCollapsed = (_: boolean) => {} // TODO: implement sidebar context
  const previousSidebarCollapsedRef = useRef(sidebarCollapsed)
  const previousExplorerModeRef = useRef<'compact' | 'tall' | 'custom' | 'collapsed'>(explorerHeightMode)

  const clampExplorerHeight = useCallback((height: number) => {
    const containerRect = containerRef.current?.getBoundingClientRect()
    if (!containerRect) {
      return Math.max(EXPLORER_MIN_HEIGHT, height)
    }

    const maxExplorerHeight = Math.max(
      EXPLORER_MIN_HEIGHT,
      containerRect.height - VIEWER_MIN_HEIGHT - RESIZE_HANDLE_HEIGHT
    )

    return Math.min(Math.max(EXPLORER_MIN_HEIGHT, height), maxExplorerHeight)
  }, [])

  const handleAddTab = useCallback(() => {
    const newTab = createTab()
    setTabs(prev => [...prev, newTab])
    setActiveTabId(newTab.id)
  }, [])

  const handleCloseTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const updated = prev.filter(t => t.id !== tabId)
      // Always keep at least one tab
      if (updated.length === 0) {
        const freshTab = createTab()
        setActiveTabId(freshTab.id)
        return [freshTab]
      }
      // If we closed the active tab, switch to the nearest tab
      if (tabId === activeTabId) {
        const closedIndex = prev.findIndex(t => t.id === tabId)
        const nextTab = updated[Math.min(closedIndex, updated.length - 1)]
        setActiveTabId(nextTab.id)
      }
      return updated
    })
  }, [activeTabId])

  const handleSwitchTab = useCallback((tabId: string) => {
    setActiveTabId(tabId)
  }, [])

  const handleFileSelect = (file: any) => {
    setTabs(prev =>
      prev.map(t =>
        t.id === activeTabId
          ? { 
              ...t, 
              file, 
              viewerMode: getViewerModeForFile(file),
              viewerState: {
                pageNumber: 1,
                scale: 1.0,
                rotation: 0,
                scrollMode: 'centered',
                fitMode: 'height',
                numPages: null,
                pageSize: { width: 0, height: 0 },
                scrollPosition: { left: 0, top: 0 }
              }
            }
          : t
      )
    )
  }

  const handleViewerStateChange = useCallback((tabId: string, state: ViewerState) => {
    setTabs(prev =>
      prev.map(t =>
        t.id === tabId
          ? { ...t, viewerState: state }
          : t
      )
    )
  }, [])

  const restoreFillPage = useCallback(() => {
    setSidebarCollapsed(previousSidebarCollapsedRef.current)

    const previousMode = previousExplorerModeRef.current
    if (previousMode === 'compact') {
      setExplorerHeightMode('compact')
    } else if (previousMode === 'tall') {
      setExplorerHeightMode('tall')
    } else if (previousMode === 'collapsed') {
      setExplorerHeightMode('collapsed')
    } else {
      const restoredHeight = clampExplorerHeight(lastExplorerHeightRef.current || COMPACT_EXPLORER_HEIGHT)
      setExplorerHeight(restoredHeight)
      setExplorerHeightMode('custom')
      lastExplorerHeightRef.current = restoredHeight
    }

    setActivePane('viewer')
    setIsResizingExplorer(false)
    setIsFillPage(false)
  }, [clampExplorerHeight, setSidebarCollapsed])

  const handleToggleFillPage = () => {
    if (isFillPage) {
      restoreFillPage()
      return
    }

    previousSidebarCollapsedRef.current = sidebarCollapsed
    previousExplorerModeRef.current = explorerHeightMode
    lastExplorerHeightRef.current = explorerHeight

    setSidebarCollapsed(true)
    setExplorerHeightMode('collapsed')
    setActivePane('viewer')
    setIsResizingExplorer(false)
    setIsFillPage(true)
  }

  const handleCloseViewer = () => {
    if (isFillPage) {
      restoreFillPage()
    }

    setTabs(prev =>
      prev.map(t =>
        t.id === activeTabId
          ? { ...t, file: null, viewerMode: null }
          : t
      )
    )
    setIsFullscreen(false)
    setViewerStatus(null)
  }

  const handleToggleFullscreen = () => {
    if (!isFullscreen && isFillPage) {
      restoreFillPage()
    }
    setIsFullscreen(prev => !prev)
  }

  const handleUploadFiles = async (files: File[], folderId?: string) => {
    if (!folderId) {
      toast({
        title: 'Error',
        description: 'Please select a folder first',
        variant: 'destructive'
      })
      return
    }
    
    try {
      await uploadFilesMutation.mutateAsync({
        files,
        folder_id: folderId
      })
    } catch (error) {
      console.error('Upload error:', error)
    }
  }

  // Handle file open requests from chat
  useEffect(() => {
    if (fileToOpen) {
      handleFileSelect(fileToOpen)
      onFileOpened?.()
    }
  }, [fileToOpen])

  useEffect(() => {
    if (explorerHeightMode === 'compact') {
      const clamped = clampExplorerHeight(COMPACT_EXPLORER_HEIGHT)
      setExplorerHeight(clamped)
      lastExplorerHeightRef.current = clamped
    } else if (explorerHeightMode === 'tall') {
      const clamped = clampExplorerHeight(TALL_EXPLORER_HEIGHT)
      setExplorerHeight(clamped)
      lastExplorerHeightRef.current = clamped
    } else if (explorerHeightMode === 'collapsed') {
      setActivePane(prev => (prev === 'explorer' ? 'viewer' : prev))
    }
  }, [explorerHeightMode, clampExplorerHeight])

  useEffect(() => {
    if (explorerHeightMode !== 'collapsed') {
      lastExplorerHeightRef.current = explorerHeight
    }
  }, [explorerHeight, explorerHeightMode])

  useEffect(() => {
    if (!isFillPage) {
      previousExplorerModeRef.current = explorerHeightMode
    }
  }, [explorerHeightMode, isFillPage])

  useEffect(() => {
    if (!isFillPage) {
      previousSidebarCollapsedRef.current = sidebarCollapsed
    }
  }, [sidebarCollapsed, isFillPage])

  useEffect(() => {
    const handleWindowResize = () => {
      setExplorerHeight(prev => clampExplorerHeight(prev))
    }

    window.addEventListener('resize', handleWindowResize)
    return () => window.removeEventListener('resize', handleWindowResize)
  }, [clampExplorerHeight])

  useEffect(() => {
    if (!isResizingExplorer) return

    const handleMove = (event: MouseEvent) => {
      if (!containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      // Calculate height from bottom up - dragging UP decreases height, dragging DOWN increases
      const proposedHeight = rect.bottom - event.clientY
      const clampedHeight = clampExplorerHeight(proposedHeight)
      setExplorerHeight(clampedHeight)
      lastExplorerHeightRef.current = clampedHeight
      setExplorerHeightMode(current => (current === 'custom' ? current : 'custom'))
    }

    const handleUp = () => {
      setIsResizingExplorer(false)
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    window.addEventListener('mouseleave', handleUp)

    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      window.removeEventListener('mouseleave', handleUp)
    }
  }, [isResizingExplorer, clampExplorerHeight])

  useEffect(() => {
    if (!isResizingExplorer) return

    const previousCursor = document.body.style.cursor
    const previousUserSelect = document.body.style.userSelect

    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'

    return () => {
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = previousUserSelect
    }
  }, [isResizingExplorer])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isFullscreen) return
      
      if (e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault()
        e.stopPropagation()
        
        if (e.key === 'ArrowUp') {
          setActivePane('viewer')
        } else if (e.key === 'ArrowDown') {
          if (explorerHeightMode !== 'collapsed') {
            setActivePane('explorer')
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen, explorerHeightMode])

  const cycleExplorerHeight = () => {
    if (explorerHeightMode === 'tall') {
      const clamped = clampExplorerHeight(COMPACT_EXPLORER_HEIGHT)
      setExplorerHeight(clamped)
      setExplorerHeightMode('compact')
      return
    }

    if (explorerHeightMode === 'compact' || explorerHeightMode === 'custom') {
      lastExplorerHeightRef.current = clampExplorerHeight(explorerHeight)
      setExplorerHeightMode('collapsed')
      setActivePane('viewer')
      setIsResizingExplorer(false)
      return
    }

    if (explorerHeightMode === 'collapsed') {
      const restored = clampExplorerHeight(lastExplorerHeightRef.current || COMPACT_EXPLORER_HEIGHT)
      setExplorerHeight(restored)
      setExplorerHeightMode(restored >= TALL_EXPLORER_HEIGHT ? 'tall' : 'compact')
      setIsResizingExplorer(false)
    }
  }

  const handleExplorerResizeStart = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (isFullscreen || explorerHeightMode === 'collapsed') return
    event.preventDefault()
    setIsResizingExplorer(true)
    setActivePane('explorer')
  }

  const handleResizeDoubleClick = () => {
    if (isFullscreen) return
    const clamped = clampExplorerHeight(COMPACT_EXPLORER_HEIGHT)
    setExplorerHeight(clamped)
    lastExplorerHeightRef.current = clamped
    setExplorerHeightMode('compact')
    setIsResizingExplorer(false)
  }

  const showExplorerPanel = !isFullscreen && explorerHeightMode !== 'collapsed'

  const viewerBorderClass = !isFullscreen && explorerHeightMode !== 'collapsed'
    ? (activePane === 'viewer' ? 'border-primary' : 'border-border')
    : (activePane === 'viewer' && !isFullscreen ? 'border-primary' : 'border-border')

  const explorerBorderClass = activePane === 'explorer'
    ? 'border-primary'
    : 'border-border'

  const renderViewerForTab = (tab: ViewerTab, isActiveTab: boolean) => {
    if (tab.viewerMode === 'pdf' && tab.file) {
      return (
        <PDFViewer
          file={tab.file}
          onClose={isFullscreen ? handleCloseViewer : undefined}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          isFillPage={isFillPage}
          onToggleFillPage={handleToggleFillPage}
          isActive={isActiveTab && activePane === 'viewer'}
          onViewerStatus={setViewerStatus}
          darkMode={isDark}
          className="flex-1 min-h-0"
          initialState={tab.viewerState}
          onStateChange={state => handleViewerStateChange(tab.id, state)}
        />
      )
    }

    if (tab.viewerMode === 'image' && tab.file) {
      return (
        <ImageViewer
          file={tab.file}
          onClose={isFullscreen ? handleCloseViewer : undefined}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          isFillPage={isFillPage}
          onToggleFillPage={handleToggleFillPage}
          isActive={isActiveTab && activePane === 'viewer'}
          onViewerStatus={setViewerStatus}
          darkMode={isDark}
          className="flex-1 min-h-0"
        />
      )
    }

    if (tab.file) {
      return (
        <div className="flex flex-1 items-center justify-center bg-muted/30">
          <div className="text-center max-w-sm px-6 py-8">
            <div className="mb-4">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="mx-auto opacity-40 text-muted-foreground"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14,2 14,8 20,8" />
                <line x1="9" y1="9" x2="10" y2="9" />
                <line x1="9" y1="12" x2="15" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            </div>
            <h3 className="text-[10px] font-medium leading-normal tracking-normal mb-1 text-foreground">
              {tab.file.name}
            </h3>
            <p className="text-[10px] mb-3 text-muted-foreground">
              File type not supported for preview
            </p>
            <div className="text-[10px] space-y-1 mb-4 text-muted-foreground">
              <div>{tab.file.size}</div>
              <div>{tab.file.modified}</div>
            </div>
            <div className="text-[10px] px-3 py-2 rounded border bg-muted border-border text-muted-foreground">
              Preview not available
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="flex flex-1 items-center justify-center bg-muted/30">
        <div className="text-center max-w-sm px-6 py-8">
          <div className="mb-4">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="mx-auto opacity-40 text-muted-foreground"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14,2 14,8 20,8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10,9 9,9 8,9" />
            </svg>
          </div>
          <h3 className="text-[10px] font-medium leading-normal tracking-normal mb-2 text-foreground">
            No file selected
          </h3>
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            Choose a PDF or image from the file explorer to preview it here
          </p>
        </div>
      </div>
    )
  }

  // Debug: Log container dimensions
  return (
    <div ref={containerRef} className="h-full flex flex-col overflow-hidden bg-transparent">
      {/* Tab Bar */}
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onSwitchTab={handleSwitchTab}
        onCloseTab={handleCloseTab}
        onAddTab={handleAddTab}
        darkMode={isDark}
      />
      
      <div
        className={`relative flex flex-col border-t transition-border-color duration-150 ${viewerBorderClass} bg-white dark:bg-[#0F1219]`}
        style={{ 
          flex: '1 1 0%',
          minHeight: 0,
          overflow: 'hidden'
        }}
        onClick={() => !isFullscreen && setActivePane('viewer')}
      >
        <div className="relative h-full flex flex-col">
          {tabs.map(tab => {
            const isActiveTab = tab.id === activeTabId
            return (
              <div
                key={tab.id}
                className={`absolute inset-0 flex flex-col transition-opacity duration-150 ${isActiveTab ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
              >
                {renderViewerForTab(tab, isActiveTab)}
              </div>
            )
          })}
        </div>
      </div>

      {showExplorerPanel && (
        <>
          <div
            role="separator"
            aria-orientation="horizontal"
            aria-valuemin={EXPLORER_MIN_HEIGHT}
            aria-valuenow={Math.round(explorerHeight)}
            className={`flex-shrink-0 h-[6px] cursor-row-resize flex items-center justify-center transition-colors duration-150 ${isResizingExplorer ? 'bg-secondary dark:bg-slate-700/40' : 'bg-transparent hover:bg-secondary/50 dark:hover:bg-slate-700/30'}`}
            onMouseDown={handleExplorerResizeStart}
            onDoubleClick={handleResizeDoubleClick}
            style={{ touchAction: 'none' }}
          >
            <div className="h-[2px] w-14 rounded-full bg-primary/30 dark:bg-slate-500" />
          </div>

          <div
            className={`relative flex-shrink-0 border-t transition-border-color duration-150 overflow-hidden ${explorerBorderClass}`}
            style={{ height: explorerHeight, flex: '0 0 auto' }}
            onClick={() => setActivePane('explorer')}
          >
            <FileExplorer 
              projectId={projectId}
              onFileSelect={handleFileSelect}
              heightMode={explorerHeightMode}
              onToggleHeight={cycleExplorerHeight}
              darkMode={isDark}
              viewerStatus={viewerStatus}
              canUpload={true}
              onUploadFiles={handleUploadFiles}
              isActive={activePane === 'explorer'}
              className="h-full"
            />
          </div>
        </>
      )}

      {!isFullscreen && explorerHeightMode === 'collapsed' && (
        <div 
          className={`flex-shrink-0 border-t-[0.5px] border-l-[1.5px] border-r-[1.5px] border-b-[1.5px] bg-background transition-[border-color,box-shadow] duration-150 ${activePane === 'explorer' ? 'border-primary' : 'border-transparent shadow-[inset_0_-1px_0_hsl(var(--border))]'}`}
          style={{ height: 32 }}
          onClick={() => setActivePane('explorer')}
        >
          <FileExplorer 
            projectId={projectId}
            onFileSelect={handleFileSelect}
            heightMode={explorerHeightMode}
            onToggleHeight={cycleExplorerHeight}
            darkMode={isDark}
            viewerStatus={viewerStatus}
            canUpload={true}
            onUploadFiles={handleUploadFiles}
            isActive={activePane === 'explorer'}
            className="h-full"
          />
        </div>
      )}
    </div>
  )
}

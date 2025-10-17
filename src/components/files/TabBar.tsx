import { X, Plus } from 'lucide-react'

export interface Tab {
  id: string
  file: any | null
  viewerMode: 'pdf' | 'image' | null
}

interface TabBarProps {
  tabs: Tab[]
  activeTabId: string
  onSwitchTab: (tabId: string) => void
  onCloseTab: (tabId: string) => void
  onAddTab: () => void
  darkMode?: boolean
}

export function TabBar({
  tabs,
  activeTabId,
  onSwitchTab,
  onCloseTab,
  onAddTab,
  darkMode = false
}: TabBarProps) {
  return (
    <div className={`flex items-center border-b border-border bg-card flex-shrink-0 overflow-x-auto ${darkMode ? 'dark' : ''}`}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId
        const displayName = tab.file?.name || 'Untitled'
        
        return (
          <div
            key={tab.id}
            className={`
              group relative flex items-center gap-1.5 px-3 py-1.5 border-r border-border 
              cursor-pointer hover:bg-muted/50 transition-colors min-w-0 max-w-[200px]
              ${isActive ? 'bg-background' : 'bg-card'}
            `}
            onClick={() => onSwitchTab(tab.id)}
          >
            <span
              className={`text-[11px] truncate flex-1 ${
                isActive ? 'font-medium text-foreground' : 'text-muted-foreground'
              }`}
              title={displayName}
            >
              {displayName}
            </span>
            {tabs.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onCloseTab(tab.id)
                }}
                className={`
                  flex-shrink-0 w-4 h-4 rounded flex items-center justify-center
                  hover:bg-muted-foreground/20 transition-colors
                  ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                `}
                title="Close tab"
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            )}
          </div>
        )
      })}
      
      <button
        onClick={onAddTab}
        className="flex-shrink-0 px-3 py-1.5 hover:bg-muted/50 transition-colors border-r border-border"
        title="New tab"
      >
        <Plus className="w-4 h-4 text-muted-foreground" />
      </button>
    </div>
  )
}

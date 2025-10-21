import { Copy, ThumbsUp, ThumbsDown, RotateCcw, Download, MoreHorizontal } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface MessageListProps {
  messages: Message[]
  isLoading: boolean
  bottomRef: React.RefObject<HTMLDivElement | null>
  chatOpened: boolean
}

export function MessageList({ messages, isLoading, bottomRef, chatOpened }: MessageListProps) {
  const { toast } = useToast()
  
  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      toast({ title: "Copied to clipboard" })
    } catch (error) {
      toast({ 
        title: "Failed to copy", 
        variant: "destructive" 
      })
    }
  }

  const handleDownload = (content: string) => {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ai-response-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const containerState = chatOpened
    ? 'opacity-100 translate-y-0 pointer-events-auto'
    : 'opacity-0 -translate-y-4 pointer-events-none'

  return (
    <div
      className={`relative flex h-full w-full transition-[opacity,transform] duration-700 ease-out ${containerState} bg-slate-50/40 dark:bg-slate-900/30`}
      aria-hidden={!chatOpened}
    >
      <div className="flex h-full w-full flex-col overflow-hidden">
        {chatOpened && (
          <div className="flex-1 overflow-y-auto chat-scroll px-6 pt-6 pb-40" aria-live="polite">
            {messages.length === 0 ? (
              <div className="text-xs text-muted-foreground max-w-3xl mx-auto pr-4">
                Messages will appear here.
              </div>
            ) : (
              <ul className="space-y-4 max-w-3xl mx-auto pr-4">
                {messages.map((m, idx) => (
                  <li key={idx} className="group flex flex-col gap-2">
                    <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-sm transition-colors duration-300 ${
                          m.role === 'user'
                            ? 'bg-sky-100 text-slate-800 dark:bg-sky-900/40 dark:text-slate-100'
                            : 'bg-background text-foreground ring-1 ring-border'
                        }`}
                        style={{
                          animation: `slideIn 0.6s ease-out`,
                          animationFillMode: 'both',
                        }}
                      >
                        <div
                          dangerouslySetInnerHTML={{
                            __html: m.content
                              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                              .replace(/\n/g, '<br>'),
                          }}
                        />
                      </div>
                    </div>

                    {m.role === 'assistant' && (
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                        <button 
                          onClick={() => handleCopy(m.content)}
                          className="rounded-full border border-transparent px-2 py-1 hover:bg-accent" 
                          title="Copy"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button className="rounded-full border border-transparent px-2 py-1 hover:bg-accent" title="Positive response">
                          <ThumbsUp className="h-3.5 w-3.5" />
                        </button>
                        <button className="rounded-full border border-transparent px-2 py-1 hover:bg-accent" title="Needs work">
                          <ThumbsDown className="h-3.5 w-3.5" />
                        </button>
                        <button className="rounded-full border border-transparent px-2 py-1 hover:bg-accent" title="Regenerate">
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDownload(m.content)}
                          className="rounded-full border border-transparent px-2 py-1 hover:bg-accent" 
                          title="Download"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        <button className="rounded-full border border-transparent px-2 py-1 hover:bg-accent" title="More">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </li>
                ))}
                {isLoading && (
                  <li className="flex justify-start">
                    <div className="rounded-2xl bg-background px-4 py-3 text-xs text-muted-foreground ring-1 ring-border">
                      <div className="flex items-center gap-2">
                        <span>Preparing a response</span>
                        <div className="flex items-center gap-1">
                          <span className="thinking-dot" />
                          <span className="thinking-dot" />
                          <span className="thinking-dot" />
                        </div>
                      </div>
                    </div>
                  </li>
                )}
                <div ref={bottomRef} />
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

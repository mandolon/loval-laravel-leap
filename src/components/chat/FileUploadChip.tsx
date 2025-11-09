import { X } from 'lucide-react'

export type UploadStatus = 'uploading' | 'done' | 'error' | 'canceled'

export interface FileUploadChipProps {
  id: string
  filename: string
  projectName?: string
  size?: number
  status?: UploadStatus
  progress?: number
  errorMessage?: string
  onRemove: (id: string) => void
}

export const FileUploadChip = ({
  id,
  filename,
  projectName,
  size,
  status = 'uploading',
  progress = 0,
  errorMessage,
  onRemove,
}: FileUploadChipProps) => {
  const isUploading = status === 'uploading'

  const getFileExtension = (filename: string) => {
    const parts = filename.split('.')
    return parts.length > 1 ? `.${parts[parts.length - 1]}` : ''
  }

  const truncateFilename = (filename: string, maxLength = 22) => {
    const ext = getFileExtension(filename)
    const nameWithoutExt = filename.slice(0, filename.length - ext.length)
    if (filename.length <= maxLength) return filename
    const truncatedName = nameWithoutExt.slice(0, Math.max(1, maxLength - ext.length - 3))
    return `${truncatedName}...${ext}` // always keeps extension visible
  }

  const formatBytes = (bytes?: number) => {
    if (bytes === undefined || bytes === null) return ''
    const units = ['B', 'KB', 'MB', 'GB']
    let i = 0
    let n = bytes
    while (n >= 1024 && i < units.length - 1) {
      n = n / 1024
      i++
    }
    return `${n.toFixed(n >= 100 || i === 0 ? 0 : n < 10 ? 1 : 0)} ${units[i]}`
  }

  return (
    <div
      className="relative flex h-9 items-center gap-2 rounded-md border px-3 text-sm"
      style={{
        borderColor: 'var(--chat-line, #E7E5E4)',
        background: 'var(--chat-card, #FFFFFF)',
        minWidth: '140px',
        maxWidth: '240px',
      }}
      aria-busy={isUploading}
    >
      {isUploading ? (
        <div className="spinner" aria-hidden style={{
          width: '14px',
          height: '14px',
          border: '2px solid rgba(0,0,0,.15)',
          borderTopColor: 'currentColor',
          borderRadius: '9999px',
        }} />
      ) : (
        <svg className="h-4 w-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )}
      <span
        className={'truncate flex-1 ' + (status === 'uploading' ? 'opacity-60' : '')}
        title={filename}
      >
        {truncateFilename(filename)}
      </span>
      {status === 'uploading' && typeof size === 'number' && (
        <span className="ml-1 shrink-0 text-[11px] opacity-60">• {formatBytes(size)}</span>
      )}
      <button
        onClick={() => onRemove(id)}
        className="grid h-4 w-4 place-items-center rounded hover:bg-black/10 disabled:opacity-40"
        title={isUploading ? 'Uploading...' : 'Remove'}
        disabled={isUploading}
      >
        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      {/* progress bar inside chip */}
      {isUploading && (
        <div
          className="absolute left-0 right-0 bottom-0 h-[2px] overflow-hidden rounded-b"
          aria-hidden
        >
          <div
            className="h-full"
            style={{
              width: `${Math.max(0, Math.min(100, progress || 0))}%`,
              background: 'var(--chat-ink, #1C1917)',
            }}
          />
        </div>
      )}
    </div>
  )
}

export default FileUploadChip

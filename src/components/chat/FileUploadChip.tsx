import { X, Check, AlertTriangle, Paperclip } from 'lucide-react'
import { formatBytes } from '@/lib/detail-library-utils'

export type UploadStatus = 'uploading' | 'done' | 'error' | 'canceled'

export interface FileUploadChipProps {
  id: string
  filename: string
  projectName?: string
  totalBytes: number
  uploadedBytes: number
  status: UploadStatus
  onCancel?: (id: string) => void
}

export const FileUploadChip = ({
  id,
  filename,
  projectName,
  totalBytes,
  uploadedBytes,
  status,
  onCancel,
}: FileUploadChipProps) => {
  const percent = totalBytes > 0 ? Math.min(100, Math.round((uploadedBytes / totalBytes) * 100)) : 0
  const sizeLabel = formatBytes(totalBytes)
  const barLabel = [projectName?.trim(), sizeLabel].filter(Boolean).join(' • ')

  const isInteractive = status === 'uploading'

  return (
    <div
      className="relative flex items-center gap-2 pl-2 pr-1 py-1 rounded-[999px] text-[11px] border border-slate-200 dark:border-[#283046]/60 bg-white dark:bg-[#0E1118] shadow-sm"
      role={status === 'uploading' ? 'group' : undefined}
      aria-live="polite"
    >
      <Paperclip className="h-3.5 w-3.5 text-slate-500 dark:text-neutral-400" />

      <div className="min-w-[120px] max-w-[240px] sm:max-w-[300px]">
        <div className="relative overflow-hidden rounded-[999px] border border-slate-100 dark:border-[#1a2030]">
          {/* progress fill */}
          <div
            className={
              'absolute inset-y-0 left-0 transition-[width] duration-300 ease-out ' +
              (status === 'error'
                ? 'bg-red-500/30 dark:bg-red-600/30'
                : status === 'done'
                ? 'bg-emerald-500/25 dark:bg-emerald-600/25'
                : 'bg-sky-500/25 dark:bg-sky-600/25')
            }
            style={{ width: `${status === 'uploading' ? percent : 100}%` }}
            aria-hidden
          />

          {/* label row */}
          <div className="relative z-[1] grid grid-cols-[1fr_auto] items-center gap-2 px-2 py-1">
            <div className="truncate text-slate-700 dark:text-neutral-300">
              <span className="font-medium truncate mr-1">{filename}</span>
            </div>
            <div
              className="truncate text-[10px] text-slate-600 dark:text-neutral-400"
              role={status === 'uploading' ? 'progressbar' : undefined}
              aria-valuemin={status === 'uploading' ? 0 : undefined}
              aria-valuemax={status === 'uploading' ? 100 : undefined}
              aria-valuenow={status === 'uploading' ? percent : undefined}
              aria-label={status === 'uploading' ? `Uploading ${filename}` : undefined}
              title={barLabel}
            >
              {barLabel}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {status === 'error' && (
          <AlertTriangle className="h-3.5 w-3.5 text-red-500" title="Upload failed" />
        )}
        {status === 'done' && (
          <Check className="h-3.5 w-3.5 text-emerald-600" title="Upload complete" />
        )}
        {isInteractive && (
          <button
            type="button"
            onClick={() => onCancel?.(id)}
            className="h-5 w-5 grid place-items-center rounded-full hover:bg-slate-100 dark:hover:bg-[#141C28] text-slate-500 dark:text-neutral-400"
            title="Cancel upload"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

export default FileUploadChip

/**
 * RequestPreviewModal Component
 * Read-only modal for viewing request details
 */

import type { Request } from "@/lib/api/types";
import { formatDate } from "./requestsData";

interface RequestPreviewModalProps {
  request: Request;
  createdByName: string;
  projectName: string | null;
  onClose: () => void;
}

export function RequestPreviewModal({ request, createdByName, projectName, onClose }: RequestPreviewModalProps) {
  if (!request) return null;

  const respondBy = request.respondBy ? formatDate(request.respondBy) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 sm:px-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div className="relative z-10 flex w-full max-w-[560px] flex-col gap-4 rounded-2xl border border-neutral-200 bg-white px-4 py-3.5 shadow-[0_18px_45px_rgba(15,15,15,0.16)] sm:px-5 sm:py-4">
        <div className="flex items-start justify-between gap-2.5">
          <div className="space-y-1">
            <div className="inline-flex items-baseline gap-1">
              <span className="text-[11px] font-semibold tracking-wide text-amber-800 uppercase">
                Request
              </span>
              <span className="text-[17px] font-semibold text-neutral-900">
                from {createdByName}
              </span>
            </div>
            {(projectName || respondBy) && (
              <div className="text-[12px] text-neutral-500">
                {projectName && <span>{projectName}</span>}
                {projectName && respondBy && <span> • </span>}
                {respondBy && (
                  <span>
                    Respond by{" "}
                    <span className="font-medium text-neutral-800">{respondBy}</span>
                  </span>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white text-[18px] text-neutral-500 cursor-pointer hover:border-neutral-300 hover:bg-neutral-50"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="rounded-lg border border-neutral-200 px-3 py-2.5 text-[14px] font-medium text-neutral-900">
            {request.title}
          </div>

          <div className="rounded-lg border border-neutral-200 px-3 py-2.5 text-[14px] leading-relaxed text-neutral-900 whitespace-pre-wrap min-h-[80px]">
            {request.body || "No description added."}
          </div>
        </div>

        <div className="mt-2 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-neutral-200 bg-white px-3.5 text-[14px] font-medium text-neutral-700 cursor-pointer hover:border-neutral-300 hover:bg-neutral-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

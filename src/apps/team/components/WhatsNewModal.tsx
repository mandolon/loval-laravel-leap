import React from 'react';
import { createPortal } from 'react-dom';

interface WhatsNewModalProps {
  onClose: () => void;
  onDontShowAgain: () => void;
}

// Style tokens for What's New modal
const tokens = {
  // Typography
  headerTitle: 'text-[17px] font-semibold tracking-wide',
  releaseLabel: 'text-[13px] font-semibold tracking-[0.14em] uppercase',
  releaseDate: 'text-[13px]',
  sectionTitle: 'text-[16px] font-semibold',
  bodyText: 'text-[13px] leading-[1.6]',
  listItem: 'text-[13px] leading-[1.6]',
  buttonText: 'text-[14px] font-medium',
  // Colors
  textPrimary: 'text-neutral-50',
  textSecondary: 'text-neutral-300',
  textMuted: 'text-neutral-400',
  accent: 'text-amber-300',
};

export const WhatsNewModal: React.FC<WhatsNewModalProps> = ({ onClose, onDontShowAgain }) => {
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <style>{`
        .scrollbar-hide{scrollbar-width:none;-ms-overflow-style:none}
        .scrollbar-hide::-webkit-scrollbar{display:none}
      `}</style>
    <div
      className="w-full max-w-[480px] mx-4 rounded-lg bg-[#151515] text-neutral-50 shadow-2xl border border-white/10 overflow-hidden"
      style={{
        background:
          'linear-gradient(180deg, #020202 0%, #080808 50%, #020202 100%)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-1">
        <div className={`${tokens.headerTitle} text-neutral-100`}>
          What&apos;s New
        </div>
        <button
          type="button"
          className="h-7 w-7 rounded-full hover:bg-white/5 flex items-center justify-center text-neutral-400"
          aria-label="Close"
          onClick={onClose}
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="mt-0 h-px mx-6 bg-white/10" />

      {/* Body */}
      <div className="px-6 pt-4 pb-5 max-h-[420px] md:max-h-[720px] overflow-y-auto scrollbar-hide">
        {/* Section title + date */}
        <div className="mb-6">
          <div className={`${tokens.releaseLabel} ${tokens.accent}`}>
            RELEASE - v1.9
          </div>
          <div className={`${tokens.releaseDate} ${tokens.textMuted} mt-1`}>November 26, 2025</div>
        </div>

        {/* Feature title */}
        <div className="mb-3">
          <div className={`${tokens.sectionTitle} ${tokens.textPrimary}`}>
            🏠 Home Page Updates
          </div>
        </div>

        {/* Preview image + scrubber */}
        <div className="mb-5 rounded-lg overflow-hidden border border-white/10 bg-black">
          <div className="relative aspect-[16/9] bg-gradient-to-tr from-neutral-900 via-neutral-700 to-neutral-500 flex items-center justify-center">
            <div className="flex gap-3">
              <div className="w-28 h-28 rounded-lg bg-black/40 border border-white/20" />
              <div className="w-28 h-28 rounded-lg bg-black/20 border border-white/30" />
            </div>
          </div>
          <div className="px-4 py-3 bg-[#101010] border-t border-white/5 flex items-center gap-3">
            <button
              type="button"
              className="h-8 w-8 rounded-full bg-white/5 border border-white/20 flex items-center justify-center text-neutral-100"
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="currentColor"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
            <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="w-1/2 h-full bg-white rounded-full" />
            </div>
            <div className="flex gap-1">
              <div className="w-7 h-7 rounded-full border border-white/30 bg-white/10" />
              <div className="w-7 h-7 rounded-full border border-white/20 bg-white/20" />
              <div className="w-7 h-7 rounded-full border border-white/10 bg-white/30" />
            </div>
          </div>
        </div>

        {/* Text sections */}
        <div className={`mt-6 space-y-6 ${tokens.bodyText} ${tokens.textSecondary}`}>
          {/* Active Projects Panel */}
          <div>
            <div className={`${tokens.sectionTitle} ${tokens.textPrimary} mb-3`}>
              🎯 Active Projects Panel
            </div>
            <p className={`${tokens.bodyText} ${tokens.textSecondary}`}>
              Active projects now appear on the Home page.
            </p>
            <ul className={`mt-2 ml-4 list-disc space-y-1.5 ${tokens.listItem} ${tokens.textSecondary}`}>
              <li>
                Sort projects by Priority, Status, or Start Date, and drag cards up or down
                in Priority view to set the order.
              </li>
              <li>
                Highlight a card with a red or yellow priority color by clicking its order
                number.
              </li>
              <li>
                Set the project phase to Pre-Design, Design, Permit, or Build using the
                phase button above the project name.
              </li>
              <li>
                Add short "Next:" todos to each project, then mark them complete, reorder
                them, or remove them.
              </li>
            </ul>
          </div>

          {/* Calendar System */}
          <div>
            <div className={`${tokens.sectionTitle} ${tokens.textPrimary} mb-3`}>
              📅 Calendar System
            </div>
            <ul className={`ml-4 list-disc space-y-1.5 ${tokens.listItem} ${tokens.textSecondary}`}>
              <li>
                Scroll through a 31-day window (15 days before and after today)
                horizontally, and use the arrows to jump to the next or previous month.
              </li>
              <li>
                Click any date card to view its events, and click today&apos;s date to jump back
                to the present day.
              </li>
              <li>
                Add events to your calendar to set reminders, meetings, and deadlines.
              </li>
              <li>
                View upcoming events with linked events, requests, and tasks.
              </li>
            </ul>
          </div>

          {/* Recent Files Card */}
          <div>
            <div className={`${tokens.sectionTitle} ${tokens.textPrimary} mb-3`}>
              📁 Recent Files Card
            </div>
            <ul className={`ml-4 list-disc space-y-1.5 ${tokens.listItem} ${tokens.textSecondary}`}>
              <li>View recently accessed files from all workspace projects.</li>
              <li>Filter files by project and click any file to download it.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 px-6 py-3 border-t border-white/5 bg-transparent">
        <button
          type="button"
          className={`px-3 py-1 rounded-full ${tokens.buttonText} ${tokens.textMuted} hover:text-neutral-200 transition-colors`}
          onClick={onDontShowAgain}
        >
          Don't show again
        </button>
        <button
          type="button"
          className={`px-3 py-1 rounded-full ${tokens.buttonText} bg-neutral-50 text-[#101010] hover:bg-neutral-200 transition-colors`}
          onClick={onClose}
        >
          Got it
        </button>
      </div>
    </div>
  </div>,
  document.body
  );
};

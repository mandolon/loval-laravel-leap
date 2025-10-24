// Global Design Tokens - Single Source of Truth for Colors and Styles
// Extracted from SandboxPage and standardized across the entire project

// Color System - Dark Mode Optimized
export const COLORS = {
  // Outer/Background colors
  light: {
    outer: '#f8fafc',      // slate-50
    primary: '#ffffff',    // white
    secondary: '#f1f5f9',  // slate-100
    muted: '#f8fafc',      // slate-50
  },
  dark: {
    outer: '#0B0E14',
    primary: '#0F1219',
    secondary: '#0E1118',
    muted: '#10141D',
    elevated: '#141C28',
    darker: '#151A24',
    darkest: '#161B26',
  },
  
  // Text colors
  text: {
    light: {
      primary: '#334155',    // slate-700
      secondary: '#64748b',  // slate-500
      muted: '#94a3b8',      // slate-400
      placeholder: '#94a3b8', // slate-400
    },
    dark: {
      primary: '#d4d4d8',    // neutral-300
      secondary: '#a1a1aa',  // neutral-400
      muted: '#737373',      // neutral-500
      placeholder: '#737373', // neutral-500
    },
  },
  
  // Border colors
  border: {
    light: {
      default: '#bbbbbb',    // Updated to #bbbbbb
      subtle: '#bbbbbb',     // Updated to #bbbbbb
      input: '#e2e8f0',      // slate-200 (keeping input borders as they were)
    },
    dark: {
      default: 'rgba(29, 34, 48, 0.6)',  // #1d2230/60
      subtle: 'rgba(26, 32, 48, 0.6)',   // #1a2030/60
      subtle2: 'rgba(26, 32, 48, 0.4)',  // #1a2030/40
      input: '#1d2230',
      input2: '#283046',
    },
  },
  
  // Interactive states
  interactive: {
    light: {
      hover: '#f8fafc',      // slate-50
      hoverSecondary: 'rgba(248, 250, 252, 0.6)', // slate-50/60
      active: '#f1f5f9',     // slate-100
      activePrimary: '#00639b',
      focus: '#9ecafc',
    },
    dark: {
      hover: '#141C28',
      hoverSecondary: '#151A24',
      hoverTertiary: '#161B26',
      active: '#141C28',
      activeText: '#93c5fd',  // blue-300
      focus: 'rgba(59, 130, 246, 0.4)', // #3b82f6/40
    },
  },
  
  // Semantic colors
  semantic: {
    light: {
      primary: '#00639b',
      success: '#10b981',  // green-500
      warning: '#f59e0b',  // amber-500
      error: '#ef4444',    // red-500
    },
    dark: {
      primary: '#3b82f6',  // blue-500
      primaryAlt: '#93c5fd', // blue-300
      success: 'rgba(16, 185, 129, 0.2)', // green-500/20
      successText: '#6ee7b7', // green-300
      warning: 'rgba(245, 158, 11, 0.2)', // amber-500/20
      warningText: '#fcd34d', // amber-300
      error: 'rgba(239, 68, 68, 0.2)', // red-500/20
      errorText: '#fca5a5', // red-300
    },
  },
};

// Design Tokens - Complete Set
export const DESIGN_TOKENS = {
  // Border radius
  radius: 'rounded-[8px]',
  radiusSmall: 'rounded-[6px]',
  radiusFull: 'rounded-full',
  
  // Typography
  text: 'text-[12px]',
  textSmall: 'text-[11px]',
  textTiny: 'text-[10px]',
  
  // Focus states
  focus: 'focus:outline-none focus:ring-1 focus:ring-[#9ecafc] dark:focus:ring-[#3b82f6]/40',
  
  // Panel backgrounds (composite classes)
  panel: 'bg-white dark:bg-[#0F1219] border border-[#bbbbbb] dark:border-[#1d2230]/60',
  panelSoft: 'bg-slate-50 dark:bg-[#10141D] border border-[#bbbbbb] dark:border-[#1a1f2c]/50',
  panelElev: 'bg-white dark:bg-[#0E1118] border border-[#bbbbbb] dark:border-[#1a2030]/50',
  
  // Borders only
  borderDefault: 'border-[#bbbbbb] dark:border-[#1d2230]',
  borderSubtle: 'border-[#bbbbbb] dark:border-[#1d2230]/60',
  borderSubtle2: 'border-[#bbbbbb] dark:border-[#1a2030]/60',
  borderSubtle3: 'border-[#bbbbbb] dark:border-[#1a2030]/40',
  borderInput: 'border-slate-200 dark:border-[#283046]/60',
  borderInput2: 'border-[#283046] dark:border-[#283046]',
};

// Utility Classes - Pre-composed common patterns
export const UTILITY_CLASSES = {
  // Container/Layout
  outerContainer: 'h-full w-full text-[12px] overflow-hidden bg-slate-50 dark:bg-[#0B0E14] text-slate-700 dark:text-neutral-200 flex gap-1 p-1',
  
  // Headers
  sectionHeader: 'h-9 px-3 border-b border-[#bbbbbb] dark:border-[#1d2230] flex items-center justify-between text-slate-500 dark:text-neutral-500 bg-white dark:bg-[#0E1118]',
  pageHeader: 'h-12 text-[12px] grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3 bg-white dark:bg-[#0E1118] border-b border-[#bbbbbb] dark:border-[#1a2030]/60',
  
  // Buttons
  buttonBase: 'px-2.5 py-1 rounded-[8px] transition-colors focus:outline-none focus:ring-1 focus:ring-[#9ecafc] dark:focus:ring-[#3b82f6]/40',
  buttonIconSmall: 'h-7 w-7 grid place-items-center rounded-[6px] text-slate-500 dark:text-neutral-400 hover:bg-slate-50 dark:hover:bg-[#161B26] focus:outline-none focus:ring-1 focus:ring-[#9ecafc] dark:focus:ring-[#3b82f6]/40',
  buttonIcon: 'h-8 w-8 grid place-items-center rounded-[8px] text-slate-500 dark:text-neutral-400 hover:bg-slate-50 dark:hover:bg-[#141C28] focus:outline-none focus:ring-1 focus:ring-[#9ecafc] dark:focus:ring-[#3b82f6]/40',
  
  // Interactive Items
  activeItem: 'bg-white dark:bg-[#141C28] text-[#00639b] dark:text-blue-300 font-medium',
  inactiveItem: 'text-slate-500 dark:text-neutral-400 hover:bg-slate-50 dark:hover:bg-[#141C28] hover:text-slate-700 dark:hover:text-blue-300',
  
  // File Explorer specific
  explorerRoot: 'bg-[#0E1118] dark:bg-[#0E1118] border border-[#1a2030]/60 dark:border-[#1a2030]/60',
  explorerActiveFolder: 'border-blue-400 dark:border-blue-400 bg-[#141C28] dark:bg-[#141C28] text-blue-300 dark:text-blue-300',
  explorerInactiveFolder: 'border-transparent text-neutral-300 dark:text-neutral-300 hover:bg-[#151A24] dark:hover:bg-[#151A24]',
  explorerActiveFile: 'bg-[#141C28] dark:bg-[#141C28] text-blue-300 dark:text-blue-300',
  explorerInactiveFile: 'hover:bg-[#151A24] dark:hover:bg-[#151A24] text-neutral-300 dark:text-neutral-300',
  
  // Input fields
  inputBase: 'h-8 px-2 py-1 bg-white dark:bg-[#0E1118] border border-slate-200 dark:border-[#283046]/60 rounded-[6px] text-[12px] text-slate-700 dark:text-neutral-200 placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-[#9ecafc] dark:focus:ring-[#3b82f6]/40',
  inputSearch: 'w-full h-7 px-2 bg-[#0E1118] dark:bg-[#0E1118] border border-[#1d2230] dark:border-[#1d2230] rounded-[6px] text-[11px] text-neutral-300 dark:text-neutral-300 placeholder:text-neutral-500 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-[#9ecafc] dark:focus:ring-[#3b82f6]/40',
  
  // Chat specific
  chatBubble: 'bg-slate-50 dark:bg-[#141C28] border border-[#bbbbbb] dark:border-[#1a2030]/60 p-2 rounded-[6px] max-w-[85%]',
  chatFooter: 'p-3 border-t border-[#bbbbbb] dark:border-[#1d2230] bg-white dark:bg-[#0E1118] mt-auto',
  
  // ResizableHandles
  handleVertical: 'h-px bg-slate-200 dark:bg-[#1a2030]/60 hover:bg-[#00639b] dark:hover:bg-[#3b82f6]/40 transition-colors',
  handleHorizontal: 'w-px bg-slate-200 dark:bg-[#1a2030]/60 hover:bg-[#00639b] dark:hover:bg-[#3b82f6]/40 transition-colors',
};

// Helper function to build dynamic classes
export function buildTokenClass(baseClass: string, isActive: boolean, activeClass: string, inactiveClass: string) {
  return `${baseClass} ${isActive ? activeClass : inactiveClass}`;
}

// Export default for convenience
export default {
  COLORS,
  DESIGN_TOKENS,
  UTILITY_CLASSES,
  buildTokenClass,
};

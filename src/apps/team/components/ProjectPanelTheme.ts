/**
 * PROJECT PANEL MODERN THEME SYSTEM
 * Bold, vibrant colors with easy theme swapping
 * 
 * TO CHANGE THEME: Edit the `activeTheme` variable at the bottom of this file
 */

// ============================================================================
// THEME TYPE DEFINITIONS
// ============================================================================

export type ThemeName = 'vibrant' | 'ocean' | 'sunset' | 'forest' | 'monochrome';

interface ThemeColors {
  // Tab colors
  files: string;
  whiteboards: string;
  models: string;
  info: string;
  settings: string;
  
  // Backgrounds
  bg: {
    panel: string;
    header: string;
    hover: string;
    active: string;
    section: string;
    input: string;
  };
  
  // Borders
  border: {
    default: string;
    input: string;
    focus: string;
  };
  
  // Text
  text: {
    primary: string;
    secondary: string;
    muted: string;
    placeholder: string;
  };
  
  // Semantic
  semantic: {
    error: string;
    success: string;
    warning: string;
  };
}

// ============================================================================
// THEME PRESETS
// ============================================================================

const vibrantTheme: ThemeColors = {
  files: '#3B82F6',
  whiteboards: '#7C3AED',
  models: '#8B5CF6',
  info: '#F59E0B',
  settings: '#10B981',
  
  bg: {
    panel: '#FFFFFF',
    header: '#FFFFFF',
    hover: '#F5F5F5',
    active: '#EFF6FF',
    section: '#F9FAFB',
    input: '#FFFFFF',
  },
  
  border: {
    default: '#E5E7EB',
    input: '#D1D5DB',
    focus: '#3B82F6',
  },
  
  text: {
    primary: '#111827',
    secondary: '#4B5563',
    muted: '#9CA3AF',
    placeholder: '#D1D5DB',
  },
  
  semantic: {
    error: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
  },
};

const oceanTheme: ThemeColors = {
  files: '#0891B2',
  whiteboards: '#6366F1',
  models: '#EC4899',
  info: '#14B8A6',
  settings: '#8B5CF6',
  
  bg: {
    panel: '#F0F9FF',
    header: '#FFFFFF',
    hover: '#E0F2FE',
    active: '#BAE6FD',
    section: '#F0F9FF',
    input: '#FFFFFF',
  },
  
  border: {
    default: '#BAE6FD',
    input: '#7DD3FC',
    focus: '#0891B2',
  },
  
  text: {
    primary: '#0C4A6E',
    secondary: '#075985',
    muted: '#38BDF8',
    placeholder: '#BAE6FD',
  },
  
  semantic: {
    error: '#DC2626',
    success: '#14B8A6',
    warning: '#F59E0B',
  },
};

const sunsetTheme: ThemeColors = {
  files: '#F97316',
  whiteboards: '#EC4899',
  models: '#14B8A6',
  info: '#8B5CF6',
  settings: '#EF4444',
  
  bg: {
    panel: '#FFF7ED',
    header: '#FFFFFF',
    hover: '#FFEDD5',
    active: '#FED7AA',
    section: '#FFF7ED',
    input: '#FFFFFF',
  },
  
  border: {
    default: '#FED7AA',
    input: '#FDBA74',
    focus: '#F97316',
  },
  
  text: {
    primary: '#7C2D12',
    secondary: '#9A3412',
    muted: '#FB923C',
    placeholder: '#FED7AA',
  },
  
  semantic: {
    error: '#DC2626',
    success: '#10B981',
    warning: '#F59E0B',
  },
};

const forestTheme: ThemeColors = {
  files: '#059669',
  whiteboards: '#84CC16',
  models: '#F59E0B',
  info: '#0891B2',
  settings: '#64748B',
  
  bg: {
    panel: '#F0FDF4',
    header: '#FFFFFF',
    hover: '#DCFCE7',
    active: '#BBF7D0',
    section: '#F0FDF4',
    input: '#FFFFFF',
  },
  
  border: {
    default: '#BBF7D0',
    input: '#86EFAC',
    focus: '#059669',
  },
  
  text: {
    primary: '#14532D',
    secondary: '#166534',
    muted: '#4ADE80',
    placeholder: '#BBF7D0',
  },
  
  semantic: {
    error: '#DC2626',
    success: '#10B981',
    warning: '#F59E0B',
  },
};

const monochromeTheme: ThemeColors = {
  files: '#18181B',
  whiteboards: '#3F3F46',
  models: '#52525B',
  info: '#52525B',
  settings: '#71717A',
  
  bg: {
    panel: '#FAFAFA',
    header: '#FFFFFF',
    hover: '#F4F4F5',
    active: '#E4E4E7',
    section: '#F9FAFB',
    input: '#FFFFFF',
  },
  
  border: {
    default: '#E4E4E7',
    input: '#D4D4D8',
    focus: '#18181B',
  },
  
  text: {
    primary: '#18181B',
    secondary: '#3F3F46',
    muted: '#A1A1AA',
    placeholder: '#D4D4D8',
  },
  
  semantic: {
    error: '#DC2626',
    success: '#10B981',
    warning: '#F59E0B',
  },
};

// ============================================================================
// THEME REGISTRY & SELECTOR
// ============================================================================

export const themePresets: Record<ThemeName, ThemeColors> = {
  vibrant: vibrantTheme,
  ocean: oceanTheme,
  sunset: sunsetTheme,
  forest: forestTheme,
  monochrome: monochromeTheme,
};

// ⚡ CHANGE THIS TO SWITCH THEMES ⚡
export const activeTheme: ThemeName = 'vibrant';

// Get current theme colors
export const theme = themePresets[activeTheme];

// Legacy exports for backwards compatibility
export const colors = {
  bg: {
    ...theme.bg,
    input: theme.bg.input,
    inputBorder: theme.border.input,
  },
  text: theme.text,
  border: theme.border,
  state: {
    focus: theme.info,
  },
  interactive: {
    iconMuted: theme.text.muted,
  },
};

export const componentText = {
  sectionHeader: {
    className: `text-[11px] font-semibold tracking-wide uppercase`,
  },
};

// ============================================================================
// DESIGN TOKENS
// ============================================================================

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
};

export const radius = {
  sm: '3px',
  md: '8px',
  lg: '12px',
  full: '9999px',
};

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
};

export const typography = {
  size: {
    xs: '10px',
    sm: '11px',
    base: '13px',
    md: '14px',
    lg: '16px',
  },
  weight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
};

// ============================================================================
// SOFT SQUARE SIZE
// ============================================================================

export const SOFT_SQUARE = 11;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getTabColor(tab: 'files' | 'whiteboards' | 'models' | 'info' | 'settings'): string {
  return theme[tab];
}

export function getHoverColor(baseColor: string, opacity: number = 0.1): string {
  return `${baseColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  theme,
  themePresets,
  activeTheme,
  spacing,
  radius,
  shadows,
  typography,
  SOFT_SQUARE,
  getTabColor,
  getHoverColor,
};

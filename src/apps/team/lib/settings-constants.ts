import { AVATAR_COLORS } from '@/constants/avatarColors';

export const SETTINGS_CONSTANTS = {
  CONTENT_COLS: '260px 1fr',
  TRASH_COLS: 'minmax(0,1fr) 80px 140px 110px 120px 140px 160px',
  MEMBERS_COLS: '32px 32px minmax(0,1fr) minmax(0,1fr) 140px',
  
  AVATAR_PALETTE: AVATAR_COLORS,
  
  CSS_VARS: {
    '--text': '#202020',
    '--muted': '#646464',
    '--primary': '#4C75D1'
  } as React.CSSProperties
} as const;

// Re-export for convenience
export { AVATAR_COLORS };

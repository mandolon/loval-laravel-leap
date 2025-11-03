export const SETTINGS_CONSTANTS = {
  CONTENT_COLS: '260px 1fr',
  TRASH_COLS: 'minmax(0,1fr) 120px 140px 160px 140px 160px',
  MEMBERS_COLS: '32px 32px minmax(0,1fr) minmax(0,1fr) 140px',
  
  AVATAR_PALETTE: [
    '#202020', '#6E56CF', '#98A2FF', '#E54D2E', '#E93D82',
    '#E2991A', '#1EAEDB', '#3E6C59', '#8E7E73', '#2EB67D', '#2BB0A2'
  ],
  
  CSS_VARS: {
    '--text': '#202020',
    '--muted': '#646464',
    '--primary': '#4C75D1'
  } as React.CSSProperties
} as const;

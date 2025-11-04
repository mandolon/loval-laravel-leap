export const SETTINGS_CONSTANTS = {
  CONTENT_COLS: '260px 1fr',
  TRASH_COLS: 'minmax(0,1fr) 100px 140px 140px 160px 140px 160px',
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

export const AVATAR_COLORS = [
  'linear-gradient(135deg, hsl(280, 70%, 60%) 0%, hsl(320, 80%, 65%) 100%)',
  'linear-gradient(135deg, hsl(220, 70%, 60%) 0%, hsl(260, 80%, 65%) 100%)',
  'linear-gradient(135deg, hsl(10, 70%, 60%) 0%, hsl(350, 80%, 65%) 100%)',
  'linear-gradient(135deg, hsl(340, 70%, 60%) 0%, hsl(20, 80%, 65%) 100%)',
  'linear-gradient(135deg, hsl(35, 70%, 60%) 0%, hsl(45, 80%, 65%) 100%)',
  'linear-gradient(135deg, hsl(190, 70%, 60%) 0%, hsl(200, 80%, 65%) 100%)',
  'linear-gradient(135deg, hsl(160, 70%, 40%) 0%, hsl(170, 80%, 50%) 100%)',
  'linear-gradient(135deg, hsl(25, 40%, 50%) 0%, hsl(35, 50%, 60%) 100%)',
  'linear-gradient(135deg, hsl(150, 70%, 50%) 0%, hsl(160, 80%, 55%) 100%)',
  'linear-gradient(135deg, hsl(175, 70%, 50%) 0%, hsl(185, 80%, 55%) 100%)',
];

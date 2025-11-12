# Project Panel Color Customization Guide

All Project Panel colors are now controlled by design tokens in `ProjectPanelTheme.ts`. Change colors once, apply everywhere.

## Quick Color Changes

### Change Section Header Background
```typescript
// In ProjectPanelTheme.ts, line ~15
bg: {
  section: 'slate-100',  // Change to: 'blue-50', 'gray-100', etc.
}
```
**Affects:** "PROJECT FILES", "WHITEBOARDS", "PROJECT INFO" headers

### Change Panel Background
```typescript
// In ProjectPanelTheme.ts, line ~12
bg: {
  primary: '#fcfcfc',  // Change to any color: '#f0f9ff', '#f8fafc', etc.
}
```
**Affects:** All panel backgrounds, header bar background

### Change Input/Selector Border
```typescript
// In ProjectPanelTheme.ts, line ~20
bg: {
  inputBorder: 'slate-300',  // Change to: 'blue-300', 'gray-400', etc.
}
```
**Affects:** Search inputs, project selector borders

### Change Text Color
```typescript
// In ProjectPanelTheme.ts, line ~25
text: {
  primary: 'slate-800',  // Change to: 'gray-900', 'blue-900', etc.
  secondary: 'slate-700',
  muted: 'slate-500',
  placeholder: 'slate-400',
}
```
**Affects:** All text throughout the panel

### Change Focus/Active State
```typescript
// In ProjectPanelTheme.ts, line ~44
state: {
  focus: 'blue-400',  // Change to: 'indigo-400', 'purple-400', etc.
}
```
**Affects:** Search input focus border, selector focus border

### Change Icon Colors
```typescript
// In ProjectPanelTheme.ts, line ~33
interactive: {
  iconDefault: 'slate-700',  // Default icon color
  iconMuted: 'slate-400',    // Muted icons (search, chevron)
  iconHover: 'slate-600',    // Icon hover state
}
```
**Affects:** Search icon, chevron icon, all interactive icons

## Theme Variants

### Apply Dark Theme
```typescript
// In ProjectPanel.tsx, import and use:
import { applyTheme } from './ProjectPanelTheme';

const darkColors = applyTheme('dark');
// Then use darkColors instead of colors
```

### Create Custom Theme
```typescript
// In ProjectPanelTheme.ts, add to themes object:
custom: {
  ...colors,
  bg: {
    ...colors.bg,
    primary: '#f0f9ff',      // Light blue
    section: 'blue-100',     // Blue sections
    border: 'blue-200',      // Blue borders
  },
  text: {
    ...colors.text,
    primary: 'blue-900',     // Dark blue text
  },
}
```

## Component Mappings

### Current Token Usage

| Component | Token Used | File Location |
|-----------|-----------|---------------|
| Panel Background | `colors.bg.primary` | ProjectPanel.tsx, ProjectInfoNavigation.tsx |
| Search Container | `PANEL_HEADER_CLASS` uses `colors.bg.border` | ProjectPanel.tsx line 80 |
| Search Input | `PANEL_INPUT_CLASS` uses `colors.bg.input`, `colors.bg.inputBorder` | ProjectPanel.tsx line 81 |
| Section Headers | `colors.bg.section`, `componentText.sectionHeader` | ProjectPanel.tsx lines 1255, 1441 |
| Project Selector | `colors.bg.input`, `colors.text.primary`, `colors.state.focus` | ProjectInfoNavigation.tsx line 71 |
| Chevron Icon | `colors.interactive.iconMuted` | ProjectInfoNavigation.tsx line 78 |

## Testing Color Changes

1. **Open** `src/apps/team/components/ProjectPanelTheme.ts`
2. **Modify** color tokens in the `colors` object
3. **Save** - changes apply immediately to all components
4. **View** at http://localhost:8080/

## Example: Blue Theme

```typescript
// In ProjectPanelTheme.ts, update colors object:
export const colors = {
  bg: {
    primary: '#f0f9ff',           // Light blue background
    secondary: 'white',
    overlay: 'white/80',
    hover: 'blue-100',            // Blue hover
    active: '#E7F0FF',
    section: 'blue-100',          // Blue section headers
    border: 'blue-200',           // Blue borders
    input: 'white',
    inputBorder: 'blue-300',      // Blue input borders
  },
  text: {
    primary: 'blue-900',          // Dark blue text
    secondary: 'blue-700',
    muted: 'blue-500',
    placeholder: 'blue-400',
    link: 'blue-900',
    error: 'red-600',
    success: 'green-600',
  },
  interactive: {
    iconDefault: 'blue-700',
    iconMuted: 'blue-400',
    iconHover: 'blue-600',
    buttonHover: 'blue-50',
    deleteHover: 'red-50',
    deleteText: 'red-600',
  },
  state: {
    loading: 'blue-500',
    error: 'red-600',
    success: 'green-600',
    focus: 'blue-500',            // Blue focus state
  },
}
```

## Typography Changes

### Change All Font Sizes
```typescript
// In ProjectPanelTheme.ts, line ~54
size: {
  xs: 'text-[12px]',    // Increase from 10px
  sm: 'text-[13px]',    // Increase from 11px
  base: 'text-[15px]',  // Increase from 13px
  md: 'text-[17px]',    // Increase from 15px
}
```

### Change Section Header Font
```typescript
// In ProjectPanelTheme.ts, line ~102
sectionHeader: {
  size: typography.size.base,      // Larger size
  weight: typography.weight.bold,  // Bold instead of medium
  color: `text-blue-900`,          // Custom color
  className: 'text-[13px] font-bold text-blue-900',
}
```

## Benefits of Token System

✅ **Unified** - Change once, applies everywhere
✅ **Consistent** - No hardcoded colors scattered around
✅ **Testable** - Easy A/B testing of color schemes
✅ **Maintainable** - Single source of truth
✅ **Type-safe** - TypeScript ensures valid usage
✅ **Scalable** - Add new colors without touching components

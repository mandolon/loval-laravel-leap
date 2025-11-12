# Project Panel Design System Usage Guide

This document explains how to use the unified design system for the Project Panel.

## Quick Start

```typescript
import theme, { colors, typography, componentText, presets } from './ProjectPanelTheme';
```

## Basic Usage Examples

### 1. Using Color Tokens

```tsx
// Before (hardcoded):
<div className="bg-slate-100 text-slate-800">

// After (with tokens):
<div className={`bg-${colors.bg.section} text-${colors.text.primary}`}>
```

### 2. Using Typography Tokens

```tsx
// Before (hardcoded):
<span className="text-[11px] font-medium text-slate-800">FILES</span>

// After (with tokens):
<span className={componentText.sectionHeader.className}>FILES</span>
```

### 3. Using Component Presets

```tsx
// Before (hardcoded):
<div className="sticky top-0 z-10 h-9 px-2.5 border-b border-slate-200 bg-[#fcfcfc] flex items-center gap-2">

// After (with preset):
<div className={presets.searchContainer.className}>
```

### 4. Using Individual Tokens

```tsx
// Mix and match tokens
<button className={`
  ${spacing.paddingX.sm}
  ${spacing.paddingY.sm}
  ${borders.radius.md}
  ${typography.size.sm}
  text-${colors.text.primary}
  hover:bg-${colors.bg.hover}
  ${effects.transition.colors}
`}>
  Click me
</button>
```

## Real-World Examples

### Section Header Component

```tsx
// Before:
<div className="flex items-center gap-1 py-[2px] px-1 select-none bg-slate-100 rounded-lg">
  <span className="text-[11px] font-medium text-slate-800">PROJECT FILES</span>
</div>

// After:
<div className={presets.sectionHeader.className}>
  <span className={componentText.sectionHeader.className}>PROJECT FILES</span>
</div>
```

### Search Input

```tsx
// Before:
<input
  placeholder="Search"
  className="w-full h-7 pl-6 pr-2 text-[11px] bg-white border border-slate-300 rounded-[6px] focus:outline-none"
/>

// After:
<input
  placeholder="Search"
  className={presets.searchInput.className}
/>
```

### Menu Item

```tsx
// Before:
<button 
  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[13px] ${
    active ? "bg-[#E7F0FF] text-slate-900" : "hover:bg-slate-100 text-slate-900"
  }`}
>

// After:
<button 
  className={`${presets.menuItem.base} ${
    active ? presets.menuItem.active : presets.menuItem.inactive
  }`}
>
```

### Context Menu

```tsx
// Before:
<div className="fixed z-50 w-40 rounded-md border border-slate-200 bg-white shadow-xl overflow-hidden">
  <button className="block w-full px-3 py-1.5 text-left text-[11px] text-slate-800 hover:bg-slate-100">
    Rename
  </button>
</div>

// After:
<div className={presets.contextMenu.className}>
  <button className={presets.contextMenuButton.className}>
    Rename
  </button>
</div>
```

## Theme Swapping

### Quick Theme Change

```typescript
// Switch to dark theme
import { applyTheme } from './ProjectPanelTheme';

const darkColors = applyTheme('dark');

// Use dark colors
<div className={`bg-${darkColors.bg.primary}`}>
```

### Custom Theme

```typescript
// Define your own theme
const customTheme = {
  ...colors,
  bg: {
    ...colors.bg,
    primary: '#f0f9ff', // Custom blue tint
    section: '#dbeafe',
  },
  text: {
    ...colors.text,
    primary: '#1e40af', // Custom blue text
  },
};

// Apply it
<div style={{ backgroundColor: customTheme.bg.primary }}>
```

## Customizing Typography

### Change All Section Headers

```typescript
// In ProjectPanelTheme.ts, modify:
sectionHeader: {
  size: typography.size.base,     // Change from sm to base
  weight: typography.weight.bold, // Change from medium to bold
  color: `text-blue-900`,         // Change color
  className: 'text-[13px] font-bold text-blue-900', // Update className
}
```

### Change All Font Sizes Globally

```typescript
// In ProjectPanelTheme.ts, modify:
size: {
  xs: 'text-[12px]',   // Increase from 10px
  sm: 'text-[13px]',   // Increase from 11px
  base: 'text-[15px]', // Increase from 13px
  md: 'text-[17px]',   // Increase from 15px
}
```

## Testing Different Styles

### Quick A/B Testing

```tsx
// Create test variants
const testStyles = {
  variant1: {
    bg: 'bg-slate-50',
    text: 'text-slate-900',
  },
  variant2: {
    bg: 'bg-blue-50',
    text: 'text-blue-900',
  },
};

// Toggle between them
const [variant, setVariant] = useState<'variant1' | 'variant2'>('variant1');
const style = testStyles[variant];

<div className={`${style.bg} ${style.text}`}>
  Test Content
</div>
```

## Icon Sizes

```tsx
import { sizes } from './ProjectPanelTheme';

// Apply consistent icon sizes
<Search className={sizes.icon.md} />        // 16px
<FolderClosed className={sizes.icon.sm} />  // 14px
<BookOpen className={sizes.icon.xs} />      // 12px
```

## Spacing Consistency

```tsx
import { spacing } from './ProjectPanelTheme';

// Consistent padding
<div className={spacing.paddingX.md}>       // px-2.5
<div className={spacing.paddingY.sm}>       // py-1.5
<div className={spacing.gap.xs}>            // gap-1
```

## Helper Functions

### Combine Multiple Classes

```tsx
import { combineClasses } from './ProjectPanelTheme';

const buttonClass = combineClasses(
  presets.contextMenuButton.className,
  'border-t',
  'border-slate-100'
);

<button className={buttonClass}>Delete</button>
```

## Migration Strategy

1. **Start with one component** - Convert ProjectPanel section headers first
2. **Use presets for complex components** - Context menus, inputs, etc.
3. **Use individual tokens for simple elements** - Text, spacing, colors
4. **Test theme variants** - Ensure tokens work across themes
5. **Update documentation** - Keep this guide current

## Benefits

- ✅ **Centralized styling** - All design decisions in one place
- ✅ **Easy theme swapping** - Change entire color scheme instantly
- ✅ **Type-safe** - TypeScript ensures token validity
- ✅ **Consistent** - No more hardcoded values scattered around
- ✅ **Maintainable** - Update once, apply everywhere
- ✅ **Testable** - Quick A/B testing of different styles
- ✅ **Scalable** - Add new tokens without touching components

## Future Enhancements

- [ ] Add runtime theme switching
- [ ] Create theme preview tool
- [ ] Export CSS variables for non-React usage
- [ ] Add animation presets
- [ ] Create component composition helpers

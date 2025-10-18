# Unified Design System

## Philosophy
A compact, consistent design system with minimal complexity. Two font sizes, predictable spacing, and colors derived from the sidebar aesthetic.

## Typography

### Font Sizes (Only 2)
```tsx
// Default text - use everywhere
text-base  // 14px / 1.25rem line-height

// Headings only
text-lg    // 16px / 1.5rem line-height
```

### Usage
```tsx
// All headings use the same size
<h1 className="text-lg font-semibold">Page Title</h1>
<h2 className="text-lg font-semibold">Section</h2>

// All body text uses base
<p className="text-base">Body text</p>
<button className="text-base">Button</button>
```

## Spacing (4px Base Unit)

### Scale
```tsx
gap-1  // 4px
gap-2  // 8px
gap-3  // 12px
gap-4  // 16px
gap-5  // 20px
gap-6  // 24px
gap-8  // 32px
gap-10 // 40px
gap-12 // 48px
```

### Common Patterns
```tsx
// Page wrapper
<div className="p-4 space-y-4 max-w-7xl mx-auto">

// Card spacing
<Card className="p-4">

// Grid gaps
<div className="grid grid-cols-3 gap-4">

// Button spacing
<Button className="px-4 py-2 gap-2">
```

## Colors (HSL Only)

### Semantic Colors
```tsx
// Primary actions
bg-primary text-primary-foreground

// Secondary/muted
bg-secondary text-secondary-foreground
bg-muted text-muted-foreground

// Status colors
bg-destructive text-destructive-foreground
bg-success text-success-foreground
bg-warning text-warning-foreground

// Sidebar (reference palette)
bg-sidebar text-sidebar-foreground
```

### Usage
```tsx
// Always use semantic tokens
<div className="bg-primary text-primary-foreground">
  Primary action
</div>

// NEVER use direct colors
<div className="bg-blue-500 text-white"> ❌ Wrong
```

## Components

### Page Structure
```tsx
// Standard page layout
<div className="p-4 space-y-4 max-w-7xl mx-auto">
  <div>
    <PageHeader title="Page Title" />
    <PageSubhead description="Description" actions={<Button />} />
  </div>
  
  {/* Content */}
</div>
```

### Cards
```tsx
<Card className="p-4">
  <CardHeader className="pb-3">
    <CardTitle className="text-lg">Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent className="space-y-3">
    {/* Content with consistent spacing */}
  </CardContent>
</Card>
```

### Buttons
```tsx
// Standard sizes
<Button size="sm">Small</Button>     // h-8 px-3
<Button>Default</Button>              // h-9 px-4
<Button size="lg">Large</Button>      // h-10 px-8

// With icons
<Button className="gap-2">
  <Icon className="h-4 w-4" />
  Label
</Button>
```

### Forms
```tsx
<div className="space-y-3">
  <Label>Label</Label>
  <Input className="h-9" />
  <p className="text-muted-foreground">Helper text</p>
</div>
```

## Border Radius
```tsx
rounded-sm  // 0.25rem (4px)
rounded-md  // 0.375rem (6px)
rounded-lg  // 0.5rem (8px)
```

## Radix Components

All components use Radix UI primitives:
- Dialog, Sheet, Popover, Dropdown
- Select, Checkbox, Radio, Switch
- Tabs, Accordion, Collapsible
- Toast, Alert Dialog
- Resizable Panels

### Always use Radix for:
- Accessible interactions
- Keyboard navigation
- Focus management
- ARIA attributes

## Rules

### DO
✅ Use only `text-base` and `text-lg`
✅ Use 4px spacing multiples (1-12)
✅ Use semantic color tokens
✅ Keep layouts compact (p-4, gap-4)
✅ Use Radix components for all interactions

### DON'T
❌ Create custom font sizes
❌ Use arbitrary spacing values
❌ Use direct color values
❌ Add excessive padding/margins
❌ Build custom accessible components

## Examples

### Dashboard Card
```tsx
<Card>
  <CardHeader className="flex flex-row items-center justify-between pb-2">
    <CardTitle className="text-lg font-semibold">
      Active Projects
    </CardTitle>
    <div className="p-2 rounded-lg bg-primary/10">
      <Icon className="h-4 w-4 text-primary" />
    </div>
  </CardHeader>
  <CardContent>
    <div className="text-lg font-semibold">24</div>
  </CardContent>
</Card>
```

### List Item
```tsx
<div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted">
  <Avatar className="h-8 w-8">
    <AvatarFallback>JD</AvatarFallback>
  </Avatar>
  <div className="flex-1 min-w-0">
    <p className="text-base font-medium truncate">John Doe</p>
    <p className="text-muted-foreground truncate">john@example.com</p>
  </div>
  <Button size="sm" variant="ghost">
    <MoreVertical className="h-4 w-4" />
  </Button>
</div>
```

### Form Dialog
```tsx
<Dialog>
  <DialogContent className="max-w-md">
    <DialogHeader>
      <DialogTitle className="text-lg">Create Project</DialogTitle>
      <DialogDescription>
        Add a new project to your workspace
      </DialogDescription>
    </DialogHeader>
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Project Name</Label>
        <Input className="h-9" />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea className="min-h-[80px]" />
      </div>
    </div>
    <DialogFooter className="gap-2">
      <Button variant="outline">Cancel</Button>
      <Button>Create</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## Migration Guide

### From old sizes:
```tsx
// Old → New
text-xs     → text-base
text-sm     → text-base
text-md     → text-base
text-xl     → text-lg
text-2xl    → text-lg
text-3xl    → text-lg
text-4xl    → text-lg

// Old → New
p-6    → p-4
p-8    → p-6
gap-6  → gap-4
space-y-6 → space-y-4
mb-4   → mb-3
```

## Single Source of Truth

All design tokens live in:
1. `tailwind.config.ts` - Spacing, font sizes, colors
2. `src/index.css` - CSS variables for colors

Never define styles outside these files. Always use Tailwind classes that reference the design system.

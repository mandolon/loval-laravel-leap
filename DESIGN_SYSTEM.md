# Unified Design System

## Philosophy
A compact, consistent design system with minimal complexity. Two font sizes, predictable spacing, and colors derived from the sidebar aesthetic.

## Typography

### Font Sizes (Only 2)
```tsx
// Default text - use everywhere
text-base  // 12px / 1rem line-height

// Headings only
text-lg    // 14px / 1.25rem line-height
```

### Usage
```tsx
// All headings use the same size
<h1 className="text-lg font-semibold">Page Title</h1>
<h2 className="text-lg font-semibold">Section</h2>

// All body text, buttons, inputs, labels use base
<p className="text-base">Body text</p>
<button className="text-base">Button</button>
<input className="text-base" />
<label className="text-base">Label</label>
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
// Page wrapper - compact
<div className="p-4 space-y-4 max-w-7xl mx-auto">

// Card spacing - compact
<Card className="p-4">

// Grid gaps - compact
<div className="grid grid-cols-3 gap-4">

// Button spacing
<Button className="px-4 py-2 gap-2">

// Form fields
<div className="space-y-3">
  <Label>Label</Label>
  <Input className="h-9" />
</div>
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
// Standard page layout - Header with NO description
<div className="p-4 space-y-4 max-w-7xl mx-auto">
  {/* Header only - no description */}
  <div>
    <PageHeader title="Page Title" />
  </div>
  
  {/* OR Header with actions */}
  <div className="flex items-center justify-between">
    <PageHeader title="Page Title" />
    <Button>Action</Button>
  </div>
  
  {/* Content */}
</div>
```

### Page Headers
```tsx
// Simple header
<PageHeader title="Dashboard" />

// Header with actions (use flex wrapper)
<div className="flex items-center justify-between">
  <PageHeader title="Profile Settings" />
  <Button variant="outline">Sign Out</Button>
</div>

// NEVER use PageSubhead - descriptions removed from all headers
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
// Standard sizes (all use text-base)
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
  <Label className="text-base">Label</Label>
  <Input className="h-9 text-base" />
  <p className="text-base text-muted-foreground">Helper text</p>
</div>

<Select>
  <SelectTrigger className="h-9 text-base">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="1" className="text-base">Option</SelectItem>
  </SelectContent>
</Select>

<Textarea className="text-base" />
```

### Sidebar Navigation
```tsx
// Sidebar container (200px)
<aside className="w-[200px] bg-card border-r">
  
// Section headers (uppercase labels)
<span className="text-base font-semibold text-muted-foreground uppercase tracking-wide">
  Projects
</span>

// Navigation items with icons
<button className="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium">
  <Folder className="h-4 w-4" />
  <span>Project Name</span>
</button>

// Active state
className="bg-accent text-accent-foreground font-medium"

// Hover state  
className="hover:bg-accent/50"

// Compact filters (no section title)
<button className="flex items-center gap-2 px-3 py-2">
  <ChevronRight className="h-3 w-3" />
  <span>Filter Name</span>
</button>
```

### Tables
```tsx
<Table className="text-base">
  <TableHeader>
    <TableRow>
      <TableHead className="h-10 px-3">Header</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell className="p-3">Cell</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Badges
```tsx
<Badge className="text-base">Default</Badge>
<Badge variant="secondary" className="text-base">Secondary</Badge>
<Badge variant="outline" className="text-base">Outline</Badge>
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
✅ Use only `text-base` (12px) and `text-lg` (14px)
✅ Use 4px spacing multiples (1-12)
✅ Use semantic color tokens (never direct colors)
✅ Keep layouts compact (p-4, gap-3, gap-4)
✅ Use Radix components for all interactions
✅ All form elements use h-9 for consistency
✅ All table cells use p-3 for consistency
✅ All cards use p-4 for consistency

### DON'T
❌ Create custom font sizes (text-sm, text-xs, text-xl, etc.)
❌ Use arbitrary spacing values
❌ Use direct color values (bg-blue-500, text-white)
❌ Add excessive padding/margins (p-6, p-8)
❌ Build custom accessible components (use Radix)
❌ Mix font sizes within components

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
// Font sizes → New
text-xs     → text-base (12px)
text-sm     → text-base (12px)
text-md     → text-base (12px)
text-xl     → text-lg (14px)
text-2xl    → text-lg (14px)
text-3xl    → text-lg (14px)
text-4xl    → text-lg (14px)

// Spacing → New (more compact)
p-6    → p-4
p-8    → p-4
gap-6  → gap-4
space-y-6 → space-y-4
mb-4   → mb-3
px-4   → px-3 (for table cells)

// Heights → New (more compact)
h-10   → h-9 (inputs, selects, buttons)
h-12   → h-10 (table headers)
h-11   → h-10 (large buttons)
```

## Single Source of Truth

All design tokens live in:
1. `tailwind.config.ts` - Spacing (4px base), font sizes (12px/14px), colors (HSL)
2. `src/index.css` - CSS variables for colors (all HSL)

### Key Values
```tsx
// Typography
text-base: 12px / 1rem line-height
text-lg: 14px / 1.25rem line-height

// Spacing
1 unit = 4px
Available: 1, 2, 3, 4, 5, 6, 8, 10, 12

// Component Heights
h-8: Compact buttons
h-9: Standard (buttons, inputs, selects)
h-10: Large buttons, table headers

// Component Padding
p-3: Table cells
p-4: Cards, dialogs, most containers
px-3: Inputs, selects, buttons
px-4: Default buttons
px-8: Large buttons
```

Never define styles outside these files. Always use Tailwind classes that reference the design system.

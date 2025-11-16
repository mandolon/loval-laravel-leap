# 3D Viewer Refactoring

This directory contains the refactored components for the Team3DModelViewer.

## Structure

```
3d-viewer/
├── ViewerToolbar.tsx                    # Toolbar UI component
├── Team3DModelViewer.refactored.tsx    # Complete refactored main component
├── hooks/
│   ├── useViewerInitialization.ts      # Viewer setup and initialization
│   ├── useModelLoading.ts              # Model loading logic
│   ├── useDimensionInteraction.ts      # Dimension selection/hover
│   ├── useMeasurementHover.ts         # Hover sphere for measurements
│   ├── useViewerKeyboard.ts            # Keyboard shortcuts
│   ├── useDimensionTool.ts             # Dimension tool activation
│   └── useInspectMode.ts               # Inspect mode (hover highlight)
└── utils/
    └── dimensionUtils.ts               # Dimension color property helpers
```

## Refactoring Progress

### ✅ Completed
- **ViewerToolbar component** - Extracted toolbar UI into its own component
- **useViewerInitialization hook** - Viewer setup and initialization logic
- **useModelLoading hook** - Model loading, edge creation, and error handling
- **useDimensionInteraction hook** - Dimension selection and hover effects
- **useMeasurementHover hook** - Hover sphere for first measurement point
- **useViewerKeyboard hook** - Keyboard shortcuts (Escape, E, P, D, Backspace/Delete)
- **useDimensionTool hook** - Dimension tool activation/deactivation
- **useInspectMode hook** - Inspect mode (hover to highlight IFC items)
- **dimensionUtils helper** - Shared dimension color property helpers
- **Refactored main component** - Complete example showing the new structure

## How to Use

### Option 1: Incremental Migration (Recommended)
1. Keep the original `Team3DModelViewer.tsx` as-is
2. Gradually extract remaining hooks as needed
3. Test each extraction before moving to the next

### Option 2: Full Migration
1. Back up the original `Team3DModelViewer.tsx`
2. Copy `Team3DModelViewer.refactored.tsx` to `Team3DModelViewer.tsx`
3. Add the remaining hooks (dimension interaction, hover, keyboard)
4. Test thoroughly

## Benefits

1. **Separation of Concerns**: Each hook/component has a single responsibility
2. **Reusability**: Hooks can be reused in other viewers
3. **Testability**: Smaller units are easier to test
4. **Maintainability**: Easier to find and fix bugs
5. **Readability**: Main component is much cleaner (reduced from ~1365 lines to ~150 lines)

## Migration Guide

The refactoring is complete! To migrate:

1. **Back up the original**: Copy `Team3DModelViewer.tsx` to `Team3DModelViewer.original.tsx`
2. **Replace the file**: Copy `Team3DModelViewer.refactored.tsx` to `Team3DModelViewer.tsx`
3. **Update imports**: The refactored version uses relative imports from the `3d-viewer` directory
4. **Test thoroughly**: Verify all features work:
   - Model loading
   - Measurement tools
   - Dimension selection/hover
   - Keyboard shortcuts
   - Clipping planes
   - Inspect mode

## Benefits Achieved

- **Reduced complexity**: Main component from ~1365 lines to ~200 lines
- **Better organization**: Each hook has a single, clear responsibility
- **Easier testing**: Hooks can be tested independently
- **Reusability**: Hooks can be used in other viewers
- **Maintainability**: Much easier to find and fix bugs


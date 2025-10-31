# Working App

## The Custom Multipage Excalidraw App

**The working app is located in:** `excalidraw-multipage/`

This is the custom Excalidraw application with:
- Multi-page support (multiple drawings per workspace)
- Custom properties panel on the left
- Pages navigator with thumbnails on the right  
- Collapsible side panels
- Custom UI styling
- "930 Echo Summit" branding

## ⚠️ TO RUN THE APP (START THIS ONE)

```bash
yarn --cwd ./excalidraw-multipage dev
```

This starts the development server at **http://localhost:5173/**

**Open http://localhost:5173/ in your browser to use the custom multipage app.**

## NOT the Default App

Do NOT use `excalidraw-app/` (the default Excalidraw app). That's just the vanilla version without customizations.

## Key Files

- `excalidraw-multipage/src/ExcalidrawMultiPageWrapper.tsx` - Main wrapper component
- `excalidraw-multipage/src/App.tsx` - App entry point
- `excalidraw-multipage/src/index.css` - Styles


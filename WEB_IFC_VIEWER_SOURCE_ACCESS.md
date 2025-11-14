# How to Access web-ifc-viewer Source Code

## 1. GitHub Repository (Recommended)

The official source code is available on GitHub:
- **Repository**: https://github.com/ThatOpen/web-ifc-viewer
- **Version 1.0.218**: Check the releases or tags for the specific version you're using

### Quick Access:
```bash
# Clone the repository
git clone https://github.com/ThatOpen/web-ifc-viewer.git
cd web-ifc-viewer

# Checkout your version
git checkout v1.0.218  # or the version you need
```

## 2. Local node_modules (If Installed)

If the package is installed in your project:

```bash
# Navigate to the package
cd node_modules/web-ifc-viewer

# View the structure
ls  # or dir on Windows
```

**Note**: The source code in `node_modules` is typically the compiled/bundled version, not the original TypeScript source.

## 3. npm Package Info

View package information:
```bash
npm view web-ifc-viewer
npm view web-ifc-viewer repository
```

## 4. Key Files to Look For

When examining the source, look for:
- `src/` or `lib/` - Source TypeScript files
- `dist/` or `build/` - Compiled JavaScript
- `index.ts` or `index.js` - Main entry point
- `IfcViewerAPI.ts` - The main API class you're using

## 5. Related Repositories

The IFC.js ecosystem includes:
- **web-ifc**: https://github.com/IFCjs/web-ifc (Low-level IFC parsing)
- **web-ifc-three**: https://github.com/IFCjs/web-ifc-three (Three.js geometry generation)
- **Components** (new approach): https://github.com/ThatOpen/components

## 6. Debugging Tips

To understand how the viewer works:

1. **Check the TypeScript definitions**:
   ```bash
   # In node_modules/web-ifc-viewer
   cat index.d.ts  # or open in editor
   ```

2. **Use browser DevTools**:
   - Set breakpoints in the bundled code
   - Use source maps if available
   - Inspect the `IfcViewerAPI` instance in console

3. **Read the documentation**:
   - GitHub README
   - Example projects in the repository
   - API documentation

## 7. Finding Edge-Related Code

To find how edges are handled in the source:
```bash
# In the cloned repository
grep -r "edges" src/
grep -r "EdgesGeometry" src/
grep -r "LineSegments" src/
```

## Important Note

⚠️ **The library has been deprecated** in favor of the new "Components" approach. Consider migrating to `@thatopen/components` for future development.


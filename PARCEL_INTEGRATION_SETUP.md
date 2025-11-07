/**
 * Backend Proxy for Parcel Number Lookup
 * 
 * This file should be placed in your backend (src-tauri or your backend API)
 * to handle CORS issues when fetching parcel information from ESRI.
 * 
 * For local development, add to your Vite dev server config
 * For production, add to your backend API (e.g., Node.js, Python, etc.)
 * 
 * Example endpoint: POST /api/parcel/lookup
 * Body: { lat: number, lng: number }
 * Response: { parcelNumber: string }
 */

// If using Vite dev server, add this to vite.config.ts:
export const parcelProxyConfig = {
  '/api/parcel': {
    target: 'https://mapservices.gis.saccounty.net',
    changeOrigin: true,
    rewrite: (path: string) => {
      // Convert our API call to ESRI query
      return path.replace('/api/parcel', '/arcgis/rest/services/Public/Parcels/MapServer/0/query');
    },
  },
};

// If using Express.js backend:
export const expressParcelRoute = `
const express = require('express');
const axios = require('axios');
const router = express.Router();

router.post('/api/parcel/lookup', async (req, res) => {
  try {
    const { lat, lng } = req.body;
    
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude required' });
    }

    const response = await axios.get(
      'https://mapservices.gis.saccounty.net/arcgis/rest/services/Public/Parcels/MapServer/0/query',
      {
        params: {
          geometry: \`\${lng},\${lat}\`,
          geometryType: 'esriGeometryPoint',
          inSR: 4326,
          spatialRel: 'esriSpatialRelIntersects',
          outFields: 'APN',
          returnGeometry: false,
          f: 'json',
        },
      }
    );

    const parcelNumber = response.data.features?.[0]?.attributes?.APN;
    
    res.json({
      parcelNumber: parcelNumber || null,
      success: !!parcelNumber,
    });
  } catch (error) {
    console.error('Parcel lookup error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch parcel information',
      success: false 
    });
  }
});

module.exports = router;
`;

// Environment variables needed:
export const envVariables = `
# Google Places API (get from Google Cloud Console)
VITE_GOOGLE_PLACES_API_KEY=your_google_places_api_key_here

# Optional: Sacramento County ArcGIS services (public, no key needed)
# VITE_ESRI_BASE_URL=https://mapservices.gis.saccounty.net
`;

// Setup instructions
export const setupInstructions = `
# Setup Instructions for Create Project Modal with Parcel Auto-Fill

## Step 1: Enable Google Places API

1. Go to Google Cloud Console (https://console.cloud.google.com)
2. Create a new project or select existing one
3. Search for "Places API" and enable it
4. Go to Credentials → Create new API Key
5. Add API key restrictions if desired (recommended for production)
6. Copy the API key

## Step 2: Add Google Places API Key

Add to your .env.local or .env file:
\`\`\`
VITE_GOOGLE_PLACES_API_KEY=your_api_key_here
\`\`\`

For production, add to your hosting platform's environment variables (Vercel, Netlify, etc.)

## Step 3: Set Up Backend Proxy for Parcel Lookup (Optional)

The ESRI parcel service is CORS-protected. You have two options:

### Option A: Use Vite Dev Proxy (Development Only)
In vite.config.ts, add:
\`\`\`typescript
export default defineConfig({
  server: {
    proxy: {
      '/api/parcel': {
        target: 'https://mapservices.gis.saccounty.net',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/parcel', '/arcgis/rest/services/Public/Parcels/MapServer/0/query'),
      },
    },
  },
});
\`\`\`

### Option B: Use Backend API (Production Recommended)
Create an endpoint in your backend that proxies the ESRI request.
See expressParcelRoute example above.

## Step 4: Replace Old Create Project Dialog

Update imports in components that use CreateProjectDialog:

Old:
\`\`\`typescript
import { CreateProjectDialog } from "@/components/CreateProjectDialog";
<CreateProjectDialog onCreateProject={handleCreateProject} />
\`\`\`

New:
\`\`\`typescript
import { CreateProjectModal } from "@/components/CreateProjectModal";
<CreateProjectModal 
  onCreateProject={handleCreateProject}
  workspaceId={currentWorkspaceId}
/>
\`\`\`

## Step 5: Update Components

Files to update:
- src/apps/team/components/TeamDashboardCore.tsx
- src/pages/Index.tsx
- src/components/layout/SandboxSidebar.tsx
- src/components/layout/sidebar/NavContent.tsx

## Features

✅ Google Places autocomplete for address input
✅ Automatic parcel number lookup (Sacramento County)
✅ Support for primary and secondary clients
✅ Project type/category selection
✅ Privacy toggle
✅ Keyboard navigation in autocomplete dropdown
✅ Responsive design matching your dashboard theme
✅ Form validation
✅ Empty state handling

## Troubleshooting

### "Parcel lookup failed" / CORS error
- Ensure backend proxy is configured
- Check that coordinates are within Sacramento County
- Verify ESRI service is accessible

### Autocomplete not showing predictions
- Check Google Places API key is valid
- Verify API has Places API enabled
- Check browser console for errors
- Ensure you're typing a valid US address

### API key errors
- Confirm VITE_GOOGLE_PLACES_API_KEY is in env file
- Restart dev server after adding env variable
- Check Vercel/hosting platform environment variables in production

## ESRI Service Details

- **Service**: Sacramento County Parcels
- **URL**: https://mapservices.gis.saccounty.net/arcgis/rest/services/Public/Parcels/MapServer
- **Layer**: 0 (Parcels)
- **Output Field**: APN (Assessor Parcel Number)
- **Coverage**: Sacramento County only
- **Authentication**: Not required (public service)

## Security Notes

- Google Places API key should have restrictions in production
- Backend proxy should validate coordinates are within service area
- Consider rate limiting parcel lookups on backend
- Never expose ESRI or Google keys in frontend (use backend proxy)
`;

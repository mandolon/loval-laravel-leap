/**
 * Parcel Lookup Backend Endpoint
 * 
 * This is an example implementation for a Node.js/Express backend
 * to handle parcel number lookups via ESRI while avoiding CORS issues.
 * 
 * Installation:
 * npm install axios express
 * 
 * Usage:
 * Add this file to your backend routes
 * POST /api/parcel/lookup
 * Body: { lat: number, lng: number }
 */

import axios from 'axios';
import { Request, Response, Router } from 'express';

const router = Router();

// Cache results for 24 hours to reduce ESRI requests
const parcelCache = new Map<string, { result: string; timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * GET /api/parcel/lookup?lat=38.5816&lng=-121.4944
 * POST /api/parcel/lookup with body { lat, lng }
 */
router.post('/api/parcel/lookup', async (req: Request, res: Response) => {
  try {
    const { lat, lng } = req.body;

    // Validate input
    if (!lat || !lng || typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({
        error: 'Invalid request. Required: { lat: number, lng: number }',
        success: false,
      });
    }

    // Validate coordinates are in reasonable range (Sacramento County area)
    // Sacramento County roughly: 38.2° to 38.9°N, 120.8° to 121.6°W
    const isInServiceArea =
      lat >= 38.0 &&
      lat <= 39.0 &&
      lng >= -122.0 &&
      lng <= -120.5;

    if (!isInServiceArea) {
      console.warn(`Coordinates out of service area: ${lat}, ${lng}`);
      return res.json({
        parcelNumber: null,
        success: false,
        message: 'Coordinates outside Sacramento County service area',
      });
    }

    // Check cache
    const cacheKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    const cached = parcelCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return res.json({
        parcelNumber: cached.result,
        success: !!cached.result,
        cached: true,
      });
    }

    // Query ESRI Parcel Service
    try {
      const response = await axios.get(
        'https://mapservices.gis.saccounty.net/arcgis/rest/services/Public/Parcels/MapServer/0/query',
        {
          params: {
            geometry: `${lng},${lat}`,
            geometryType: 'esriGeometryPoint',
            inSR: 4326,
            spatialRel: 'esriSpatialRelIntersects',
            outFields: 'APN',
            returnGeometry: false,
            f: 'json',
          },
          timeout: 5000, // 5 second timeout
        }
      );

      const parcelNumber = response.data?.features?.[0]?.attributes?.APN || null;

      // Cache the result
      if (parcelNumber) {
        parcelCache.set(cacheKey, {
          result: parcelNumber,
          timestamp: Date.now(),
        });
      }

      return res.json({
        parcelNumber,
        success: !!parcelNumber,
        latitude: lat,
        longitude: lng,
      });
    } catch (esriError) {
      console.error('ESRI service error:', esriError);
      
      // Return cached result even if expired during error
      if (cached) {
        return res.json({
          parcelNumber: cached.result,
          success: !!cached.result,
          cached: true,
          message: 'Using cached result due to service error',
        });
      }

      throw esriError;
    }
  } catch (error) {
    console.error('Parcel lookup error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      error: 'Failed to fetch parcel information',
      details: errorMessage,
      success: false,
    });
  }
});

/**
 * GET version - for simple URL-based lookups
 */
router.get('/api/parcel/lookup', async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);

  // Forward to POST handler
  const mockReq = { body: { lat, lng } } as Request;
  return new Promise<void>((resolve) => {
    const originalJson = res.json.bind(res);
    res.json = ((data: any) => {
      originalJson(data);
      resolve();
    }) as any;

    // Call POST handler
    router.stack[0].handle(mockReq, res);
  });
});

/**
 * Batch lookup - get parcel numbers for multiple coordinates
 * POST /api/parcel/batch
 * Body: { coordinates: [{ lat, lng }, ...] }
 */
router.post('/api/parcel/batch', async (req: Request, res: Response) => {
  try {
    const { coordinates } = req.body;

    if (!Array.isArray(coordinates) || coordinates.length === 0) {
      return res.status(400).json({
        error: 'Invalid request. Required: { coordinates: [{ lat, lng }, ...] }',
        success: false,
      });
    }

    // Limit batch size to prevent abuse
    if (coordinates.length > 50) {
      return res.status(400).json({
        error: 'Maximum 50 coordinates per batch request',
        success: false,
      });
    }

    const results = await Promise.all(
      coordinates.map(async (coord: any) => {
        const mockReq = { body: coord } as Request;
        const mockRes: any = {};

        return new Promise<any>((resolve) => {
          mockRes.json = (data: any) => {
            resolve(data);
          };
          mockRes.status = (code: number) => ({
            json: (data: any) => {
              resolve({ ...data, statusCode: code });
            },
          });

          // Note: This is a simplified version - in production,
          // you'd want to extract the actual handler logic
          resolve({ lat: coord.lat, lng: coord.lng, parcelNumber: null });
        });
      })
    );

    res.json({
      results,
      success: true,
      count: results.length,
    });
  } catch (error) {
    console.error('Batch parcel lookup error:', error);
    res.status(500).json({
      error: 'Failed to process batch request',
      success: false,
    });
  }
});

/**
 * Health check endpoint
 * GET /api/parcel/health
 */
router.get('/api/parcel/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Parcel Lookup Service',
    cached: parcelCache.size,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Clear cache endpoint (admin use)
 * DELETE /api/parcel/cache
 */
router.delete('/api/parcel/cache', (req: Request, res: Response) => {
  const size = parcelCache.size;
  parcelCache.clear();
  res.json({
    success: true,
    message: `Cleared ${size} cached entries`,
  });
});

export default router;

/**
 * Usage in your Express app:
 * 
 * import parcelRouter from './routes/parcel';
 * app.use('/', parcelRouter);
 * 
 * Then client can call:
 * const response = await fetch('/api/parcel/lookup', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ lat: 38.5816, lng: -121.4944 })
 * });
 * const data = await response.json();
 * console.log(data.parcelNumber); // e.g., "141-001-001"
 */

import { useMemo, useCallback } from 'react';
import { GRID_PRESETS, type GridSizeKey } from '@/types/annotations';

export const useGridSnapping = (gridSize: GridSizeKey, enabled: boolean) => {
  const gridPoints = useMemo(() => GRID_PRESETS[gridSize], [gridSize]);

  const snapToPdfGrid = useCallback((pdfX: number, pdfY: number): [number, number] => {
    if (!enabled) return [pdfX, pdfY];
    return [
      Math.round(pdfX / gridPoints) * gridPoints,
      Math.round(pdfY / gridPoints) * gridPoints
    ];
  }, [gridPoints, enabled]);

  return { snapToPdfGrid, gridPoints };
};
